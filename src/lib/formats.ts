// Shared by the client (format picker) and the server (yt-dlp args, file serving).
export const AUDIO_FORMATS = ["mp3", "m4a", "ogg", "opus"] as const;

export type AudioFormat = (typeof AUDIO_FORMATS)[number];
export type MediaFormat = "mp4" | AudioFormat;

export const isAudioFormat = (value: unknown): value is AudioFormat =>
  (AUDIO_FORMATS as readonly unknown[]).includes(value);

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
};

export function contentTypeFor(filename: string) {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}
