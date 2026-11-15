import { db } from "./index.ts";
import { config } from "./schema.ts";
import { numberField, type NumberSettingName } from "../setting-fields.ts";

export const THEME_IDS = ["mono-light", "mono-dark", "neon-light", "neon-dark"];
/** A family on its own means "this look, light or dark to match the visitor's device". */
const THEME_FAMILIES = ["mono", "neon"];

export interface SiteConfig {
  /** Resolution preselected for a new video: the best one at or below this. null = the highest available. */
  defaultHeight: number | null;
  /**
   * Theme for visitors who have not picked one themselves: a family ("mono",
   * "neon") that follows the device's light/dark setting, or one fixed theme id.
   */
  defaultTheme: string;
  /** Hours before a finished download is deleted. */
  retentionHours: number;
  previewRetries: number;
  startingCredits: number;
  previewMaxMb: number;
  previewMaxMbGuest: number;
  previewDirMaxMb: number;
  infoPer10minGuest: number;
  infoPer10minMember: number;
  maxJobs: number;
  minFreeDiskGb: number;
  maxClipMinutes: number;
  downloadTimeoutMinutes: number;
  downloadMaxMb: number;
}

const wholeNumber = (raw: string | undefined, min: number, max = Infinity) => {
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
};

const numberSetting = (values: Record<string, string>, name: NumberSettingName) => {
  const field = numberField(name);
  return wholeNumber(values[name], field.min, field.max) ?? field.fallback;
};

/**
 * Props for next-themes. Its built-in "system" theme resolves to "light" or
 * "dark"; `value` turns those into this site's class names, so "system" means
 * the default family in whichever shade the device asks for.
 */
export function themeProps(defaultTheme: string) {
  const follows = THEME_FAMILIES.includes(defaultTheme);
  const family = follows ? defaultTheme : "mono";
  return {
    defaultTheme: follows ? "system" : defaultTheme,
    value: {
      light: `${family}-light`,
      dark: `${family}-dark`,
      ...Object.fromEntries(THEME_IDS.map((id) => [id, id])),
    },
  };
}

/**
 * Turns the rows of the `config` table into settings. A missing or nonsensical
 * value falls back to its default instead of breaking the site.
 *
 *   default_height   720, 1080, ... or "max"
 *   default_theme    "mono" or "neon" (follow the device), or one of THEME_IDS
 *   retention_hours  a positive number, decimals allowed
 */
export function parseConfig(values: Record<string, string>): SiteConfig {
  const height = Number(values.default_height);
  const hours = Number(values.retention_hours);
  return {
    defaultHeight: Number.isInteger(height) && height > 0 ? height : null,
    defaultTheme: [...THEME_FAMILIES, ...THEME_IDS].includes(values.default_theme)
      ? values.default_theme
      : "mono",
    retentionHours: Number.isFinite(hours) && hours > 0 ? hours : 24,
    previewRetries: numberSetting(values, "preview_retries"),
    startingCredits: numberSetting(values, "starting_credits"),
    previewMaxMb: numberSetting(values, "preview_max_mb"),
    previewMaxMbGuest: numberSetting(values, "preview_max_mb_guest"),
    previewDirMaxMb: numberSetting(values, "preview_dir_max_mb"),
    infoPer10minGuest: numberSetting(values, "info_per_10min_guest"),
    infoPer10minMember: numberSetting(values, "info_per_10min_member"),
    maxJobs: numberSetting(values, "max_jobs"),
    minFreeDiskGb: numberSetting(values, "min_free_disk_gb"),
    maxClipMinutes: numberSetting(values, "max_clip_minutes"),
    downloadTimeoutMinutes: numberSetting(values, "download_timeout_minutes"),
    downloadMaxMb: numberSetting(values, "download_max_mb"),
  };
}

export const DEFAULTS: SiteConfig = parseConfig({});

export async function getConfig(): Promise<SiteConfig> {
  try {
    const rows = await db().select().from(config);
    return parseConfig(Object.fromEntries(rows.map((r) => [r.name, r.value])));
  } catch (error) {
    // Settings are a convenience; the site must still render when the database is unreachable.
    console.error("Config unavailable, using defaults:", error);
    return DEFAULTS;
  }
}
