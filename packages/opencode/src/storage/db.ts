import { Database as BunDatabase } from "bun:sqlite"
import { drizzle, type SQLiteBunDatabase } from "drizzle-orm/bun-sqlite"
import { migrate as drizzleMigrate } from "drizzle-orm/bun-sqlite/migrator"
import type { SQLiteTransaction } from "drizzle-orm/sqlite-core"
export * from "drizzle-orm"
import { Context } from "../util/context"
import { lazy } from "../util/lazy"
import { Global } from "../global"
import { Log } from "../util/log"
import { migrateFromJson } from "./json-migration"
import { NamedError } from "@opencode-ai/util/error"
import z from "zod"
import path from "path"
import { readFileSync } from "fs"

declare const OPENCODE_MIGRATIONS: { sql: string; timestamp: number }[] | undefined

export const NotFoundError = NamedError.create(
  "NotFoundError",
  z.object({
    message: z.string(),
  }),
)

const log = Log.create({ service: "db" })

export namespace Database {
  export type Transaction = SQLiteTransaction<"sync", void, Record<string, never>, Record<string, never>>

  type Client = SQLiteBunDatabase

  const client = lazy(() => {
    log.info("opening database", { path: path.join(Global.Path.data, "opencode.db") })

    const sqlite = new BunDatabase(path.join(Global.Path.data, "opencode.db"), { create: true })

    sqlite.run("PRAGMA journal_mode = WAL")
    sqlite.run("PRAGMA synchronous = NORMAL")
    sqlite.run("PRAGMA busy_timeout = 5000")
    sqlite.run("PRAGMA cache_size = -64000")
    sqlite.run("PRAGMA foreign_keys = ON")

    const db = drizzle({ client: sqlite })
    migrate(db)

    // Run json migration if not already done
    const marker = sqlite.prepare("SELECT 1 FROM __drizzle_migrations WHERE hash = 'json-migration'").get()
    if (!marker) {
      Bun.file(path.join(Global.Path.data, "storage/project"))
        .exists()
        .then((exists) => {
          if (!exists) return
          return migrateFromJson(sqlite).then(() => {
            sqlite.run("INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('json-migration', ?)", [Date.now()])
          })
        })
        .catch((e) => log.error("json migration failed", { error: e }))
    }

    return db
  })

  export type TxOrDb = Transaction | Client

  const TransactionContext = Context.create<{
    tx: TxOrDb
    effects: (() => void | Promise<void>)[]
  }>("database")

  export function use<T>(callback: (trx: TxOrDb) => T): T {
    try {
      const { tx } = TransactionContext.use()
      return callback(tx)
    } catch (err) {
      if (err instanceof Context.NotFound) {
        const effects: (() => void | Promise<void>)[] = []
        const result = TransactionContext.provide({ effects, tx: client() }, () => callback(client()))
        for (const effect of effects) effect()
        return result
      }
      throw err
    }
  }

  export function effect(effect: () => void | Promise<void>) {
    try {
      const { effects } = TransactionContext.use()
      effects.push(effect)
    } catch {
      effect()
    }
  }

  export function transaction<T>(callback: (tx: TxOrDb) => T): T {
    try {
      const { tx } = TransactionContext.use()
      return callback(tx)
    } catch (err) {
      if (err instanceof Context.NotFound) {
        const effects: (() => void | Promise<void>)[] = []
        const result = client().transaction((tx) => {
          return TransactionContext.provide({ tx, effects }, () => callback(tx))
        })
        for (const effect of effects) effect()
        return result
      }
      throw err
    }
  }
}

type MigrationsJournal = { sql: string; timestamp: number }[]

function prepareJournal(dir: string): MigrationsJournal {
  const file = path.join(dir, "meta/_journal.json")
  if (!Bun.file(file).size) return []

  const journal = JSON.parse(readFileSync(file, "utf-8")) as {
    entries: { tag: string; when: number }[]
  }

  return journal.entries.map((entry) => ({
    sql: readFileSync(path.join(dir, `${entry.tag}.sql`), "utf-8"),
    timestamp: entry.when,
  }))
}

function migrate(db: SQLiteBunDatabase) {
  const journal =
    typeof OPENCODE_MIGRATIONS !== "undefined"
      ? OPENCODE_MIGRATIONS
      : prepareJournal(path.join(import.meta.dirname, "../../migration"))

  if (journal.length === 0) {
    log.info("no migrations found")
    return
  }
  log.info("applying migrations", {
    count: journal.length,
    mode: typeof OPENCODE_MIGRATIONS !== "undefined" ? "bundled" : "dev",
  })
  drizzleMigrate(db, journal)
}
