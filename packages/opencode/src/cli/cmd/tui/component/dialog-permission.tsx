import { useTheme } from "../context/theme"
import { useKeyboard } from "@opentui/solid"
import type { Permission, ToolPart } from "@opencode-ai/sdk"

export type DialogPermissionProps = {
  permission: Permission
  toolPart?: ToolPart
  onResponse: (response: "once" | "always" | "reject") => void
}

export function DialogPermission(props: DialogPermissionProps) {
  const { theme } = useTheme()

  useKeyboard((evt) => {
    if (evt.name === "return" || evt.name === "enter") {
      evt.preventDefault()
      props.onResponse("once")
    }

    if (evt.name === "a") {
      evt.preventDefault()
      props.onResponse("always")
    }

    if (evt.name === "d" || evt.name === "escape") {
      evt.preventDefault()
      props.onResponse("reject")
    }
  })

  return (
    <box paddingLeft={3} paddingRight={3} paddingTop={1} paddingBottom={2} gap={1} flexDirection="column">
      <text fg={theme.text}>Permission required to run this tool:</text>

      <box flexDirection="row" gap={2} marginTop={2} flexWrap="wrap">
        <text fg={theme.text}>
          <b>enter</b>
          <span style={{ fg: theme.textMuted }}> accept</span>
        </text>
        <text fg={theme.text}>
          <b>a</b>
          <span style={{ fg: theme.textMuted }}> accept always</span>
        </text>
        <text fg={theme.text}>
          <b>d</b>
          <span style={{ fg: theme.textMuted }}> deny</span>
        </text>
      </box>
    </box>
  )
}
