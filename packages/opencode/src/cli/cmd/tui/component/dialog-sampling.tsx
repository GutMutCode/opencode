import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog, type DialogContext } from "../ui/dialog"
import { createStore } from "solid-js/store"
import { For, Show, onMount, onCleanup } from "solid-js"
import { useKeyboard } from "@opentui/solid"
import { Locale } from "@/util/locale"
import { useSDK } from "../context/sdk"
import { TuiEvent } from "../event"
import { appendFileSync } from "fs"

function debugLog(msg: string) {
  appendFileSync("/tmp/sampling-debug.log", `${new Date().toISOString()} ${msg}\n`)
}

export type DialogSamplingProps = {
  serverName: string
  requestId: string
  messages: Array<{ role: string; content: unknown }>
  maxTokens?: number
  onConfirm?: () => void
  onCancel?: () => void
}

export function DialogSampling(props: DialogSamplingProps) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [store, setStore] = createStore({
    active: "deny" as "allow" | "deny",
  })

  useKeyboard((evt) => {
    if (evt.name === "return") {
      if (store.active === "allow") props.onConfirm?.()
      if (store.active === "deny") props.onCancel?.()
      dialog.clear()
    }

    if (evt.name === "left" || evt.name === "right") {
      setStore("active", store.active === "allow" ? "deny" : "allow")
    }
  })

  const messagePreview = () => {
    const lastMsg = props.messages[props.messages.length - 1]
    if (!lastMsg) return "(empty)"

    const content = typeof lastMsg.content === "string" 
      ? lastMsg.content 
      : Array.isArray(lastMsg.content)
        ? lastMsg.content.map((c: { type: string; text?: string }) => c.type === "text" ? c.text : `[${c.type}]`).join("")
        : JSON.stringify(lastMsg.content)

    return content.length > 200 ? content.slice(0, 200) + "..." : content
  }

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.warning}>
          MCP Sampling Request
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.text}>
          Server <b>{props.serverName}</b> is requesting an LLM completion.
        </text>
        <Show when={props.maxTokens}>
          <text fg={theme.textMuted}>Max tokens: {props.maxTokens}</text>
        </Show>
        <text fg={theme.textMuted}>Messages: {props.messages.length}</text>
      </box>
      <box paddingBottom={1} maxHeight={5}>
        <text fg={theme.textMuted} wrapMode="word">
          Last message: {messagePreview()}
        </text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <For each={["deny", "allow"] as const}>
          {(key) => (
            <box
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={key === store.active ? (key === "allow" ? theme.success : theme.error) : undefined}
              onMouseUp={() => {
                if (key === "allow") props.onConfirm?.()
                if (key === "deny") props.onCancel?.()
                dialog.clear()
              }}
            >
              <text fg={key === store.active ? theme.selectedListItemText : theme.textMuted}>
                {Locale.titlecase(key)}
              </text>
            </box>
          )}
        </For>
      </box>
    </box>
  )
}

DialogSampling.show = (
  dialog: DialogContext,
  serverName: string,
  requestId: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens?: number,
) => {
  return new Promise<boolean>((resolve) => {
    dialog.replace(
      () => (
        <DialogSampling
          serverName={serverName}
          requestId={requestId}
          messages={messages}
          maxTokens={maxTokens}
          onConfirm={() => resolve(true)}
          onCancel={() => resolve(false)}
        />
      ),
      () => resolve(false),
    )
  })
}

export function useSamplingApprovalHandler() {
  const dialog = useDialog()
  const sdk = useSDK()

  debugLog("useSamplingApprovalHandler called")

  onMount(() => {
    debugLog("onMount - subscribing via sdk.event.on")
    
    const unsub = sdk.event.on(TuiEvent.SamplingApprovalRequested.type as any, async (event: any) => {
      debugLog(`*** APPROVAL EVENT RECEIVED *** serverName=${event.properties.serverName}`)
      const { serverName, requestId, messages, maxTokens } = event.properties as {
        serverName: string
        requestId: string
        messages: any[]
        maxTokens?: number
      }
      
      debugLog("Showing dialog...")
      const approved = await DialogSampling.show(
        dialog,
        serverName,
        requestId,
        messages,
        maxTokens,
      )
      debugLog(`Dialog result: ${approved}`)
      debugLog(`Sending approval response via API to ${sdk.url}...`)
      try {
        const response = await sdk.fetch(new URL("/sampling/respond", sdk.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, approved }),
        })
        debugLog(`Response status: ${response.status}`)
      } catch (e) {
        debugLog(`Failed to send response: ${e instanceof Error ? e.message : String(e)}`)
      }
      debugLog("Response sent")
    })
    debugLog("Subscribed successfully via SDK")
    
    onCleanup(() => unsub())
  })
}
