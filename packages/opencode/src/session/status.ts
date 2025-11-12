import { Bus } from "@/bus"
import { Instance } from "@/project/instance"
import z from "zod"

export namespace SessionStatus {
  export const Info = z
    .union([
      z.object({
        type: z.literal("idle"),
      }),
      z.object({
        type: z.literal("retry"),
      }),
      z.object({
        type: z.literal("busy"),
      }),
    ])
    .meta({
      ref: "SessionStatus",
    })
  export type Info = z.infer<typeof Info>

  export const Event = {
    Updated: Bus.event(
      "session.status.updated",
      z.object({
        sessionID: z.string(),
        status: Info,
      }),
    ),
  }

  export const state = Instance.state(() => {
    const status: Record<
      string,
      {
        controller: AbortController
        status: Info
      }
    > = {}
    return status
  })

  export function start(sessionID: string) {
    const s = state()
    if (s[sessionID]) return
    const controller = new AbortController()
    s[sessionID] = {
      controller,
      status: {
        type: "busy",
      },
    }
    Bus.publish(Event.Updated, { sessionID, status: s[sessionID].status })
    return controller.signal
  }

  export function end(sessionID: string) {
    const s = state()
    if (!s[sessionID]) return false
    s[sessionID].controller.abort()
    delete s[sessionID]
    Bus.publish(Event.Updated, { sessionID, status: { type: "idle" } })
    return true
  }

  export function get(sessionID: string) {
    const s = state()
    const match = s[sessionID]
    if (!match) return { type: "idle" }
    return match.status
  }
}
