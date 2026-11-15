import { listUsers } from "@/lib/db/accounts";
import { lastLoginIps } from "@/lib/db/events";

export async function usersForAdmin() {
  const users = await listUsers();
  const ips = await lastLoginIps(users.map((u) => u.id));
  return users.map((u) => ({
    id: u.id,
    provider: u.provider,
    name: u.name,
    image: u.image,
    credits: u.credits,
    unlimited: u.unlimited,
    banned: u.banned,
    admin: u.admin,
    lastLoginAt: u.lastLoginAt.toISOString(),
    lastIp: ips[u.id] ?? null,
  }));
}
