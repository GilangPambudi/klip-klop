export interface NumberField {
  name: string;
  label: string;
  min: number;
  max?: number;
  fallback: number;
  group: NumberGroup;
}

export const NUMBER_GROUPS = [
  { id: "preview", title: "Preview", hint: "Loading a video into the editor." },
  { id: "traffic", title: "Traffic & server", hint: "Rate limits and how much the server takes on at once." },
  { id: "accounts", title: "Accounts & limits", hint: "Credits and caps for limited accounts. Unlimited and admin accounts skip every limit except free disk." },
] as const;

export type NumberGroup = (typeof NUMBER_GROUPS)[number]["id"];

export const MAX_PREVIEW_RETRIES = 10;

export const NUMBER_FIELDS = [
  { name: "preview_retries", label: "Preview load retries (0 to 10)", min: 0, max: MAX_PREVIEW_RETRIES, fallback: 3, group: "preview" },
  { name: "preview_max_mb", label: "Max preview size when signed in, TikTok and Instagram (MB)", min: 1, fallback: 200, group: "preview" },
  { name: "preview_max_mb_guest", label: "Max preview size when signed out (MB)", min: 1, fallback: 50, group: "preview" },
  { name: "preview_dir_max_mb", label: "Preview folder cap (MB)", min: 50, fallback: 2000, group: "preview" },
  { name: "info_per_10min_guest", label: "Video loads per 10 minutes, signed out (per IP)", min: 0, fallback: 10, group: "traffic" },
  { name: "info_per_10min_member", label: "Video loads per 10 minutes, signed in", min: 0, fallback: 30, group: "traffic" },
  { name: "max_jobs", label: "Loads and downloads at once, whole server", min: 1, fallback: 3, group: "traffic" },
  { name: "min_free_disk_gb", label: "Pause when free disk is below (GB)", min: 0, fallback: 5, group: "traffic" },
  { name: "starting_credits", label: "Credits for new accounts", min: 0, fallback: 3, group: "accounts" },
  { name: "min_account_age_days", label: "Discord account age before credits are given (days, 0 = off)", min: 0, fallback: 90, group: "accounts" },
  { name: "max_clip_minutes", label: "Longest clip a limited account can download (minutes)", min: 1, fallback: 10, group: "accounts" },
  { name: "download_timeout_minutes", label: "Download time limit for limited accounts (minutes)", min: 1, fallback: 10, group: "accounts" },
  { name: "download_max_mb", label: "Largest download for limited accounts (MB)", min: 1, fallback: 500, group: "accounts" },
] as const satisfies readonly NumberField[];

export type NumberSettingName = (typeof NUMBER_FIELDS)[number]["name"];

export function numberField(name: NumberSettingName): NumberField {
  return NUMBER_FIELDS.find((f) => f.name === name)!;
}
