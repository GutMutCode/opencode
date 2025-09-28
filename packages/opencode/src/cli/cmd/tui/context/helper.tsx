import { createContext, useContext, type ParentProps } from "solid-js"

export function createSimpleContext<T>(input: { name: string; init: () => T }) {
  const ctx = createContext<T>()

  return {
    provider: (props: ParentProps) => {
      const init = input.init()
      return <ctx.Provider value={init}>{props.children}</ctx.Provider>
    },
    use() {
      const value = useContext(ctx)
      if (!value) throw new Error(`${input.name} context must be used within a context provider`)
      return value
    },
  }
}
