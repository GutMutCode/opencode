import { Installation } from "@/installation"
import { TextAttributes } from "@opentui/core"
import { Prompt } from "@tui/component/prompt"
import { createResource, For, Match, Show, Suspense, Switch, type ParentProps } from "solid-js"
import { Theme } from "@tui/context/theme"
import { useSDK } from "../context/sdk"
import { useKeybind } from "../context/keybind"
import type { KeybindsConfig } from "@opencode-ai/sdk"

export function Home() {
  const sdk = useSDK()
  const [mcp] = createResource(async () => {
    const result = await sdk.mcp.status()
    return result.data
  })
  return (
    <box flexGrow={1} justifyContent="center" alignItems="center" paddingLeft={2} paddingRight={2} gap={1}>
      <Logo />
      <box width={39}>
        <HelpRow keybind="command_list">Commands</HelpRow>
        <HelpRow keybind="session_list">List sessions</HelpRow>
        <HelpRow keybind="model_list">Switch model</HelpRow>
        <HelpRow keybind="agent_cycle">Switch agent</HelpRow>
      </box>
      <Suspense>
        <Show when={Object.keys(mcp() ?? {}).length > 10}>
          <box maxWidth={39}>
            <For each={Object.entries(mcp() ?? {})}>
              {([key, item]) => (
                <box flexDirection="row" gap={1}>
                  <text
                    flexShrink={0}
                    style={{
                      fg: {
                        connected: Theme.success,
                        failed: Theme.error,
                        disabled: Theme.textMuted,
                      }[item.status],
                    }}
                  >
                    •
                  </text>
                  <text wrapMode="word">
                    <b>{key}</b> <span style={{ fg: Theme.textMuted }}>(MCP)</span>{" "}
                    <span style={{ fg: Theme.textMuted }}>
                      <Switch>
                        <Match when={item.status === "connected"}>
                          <></>
                        </Match>
                        <Match when={item.status === "failed" && item}>{(val) => val().error}</Match>
                        <Match when={item.status === "disabled"}>Disabled in configuration</Match>
                      </Switch>
                    </span>
                  </text>
                </box>
              )}
            </For>
          </box>
        </Show>
      </Suspense>
      <box width="100%" maxWidth={75} zIndex={1000} paddingTop={1}>
        <Prompt />
      </box>
    </box>
  )
}

function HelpRow(props: ParentProps<{ keybind: keyof KeybindsConfig }>) {
  const keybind = useKeybind()
  return (
    <box flexDirection="row" justifyContent="space-between" width="100%">
      <text>{props.children}</text>
      <text fg={Theme.primary}>{keybind.print(props.keybind)}</text>
    </box>
  )
}

const LOGO_LEFT = [`                   `, `█▀▀█ █▀▀█ █▀▀█ █▀▀▄`, `█░░█ █░░█ █▀▀▀ █░░█`, `▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀`]

const LOGO_RIGHT = [`             ▄     `, `█▀▀▀ █▀▀█ █▀▀█ █▀▀█`, `█░░░ █░░█ █░░█ █▀▀▀`, `▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀`]

function Logo() {
  return (
    <box>
      <For each={LOGO_LEFT}>
        {(line, index) => (
          <box flexDirection="row" gap={1}>
            <text fg={Theme.textMuted}>{line}</text>
            <text fg={Theme.text} attributes={TextAttributes.BOLD}>
              {LOGO_RIGHT[index()]}
            </text>
          </box>
        )}
      </For>
      <box flexDirection="row" justifyContent="flex-end">
        <text fg={Theme.textMuted}>{Installation.VERSION}</text>
      </box>
    </box>
  )
}
