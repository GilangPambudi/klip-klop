import {
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
  /** Never charged. Flip it by hand in the database. */
  unlimited: boolean("unlimited").notNull().default(false),
  /** Cannot download. Flip it by hand in the database. */
  banned: boolean("banned").notNull().default(false),
  createdAt: datetime("created_at").notNull(),
  lastLoginAt: datetime("last_login_at").notNull(),
});

// Site-wide settings, edited by hand in the database. See config.ts for the names and their fallbacks.
export const config = mysqlTable("config", {
  name: varchar("name", { length: 40 }).primaryKey(),
  value: varchar("value", { length: 255 }).notNull(),
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
