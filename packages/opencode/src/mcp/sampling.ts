import type { CreateMessageRequestParams, CreateMessageResult } from "@modelcontextprotocol/sdk/types.js"
import { Config } from "@/config/config"
import { Log } from "@/util/log"
import { Bus } from "@/bus"
import { BusEvent } from "@/bus/bus-event"
import { TuiEvent } from "@/cli/cmd/tui/event"
import { Session } from "@/session"
import { SessionPrompt } from "@/session/prompt"
import z from "zod/v4"

export namespace Sampling {
  const log = Log.create({ service: "mcp.sampling" })

  export const ApprovalRequested = BusEvent.define(
    "mcp.sampling.approval.requested",
    z.object({
      serverName: z.string(),
      requestId: z.string(),
      messages: z.array(z.any()),
      maxTokens: z.number().optional(),
    }),
  )

  export const ApprovalResponse = BusEvent.define(
    "mcp.sampling.approval.response",
    z.object({
      requestId: z.string(),
      approved: z.boolean(),
    }),
  )

  const pendingApprovals = new Map<
    string,
    {
      resolve: (approved: boolean) => void
      serverName: string
    }
  >()

  const serverSessions = new Map<string, string>()

  let currentTuiSessionID: string | null = null

  export function setCurrentTuiSession(sessionID: string | null) {
    currentTuiSessionID = sessionID
  }

  export function getCurrentTuiSession(): string | null {
    return currentTuiSessionID
  }

  let initialized = false

  function ensureInitialized() {
    if (initialized) return
    initialized = true

    Bus.subscribe(ApprovalResponse, async (event) => {
      const pending = pendingApprovals.get(event.properties.requestId)
      if (pending) {
        pending.resolve(event.properties.approved)
        pendingApprovals.delete(event.properties.requestId)
      }
    })
  }

  async function checkTrustLevel(
    serverName: string,
    params: CreateMessageRequestParams,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const cfg = await Config.get()
    const samplingConfig = cfg.sampling?.[serverName] ?? cfg.sampling?.["*"]

    if (!samplingConfig) {
      return { allowed: false, reason: "No sampling configuration for this server" }
    }

    const mode = samplingConfig.mode ?? "prompt"

    if (mode === "deny") {
      return { allowed: false, reason: "Sampling denied by configuration" }
    }

    if (samplingConfig.maxTokens && params.maxTokens && params.maxTokens > samplingConfig.maxTokens) {
      return { allowed: false, reason: `Requested tokens (${params.maxTokens}) exceeds limit (${samplingConfig.maxTokens})` }
    }

    if (mode === "auto") {
      return { allowed: true }
    }

    const requestId = crypto.randomUUID()

    const approvalPromise = new Promise<boolean>((resolve) => {
      pendingApprovals.set(requestId, { resolve, serverName })

      setTimeout(() => {
        if (pendingApprovals.has(requestId)) {
          pendingApprovals.delete(requestId)
          resolve(false)
        }
      }, 60_000)
    })

    await Bus.publish(TuiEvent.SamplingApprovalRequested, {
      serverName,
      requestId,
      messages: params.messages,
      maxTokens: params.maxTokens,
    })

    const approved = await approvalPromise
    return { allowed: approved, reason: approved ? undefined : "User denied sampling request" }
  }

  export async function handleCreateMessage(
    serverName: string,
    params: CreateMessageRequestParams,
  ): Promise<CreateMessageResult> {
    ensureInitialized()
    log.info("handling sampling request", { serverName, maxTokens: params.maxTokens })

    const trustCheck = await checkTrustLevel(serverName, params)
    if (!trustCheck.allowed) {
      log.warn("sampling request denied", { serverName, reason: trustCheck.reason })
      throw new Error(`Sampling request denied: ${trustCheck.reason}`)
    }

    const feedbackText = params.messages
      .map((msg) => {
        const contentBlocks = Array.isArray(msg.content) ? msg.content : [msg.content]
        return contentBlocks
          .map((part) => {
            if (part.type === "text") return part.text
            if (part.type === "image") return `[Image: ${part.mimeType}]`
            return ""
          })
          .join("")
      })
      .join("\n\n")

    const systemContext = params.systemPrompt ? `Context: ${params.systemPrompt}\n\n` : ""
    const fullPrompt = systemContext + feedbackText

    let session: Awaited<ReturnType<typeof Session.create>>
    let needsNavigation = true

    const currentTuiSessionID = getCurrentTuiSession()
    if (currentTuiSessionID) {
      const current = await Session.get(currentTuiSessionID).catch(() => null)
      if (current) {
        session = current
        needsNavigation = false
        log.info("using current TUI session", { serverName, sessionID: session.id })
      }
    }

    if (!session!) {
      const existingSessionID = serverSessions.get(serverName)
      if (existingSessionID) {
        const existing = await Session.get(existingSessionID).catch(() => null)
        if (existing) {
          session = existing
          log.info("reusing cached session", { serverName, sessionID: session.id })
        }
      }
    }

    if (!session!) {
      session = await Session.create({ title: `UI Feedback: ${serverName}` })
      serverSessions.set(serverName, session.id)
      log.info("created new session", { serverName, sessionID: session.id })
    }

    if (needsNavigation) {
      await Bus.publish(TuiEvent.SessionSelect, {
        sessionID: session.id,
      })
    }

    SessionPrompt.prompt({
      sessionID: session.id,
      parts: [{ type: "text", text: fullPrompt }],
    })

    log.info("sampling redirected to session", { serverName, sessionID: session.id })

    return {
      role: "assistant",
      content: {
        type: "text",
        text: `Feedback received. Continuing conversation in OpenCode session: ${session.id}`,
      },
      model: "opencode-session-redirect",
      stopReason: "endTurn",
    }
  }
}
