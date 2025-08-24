import type { Context } from "@actions/github/lib/context"
import { lazy } from "./lazy"

export namespace Mock {
  export const state = lazy(() => {
    const mockContext = process.env["MOCK_CONTEXT"]
    const mockToken = process.env["MOCK_TOKEN"]

    return {
      isMock: Boolean(mockContext || mockToken),
      context: mockContext ? (JSON.parse(mockContext) as Context) : undefined,
      token: mockToken,
    }
  })

  export function isMock() {
    return state().isMock
  }

  export function context() {
    return state().context
  }

  export function token() {
    return state().token
  }
}
