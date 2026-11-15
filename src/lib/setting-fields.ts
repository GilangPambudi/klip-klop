export interface NumberField {
  name: string;
  label: string;
  min: number;
  max?: number;
  fallback: number;
}

export const MAX_PREVIEW_RETRIES = 10;

export const NUMBER_FIELDS = [
  { name: "preview_retries", label: "Preview load retries (0 to 10)", min: 0, max: MAX_PREVIEW_RETRIES, fallback: 3 },
  { name: "starting_credits", label: "Credits for new accounts", min: 0, fallback: 3 },
  { name: "preview_max_mb", label: "Max preview size when signed in, TikTok and Instagram (MB)", min: 1, fallback: 200 },
  { name: "preview_max_mb_guest", label: "Max preview size when signed out (MB)", min: 1, fallback: 50 },
  { name: "preview_dir_max_mb", label: "Preview folder cap (MB)", min: 50, fallback: 2000 },
  { name: "info_per_10min_guest", label: "Video loads per 10 minutes, signed out (per IP)", min: 0, fallback: 10 },
  { name: "info_per_10min_member", label: "Video loads per 10 minutes, signed in", min: 0, fallback: 30 },
  { name: "max_jobs", label: "Loads and downloads at once, whole server", min: 1, fallback: 3 },
  { name: "min_free_disk_gb", label: "Pause when free disk is below (GB)", min: 0, fallback: 5 },
] as const satisfies readonly NumberField[];

export type NumberSettingName = (typeof NUMBER_FIELDS)[number]["name"];

export function numberField(name: NumberSettingName): NumberField {
  return NUMBER_FIELDS.find((f) => f.name === name)!;
}
