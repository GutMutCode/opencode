import { describe, expect, test } from "bun:test"
import path from "path"
import { Ripgrep } from "../../src/file/ripgrep"
import { tmpdir } from "../fixture/fixture"

describe("Ripgrep.tree", () => {
  test("generates tree for flat directory", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "a.ts"), "content")
        await Bun.write(path.join(dir, "b.ts"), "content")
        await Bun.write(path.join(dir, "c.ts"), "content")
      },
    })

    const result = await Ripgrep.tree({ cwd: tmp.path })
    const lines = result.split("\n")
    expect(lines).toContain("a.ts")
    expect(lines).toContain("b.ts")
    expect(lines).toContain("c.ts")
  })

  test("generates tree with nested directories", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "src", "index.ts"), "content")
        await Bun.write(path.join(dir, "src", "utils", "helper.ts"), "content")
        await Bun.write(path.join(dir, "README.md"), "content")
      },
    })

    const result = await Ripgrep.tree({ cwd: tmp.path })
    expect(result).toContain("src/")
    expect(result).toContain("index.ts")
    expect(result).toContain("utils/")
    expect(result).toContain("helper.ts")
    expect(result).toContain("README.md")
  })

  test("sorts directories before files", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "aaa.txt"), "content")
        await Bun.write(path.join(dir, "zzz", "file.txt"), "content")
      },
    })

    const result = await Ripgrep.tree({ cwd: tmp.path })
    const lines = result.split("\n")
    const dirIndex = lines.findIndex((l) => l.includes("zzz/"))
    const fileIndex = lines.findIndex((l) => l.includes("aaa.txt"))
    expect(dirIndex).toBeLessThan(fileIndex)
  })

  test("sorts alphabetically within same type", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "c.txt"), "content")
        await Bun.write(path.join(dir, "a.txt"), "content")
        await Bun.write(path.join(dir, "b.txt"), "content")
      },
    })

    const result = await Ripgrep.tree({ cwd: tmp.path })
    const lines = result.split("\n").filter(Boolean)
    const aIndex = lines.findIndex((l) => l.includes("a.txt"))
    const bIndex = lines.findIndex((l) => l.includes("b.txt"))
    const cIndex = lines.findIndex((l) => l.includes("c.txt"))
    expect(aIndex).toBeLessThan(bIndex)
    expect(bIndex).toBeLessThan(cIndex)
  })

  test("respects limit parameter", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        for (let i = 0; i < 100; i++) {
          await Bun.write(path.join(dir, `file${i.toString().padStart(3, "0")}.txt`), "content")
        }
      },
    })

    const result = await Ripgrep.tree({ cwd: tmp.path, limit: 10 })
    expect(result).toContain("[")
    expect(result).toContain("truncated]")
  })

  test("excludes .opencode directory", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "src", "index.ts"), "content")
        await Bun.write(path.join(dir, ".opencode", "config.json"), "content")
      },
    })

    const result = await Ripgrep.tree({ cwd: tmp.path })
    expect(result).not.toContain(".opencode")
    expect(result).toContain("src/")
  })

  test("handles empty directory", async () => {
    await using tmp = await tmpdir({ git: true })

    const result = await Ripgrep.tree({ cwd: tmp.path })
    expect(result).toBe("")
  })

  test("indents nested items correctly", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "a", "b", "c.txt"), "content")
      },
    })

    const result = await Ripgrep.tree({ cwd: tmp.path })
    const lines = result.split("\n")
    const aLine = lines.find((l) => l.includes("a/"))
    const bLine = lines.find((l) => l.includes("b/"))
    const cLine = lines.find((l) => l.includes("c.txt"))

    expect(aLine).toBe("a/")
    expect(bLine).toBe("\tb/")
    expect(cLine).toBe("\t\tc.txt")
  })

  test("default limit is 50", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        for (let i = 0; i < 60; i++) {
          await Bun.write(path.join(dir, `file${i.toString().padStart(3, "0")}.txt`), "content")
        }
      },
    })

    const result = await Ripgrep.tree({ cwd: tmp.path })
    expect(result).toContain("truncated]")
  })
})

describe("Ripgrep.files", () => {
  test("lists files in directory", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "file1.ts"), "content")
        await Bun.write(path.join(dir, "file2.ts"), "content")
      },
    })

    const files = await Array.fromAsync(Ripgrep.files({ cwd: tmp.path }))
    expect(files).toContain("file1.ts")
    expect(files).toContain("file2.ts")
  })

  test("respects glob filter", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "file1.ts"), "content")
        await Bun.write(path.join(dir, "file2.js"), "content")
      },
    })

    const files = await Array.fromAsync(Ripgrep.files({ cwd: tmp.path, glob: ["*.ts"] }))
    expect(files).toContain("file1.ts")
    expect(files).not.toContain("file2.js")
  })

  test("includes hidden files by default", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, ".hidden"), "content")
        await Bun.write(path.join(dir, "visible"), "content")
      },
    })

    const files = await Array.fromAsync(Ripgrep.files({ cwd: tmp.path }))
    expect(files).toContain(".hidden")
    expect(files).toContain("visible")
  })

  test("respects maxDepth option", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "top.txt"), "content")
        await Bun.write(path.join(dir, "level1", "mid.txt"), "content")
        await Bun.write(path.join(dir, "level1", "level2", "deep.txt"), "content")
      },
    })

    const files = await Array.fromAsync(Ripgrep.files({ cwd: tmp.path, maxDepth: 1 }))
    expect(files).toContain("top.txt")
    expect(files).not.toContain(path.join("level1", "mid.txt"))
  })

  test("throws for non-existent directory", async () => {
    const nonexistent = "/tmp/nonexistent-dir-" + Math.random().toString(36).slice(2)
    expect(Array.fromAsync(Ripgrep.files({ cwd: nonexistent }))).rejects.toThrow()
  })

  test("excludes .git directory by default", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "src.ts"), "content")
      },
    })

    const files = await Array.fromAsync(Ripgrep.files({ cwd: tmp.path }))
    const gitFiles = files.filter((f) => f.includes(".git"))
    expect(gitFiles.length).toBe(0)
    expect(files).toContain("src.ts")
  })

  test("respects exclude glob pattern", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "keep.ts"), "content")
        await Bun.write(path.join(dir, "ignore.test.ts"), "content")
      },
    })

    const files = await Array.fromAsync(Ripgrep.files({ cwd: tmp.path, glob: ["!*.test.ts"] }))
    expect(files).toContain("keep.ts")
    expect(files).not.toContain("ignore.test.ts")
  })
})

describe("Ripgrep.search", () => {
  test("finds matches in files", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "test.ts"), "function hello() { return 'world' }")
      },
    })

    const results = await Ripgrep.search({ cwd: tmp.path, pattern: "hello" })
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].path.text).toBe("test.ts")
    expect(results[0].lines.text).toContain("hello")
  })

  test("returns empty array for no matches", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "test.ts"), "function hello() {}")
      },
    })

    const results = await Ripgrep.search({ cwd: tmp.path, pattern: "nonexistentpattern123" })
    expect(results).toEqual([])
  })

  test("respects limit parameter", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        const content = "match\nmatch\nmatch\nmatch\nmatch"
        await Bun.write(path.join(dir, "test.txt"), content)
      },
    })

    const results = await Ripgrep.search({ cwd: tmp.path, pattern: "match", limit: 2 })
    expect(results.length).toBe(2)
  })

  test("includes line numbers", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "test.txt"), "line1\nline2\nmatch here\nline4")
      },
    })

    const results = await Ripgrep.search({ cwd: tmp.path, pattern: "match" })
    expect(results[0].line_number).toBe(3)
  })

  test("includes submatches", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "test.txt"), "hello world")
      },
    })

    const results = await Ripgrep.search({ cwd: tmp.path, pattern: "world" })
    expect(results[0].submatches.length).toBeGreaterThan(0)
    expect(results[0].submatches[0].match.text).toBe("world")
  })

  test("respects glob filter", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "include.ts"), "searchterm")
        await Bun.write(path.join(dir, "exclude.js"), "searchterm")
      },
    })

    const results = await Ripgrep.search({ cwd: tmp.path, pattern: "searchterm", glob: ["*.ts"] })
    expect(results.length).toBe(1)
    expect(results[0].path.text).toBe("include.ts")
  })

  test("respects exclude glob filter", async () => {
    await using tmp = await tmpdir({
      git: true,
      init: async (dir) => {
        await Bun.write(path.join(dir, "include.ts"), "searchterm")
        await Bun.write(path.join(dir, "node_modules", "exclude.ts"), "searchterm")
      },
    })

    const results = await Ripgrep.search({ cwd: tmp.path, pattern: "searchterm", glob: ["!node_modules/**"] })
    expect(results.length).toBe(1)
    expect(results[0].path.text).toBe("include.ts")
  })
})
