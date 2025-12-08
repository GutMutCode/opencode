# Keybinds Implementation Guide

This document describes where and how keybinds are implemented in the OpenCode codebase.

## Overview

Keybinds in OpenCode are implemented through a modular architecture that separates parsing, configuration, context management, and usage across TUI components.

## Core Implementation Files

### 1. Keybind Utility Module (`src/util/keybind.ts`)

**Location**: `/home/runner/work/opencode/opencode/packages/opencode/src/util/keybind.ts`

This is the **core parsing and matching logic** for keybinds. It exports a `Keybind` namespace with the following key components:

- **`Keybind.Info` interface**: Defines the structure of a keybind
  ```typescript
  {
    ctrl: boolean
    meta: boolean
    shift: boolean
    leader: boolean
    name: string
  }
  ```

- **`Keybind.parse(key: string): Info[]`**: Parses keybind strings (e.g., `"ctrl+x"`, `"<leader>f"`) into structured info objects
  - Supports modifier keys: `ctrl`, `alt`/`meta`/`option`, `shift`
  - Supports special `<leader>` syntax
  - Supports multiple keybinds separated by commas (e.g., `"ctrl+c,<leader>q"`)
  - Case-insensitive parsing
  - Handles special key mappings (e.g., `esc` → `escape`)

- **`Keybind.match(a: Info, b: Info): boolean`**: Deep equality comparison of two keybind info objects

- **`Keybind.toString(info: Info): string`**: Converts a keybind info object back to a human-readable string

### 2. Keybind Context Provider (`src/cli/cmd/tui/context/keybind.tsx`)

**Location**: `/home/runner/work/opencode/opencode/packages/opencode/src/cli/cmd/tui/context/keybind.tsx`

This provides the **React/Solid.js context** for keybind management in the TUI:

- **`useKeybind()` hook**: Provides keybind functionality to TUI components
- **`KeybindProvider`**: Context provider that wraps the TUI

**Key Features**:
- Loads keybinds from config (`sync.data.config.keybinds`)
- Implements leader key support with timeout (2 seconds)
- Provides helper methods:
  - `all`: Get all configured keybinds
  - `leader`: Current leader key state
  - `parse(evt: ParsedKey)`: Parse keyboard event into keybind info
  - `match(key: keyof KeybindsConfig, evt: ParsedKey)`: Check if event matches a configured keybind
  - `print(key: keyof KeybindsConfig)`: Get human-readable string for a keybind

### 3. Keybind Configuration Schema (`src/config/config.ts`)

**Location**: `/home/runner/work/opencode/opencode/packages/opencode/src/config/config.ts` (lines 421-476)

Defines the **Zod schema for keybind configuration** with all available keybinds and their defaults:

**Key Categories**:

1. **Application Controls**
   - `app_exit`: Exit application (default: `ctrl+c,ctrl+d,<leader>q`)
   - `terminal_suspend`: Suspend terminal (default: `ctrl+z`)

2. **UI Controls**
   - `sidebar_toggle`: Toggle sidebar (default: `<leader>b`)
   - `scrollbar_toggle`: Toggle scrollbar (default: `none`)
   - `username_toggle`: Toggle username (default: `none`)
   - `theme_list`: List themes (default: `<leader>t`)

3. **Session Management**
   - `session_new`: New session (default: `<leader>n`)
   - `session_list`: List sessions (default: `<leader>l`)
   - `session_timeline`: Show timeline (default: `<leader>g`)
   - `session_interrupt`: Interrupt session (default: `escape`)
   - `session_compact`: Compact session (default: `<leader>c`)
   - `session_export`: Export session (default: `<leader>x`)
   - `session_share`: Share session (default: `none`)
   - `session_unshare`: Unshare session (default: `none`)
   - `session_child_cycle`: Next child (default: `<leader>right`)
   - `session_child_cycle_reverse`: Previous child (default: `<leader>left`)

4. **Message Navigation**
   - `messages_page_up`: Page up (default: `pageup`)
   - `messages_page_down`: Page down (default: `pagedown`)
   - `messages_half_page_up`: Half page up (default: `ctrl+alt+u`)
   - `messages_half_page_down`: Half page down (default: `ctrl+alt+d`)
   - `messages_first`: First message (default: `ctrl+g,home`)
   - `messages_last`: Last message (default: `ctrl+alt+g,end`)
   - `messages_last_user`: Last user message (default: `none`)
   - `messages_copy`: Copy message (default: `<leader>y`)
   - `messages_undo`: Undo message (default: `<leader>u`)
   - `messages_redo`: Redo message (default: `<leader>r`)
   - `messages_toggle_conceal`: Toggle concealment (default: `<leader>h`)

5. **Model & Agent Controls**
   - `model_list`: List models (default: `<leader>m`)
   - `model_cycle_recent`: Next recent model (default: `f2`)
   - `model_cycle_recent_reverse`: Previous recent model (default: `shift+f2`)
   - `agent_list`: List agents (default: `<leader>a`)
   - `agent_cycle`: Next agent (default: `tab`)
   - `agent_cycle_reverse`: Previous agent (default: `shift+tab`)

6. **Input Controls**
   - `input_clear`: Clear input (default: `ctrl+c`)
   - `input_forward_delete`: Forward delete (default: `ctrl+d`)
   - `input_paste`: Paste (default: `ctrl+v`)
   - `input_submit`: Submit (default: `return`)
   - `input_newline`: Newline (default: `shift+return,ctrl+j`)

7. **History Navigation**
   - `history_previous`: Previous (default: `up`)
   - `history_next`: Next (default: `down`)

8. **Other Controls**
   - `editor_open`: Open editor (default: `<leader>e`)
   - `status_view`: View status (default: `<leader>s`)
   - `command_list`: List commands (default: `ctrl+p`)
   - `tool_details`: Tool details (default: `none`)

## Usage in Components

Keybinds are used throughout the TUI by:

1. **Importing the hook**:
   ```typescript
   import { useKeybind } from "@tui/context/keybind"
   ```

2. **Using in component**:
   ```typescript
   const keybind = useKeybind()
   
   // Check if event matches a keybind
   if (keybind.match("app_exit", event)) {
     // Handle exit
   }
   
   // Display keybind to user
   const exitKey = keybind.print("app_exit")
   ```

### Example Usage Locations

- **Prompt Component** (`src/cli/cmd/tui/component/prompt/index.tsx`): Input handling, history navigation
- **Session Routes** (`src/cli/cmd/tui/routes/session/index.tsx`): Session-level keybinds
- **Header/Sidebar** (`src/cli/cmd/tui/routes/session/header.tsx`, `sidebar.tsx`): UI controls
- **Dialog Components** (`src/cli/cmd/tui/ui/dialog-*.tsx`): Dialog-specific keybinds

## Testing

**Test File**: `/home/runner/work/opencode/opencode/packages/opencode/test/keybind.test.ts`

Comprehensive test suite covering:
- Parsing various keybind formats
- String conversion
- Matching logic
- Edge cases (leader keys, multiple modifiers, special keys)

## Configuration

Users can customize keybinds via:

1. **Global config**: `~/.opencode/opencode.json` or `~/.opencode/opencode.jsonc`
2. **Project config**: `<project>/.opencode/opencode.json` or `opencode.json` in project root
3. **Environment variable**: `OPENCODE_CONFIG_CONTENT`

Example configuration:
```json
{
  "keybinds": {
    "leader": "ctrl+space",
    "app_exit": "ctrl+q",
    "session_new": "<leader>n,ctrl+t"
  }
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Configuration                        │
│         (opencode.json, environment variables)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Config System (config/config.ts)                │
│         - Loads & validates keybind configuration            │
│         - Merges configs from multiple sources               │
│         - Zod schema validation (Keybinds)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        Keybind Context (tui/context/keybind.tsx)             │
│         - Provides useKeybind() hook                         │
│         - Manages leader key state                           │
│         - Implements match() and print() methods             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Keybind Utility (util/keybind.ts)                   │
│         - parse(): String → Keybind.Info[]                   │
│         - match(): Compare keybinds                          │
│         - toString(): Info → String                          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              TUI Components                                  │
│   - Prompt, Session, Header, Sidebar, Dialogs, etc.         │
│   - Call keybind.match() on keyboard events                  │
│   - Display keybinds with keybind.print()                    │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **Separation of Concerns**: Parsing logic is separated from context management and UI
2. **Leader Key Pattern**: Vim-style leader key support with configurable timeout
3. **Multiple Keybinds**: Support for comma-separated alternatives (e.g., `"ctrl+c,<leader>q"`)
4. **Case Insensitivity**: Keybind strings are parsed case-insensitively for better UX
5. **Type Safety**: Full TypeScript support with Zod schema validation
6. **Testability**: Pure functions for parsing/matching make testing straightforward

## Adding New Keybinds

To add a new keybind:

1. **Add to schema** in `src/config/config.ts`:
   ```typescript
   export const Keybinds = z.object({
     // ... existing keybinds
     my_new_action: z.string().optional().default("ctrl+n").describe("My new action"),
   })
   ```

2. **Use in component**:
   ```typescript
   const keybind = useKeybind()
   
   useKeyboard((evt) => {
     if (keybind.match("my_new_action", evt)) {
       // Handle action
     }
   })
   ```

3. **Update TypeScript types**: The SDK types should be updated to reflect the new keybind

## Related Files

- **SDK Types**: `@opencode-ai/sdk/v2` exports `KeybindsConfig` type
- **Config Loading**: `src/config/config.ts` - Handles config merging and validation
- **Global State**: `src/global.ts` - Global paths and configuration
- **Sync Context**: `src/cli/cmd/tui/context/sync.tsx` - Syncs config to TUI

## Summary

Keybinds are implemented through three main layers:

1. **Utility Layer** (`util/keybind.ts`): Pure parsing and matching logic
2. **Context Layer** (`context/keybind.tsx`): React/Solid context for TUI integration
3. **Configuration Layer** (`config/config.ts`): Schema definition and default values

This architecture allows for flexible keybind customization while maintaining type safety and testability.
