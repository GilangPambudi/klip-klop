import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** BroadcastChannel the sign-in popup uses to tell the editor tab it is done. */
export const AUTH_CHANNEL = "klip-klop-auth"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
