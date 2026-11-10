import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
// Explicit .ts so the db layer also runs under plain `node --test` (scripts/accounts.test.mjs).
import * as schema from "./schema.ts";

type Db = MySql2Database<typeof schema>;

// One pool per process; the global survives dev hot reloads.
const globalDb = globalThis as typeof globalThis & { __klipKlopDb?: Db };

export function db(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  globalDb.__klipKlopDb ??= drizzle(
    mysql.createPool({ uri: url, connectionLimit: 5, timezone: "Z" }),
    { schema, mode: "default" },
  );
  return globalDb.__klipKlopDb;
}
