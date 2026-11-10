import fs from "fs";
import path from "path";

// Same folder as the link registry: already ignored by git, and the retention
// sweep skips dotfiles, so balances outlive the downloads themselves.
const CREDITS_PATH = path.resolve(process.cwd(), "download", ".credits.json");

/** What a new account starts with. Credits never refill on their own. */
export const STARTING_CREDITS = 3;

// Comma-separated owner ids ("discord:123,google:456") that are never charged.
const UNLIMITED = new Set(
  (process.env.AUTH_UNLIMITED_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

/** Owner id -> credits left. An owner with no entry still has the starting amount. */
type Balances = Record<string, number>;

function readBalances(): Balances {
  let raw: string;
  try {
    raw = fs.readFileSync(CREDITS_PATH, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
  // A corrupt file must fail loudly: treating it as empty would hand everyone fresh credits.
  return JSON.parse(raw) as Balances;
}

function writeBalances(balances: Balances) {
  fs.mkdirSync(path.dirname(CREDITS_PATH), { recursive: true });
  // Write-then-rename so a crash mid-write cannot leave a half-written file.
  const tmp = `${CREDITS_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(balances, null, 2), "utf8");
  fs.renameSync(tmp, CREDITS_PATH);
}

function isUnlimited(owner: string) {
  return owner === "local" || UNLIMITED.has(owner);
}

/** Credits the owner has left, or null when the owner is never charged. */
export function creditsLeft(owner: string): number | null {
  if (isUnlimited(owner)) return null;
  return readBalances()[owner] ?? STARTING_CREDITS;
}

/**
 * Takes one credit before a download starts; false when there is none left.
 * Taking it up front (and refunding on failure) stops two downloads started
 * at once from both spending the same last credit.
 */
export function takeCredit(owner: string) {
  if (isUnlimited(owner)) return true;
  const balances = readBalances();
  const left = balances[owner] ?? STARTING_CREDITS;
  if (left <= 0) return false;
  balances[owner] = left - 1;
  writeBalances(balances);
  return true;
}

/** Gives the credit back when the download it paid for failed. */
export function refundCredit(owner: string) {
  if (isUnlimited(owner)) return;
  const balances = readBalances();
  balances[owner] = (balances[owner] ?? STARTING_CREDITS) + 1;
  writeBalances(balances);
}
