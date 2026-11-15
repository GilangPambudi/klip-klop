import { heldUserIds, listUsers } from "@/lib/db/accounts";
import { lastLoginIps } from "@/lib/db/events";

export async function usersForAdmin() {
  const users = await listUsers();
  const [ips, held] = await Promise.all([lastLoginIps(users.map((u) => u.id)), heldUserIds()]);
  return users.map((u) => ({
    id: u.id,
    provider: u.provider,
    name: u.name,
    image: u.image,
    credits: u.credits,
    unlimited: u.unlimited,
    banned: u.banned,
    admin: u.admin,
    held: held.has(u.id),
    lastLoginAt: u.lastLoginAt.toISOString(),
    lastIp: ips[u.id] ?? null,
  }));
}
