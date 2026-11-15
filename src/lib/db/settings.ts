import { inArray } from "drizzle-orm";
import { db } from "./index";
import { config } from "./schema";
import { THEME_IDS } from "./config";
import { NUMBER_FIELDS, numberField, type NumberSettingName } from "../setting-fields";

const TEXT_SETTING_NAMES = [
  "default_height",
  "default_theme",
  "retention_hours",
  "instagram_sessionid",
] as const;

export type SettingName = (typeof TEXT_SETTING_NAMES)[number] | NumberSettingName;
export type Settings = Record<SettingName, string>;

export const SETTING_NAMES: readonly SettingName[] = [
  ...TEXT_SETTING_NAMES,
  ...NUMBER_FIELDS.map((f) => f.name),
];

const isNumberSetting = (name: SettingName): name is NumberSettingName =>
  NUMBER_FIELDS.some((f) => f.name === name);

const THEME_CHOICES = ["mono", "neon", ...THEME_IDS];

export function validateSetting(name: SettingName, raw: string): string | null {
  const value = raw.trim();
  if (isNumberSetting(name)) {
    const { min, max = Infinity } = numberField(name);
    const number = Number(value);
    return value !== "" && Number.isInteger(number) && number >= min && number <= max
      ? String(number)
      : null;
  }
  switch (name) {
    case "default_height": {
      if (value === "" || value === "max") return "max";
      const height = Number(value);
      return Number.isInteger(height) && height > 0 ? String(height) : null;
    }
    case "default_theme":
      return THEME_CHOICES.includes(value) ? value : null;
    case "retention_hours": {
      const hours = Number(value);
      return Number.isFinite(hours) && hours > 0 ? String(hours) : null;
    }
    case "instagram_sessionid":
      return value === "" || /^[\w%:.-]+$/.test(value) ? value : null;
  }
}

export async function readSettings(): Promise<Settings> {
  const rows = await db()
    .select()
    .from(config)
    .where(inArray(config.name, [...SETTING_NAMES]));
  const values = Object.fromEntries(rows.map((r) => [r.name, r.value]));
  return Object.fromEntries(
    SETTING_NAMES.map((name) => [
      name,
      values[name] ?? (isNumberSetting(name) ? String(numberField(name).fallback) : ""),
    ]),
  ) as Settings;
}

export async function writeSettings(values: Partial<Settings>) {
  for (const [name, value] of Object.entries(values)) {
    if (name === "instagram_sessionid" && value === "") {
      await db().delete(config).where(inArray(config.name, [name]));
      continue;
    }
    await db()
      .insert(config)
      .values({ name, value })
      .onDuplicateKeyUpdate({ set: { value } });
  }
}

export { THEME_CHOICES };
