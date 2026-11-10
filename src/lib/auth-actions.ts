"use server";

import { providerIds, signIn, signOut } from "@/auth";

export async function loginAction(provider: string) {
  if (!providerIds.includes(provider)) throw new Error("Unknown provider");
  await signIn(provider, { redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
