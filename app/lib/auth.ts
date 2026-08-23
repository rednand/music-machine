import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";

export interface AuthClientLike {
  auth: {
    getUser(): Promise<{ data: { user: { email?: string | null } | null } }>;
  };
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail && email && email.toLowerCase() === adminEmail.toLowerCase());
}

export async function getIsAdmin(supabase: AuthClientLike): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return isAdminEmail(data.user?.email);
}

export const getCurrentIsAdmin = cache(async (): Promise<boolean> => {
  return getIsAdmin(await createSupabaseServerClient());
});
