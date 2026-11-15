import {
  bigint,
  boolean,
  datetime,
  index,
  int,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";

/** What a new account starts with. Credits never refill on their own. */
export const STARTING_CREDITS = 3;

export const users = mysqlTable("users", {
  /** "<provider>:<account id>", e.g. discord:123456789012345678. */
  id: varchar("id", { length: 80 }).primaryKey(),
  provider: varchar("provider", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  image: varchar("image", { length: 512 }),
  credits: int("credits").notNull().default(STARTING_CREDITS),
  /** Never charged. */
  unlimited: boolean("unlimited").notNull().default(false),
  /** Cannot download. */
  banned: boolean("banned").notNull().default(false),
  admin: boolean("admin").notNull().default(false),
  createdAt: datetime("created_at").notNull(),
  lastLoginAt: datetime("last_login_at").notNull(),
});

export const events = mysqlTable(
  "events",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    type: varchar("type", { length: 20 }).notNull(),
    ip: varchar("ip", { length: 45 }).notNull(),
    userId: varchar("user_id", { length: 80 }),
    detail: varchar("detail", { length: 255 }),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => [
    index("events_created_idx").on(table.createdAt),
    index("events_ip_idx").on(table.ip, table.createdAt),
  ],
);

export const blockedIps = mysqlTable("blocked_ips", {
  ip: varchar("ip", { length: 45 }).primaryKey(),
  reason: varchar("reason", { length: 255 }).notNull().default(""),
  createdAt: datetime("created_at").notNull(),
  expiresAt: datetime("expires_at").notNull(),
});

// Site-wide settings, edited by hand in the database. See config.ts for the names and their fallbacks.
export const config = mysqlTable("config", {
  name: varchar("name", { length: 40 }).primaryKey(),
  value: varchar("value", { length: 255 }).notNull(),
});

export const proxies = mysqlTable("proxies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  position: int("position").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  platforms: varchar("platforms", { length: 60 }).notNull().default("youtube"),
});

// Rows are kept after the file is gone, so this doubles as the download history.
export const downloads = mysqlTable(
  "downloads",
  {
    /** The public share token in /api/d/<token>. */
    token: varchar("token", { length: 24 }).primaryKey(),
    userId: varchar("user_id", { length: 80 })
      .notNull()
      .references(() => users.id),
    /** Name on disk inside the download folder, owner prefix included. */
    file: varchar("file", { length: 255 }).notNull(),
    sourceUrl: varchar("source_url", { length: 512 }).notNull(),
    startTime: varchar("start_time", { length: 8 }).notNull(),
    endTime: varchar("end_time", { length: 8 }).notNull(),
    format: varchar("format", { length: 8 }).notNull(),
    createdAt: datetime("created_at").notNull(),
    /** The file is gone after this: retention ran out, or the owner deleted it. */
    expiresAt: datetime("expires_at").notNull(),
  },
  (table) => [index("downloads_user_idx").on(table.userId)],
);
