const DISCORD_EPOCH_MS = BigInt(1420070400000);
const TIMESTAMP_SHIFT = BigInt(22);
const DAY_MS = 24 * 60 * 60 * 1000;

export function discordCreatedAt(accountId: string): Date | null {
  const match = accountId.match(/^discord:(\d{15,20})$/);
  if (!match) return null;
  return new Date(Number((BigInt(match[1]) >> TIMESTAMP_SHIFT) + DISCORD_EPOCH_MS));
}

export function unlocksAt(accountId: string, minDays: number, now = Date.now()): Date | null {
  if (minDays <= 0) return null;
  const created = discordCreatedAt(accountId);
  if (!created) return null;
  const unlock = created.getTime() + minDays * DAY_MS;
  return unlock > now ? new Date(unlock) : null;
}
