# Agent Instructions

## Quick Reference

- Default branch: `dev`
- Regenerate JS SDK: `./packages/sdk/js/script/build.ts`
- Always use parallel tools when applicable

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Use Bun APIs when possible (e.g., `Bun.file()` instead of `fs.existsSync()`)
- For sync file reads, use `readFileSync` from `fs` (Bun.file is async-only)
- Avoid generated file artifacts - prefer build-time `define` globals for bundled data

### Naming

Prefer single word variable names. Only use multiple words if necessary.

```ts
// Good
const foo = 1
const bar = 2

// Bad
const fooBar = 1
const barBaz = 2
```

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

## Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
