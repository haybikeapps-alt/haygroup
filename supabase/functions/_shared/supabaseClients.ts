import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Klien dengan service_role — melewati RLS. HANYA dipakai di Edge Function,
 * TIDAK PERNAH dikirim/dipakai di browser. Selalu validasi permission user
 * (lihat getUserContext) sebelum melakukan operasi tulis dengan klien ini.
 */
export function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Ambil user + klaim (role, permission, store_ids) dari JWT yang dikirim
 * browser di header Authorization. Dipakai untuk otorisasi di Edge Function.
 */
export async function getUserContext(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;

  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const appMeta = data.user.app_metadata ?? {};
  return {
    id: data.user.id,
    email: data.user.email,
    roles: (appMeta.app_roles ?? []) as string[],
    permissions: (appMeta.app_permissions ?? []) as string[],
    storeIds: (appMeta.store_ids ?? []) as string[],
  };
}

export function hasRole(ctx: { roles: string[] } | null, role: string) {
  return !!ctx?.roles?.includes(role);
}

export function isFinanceRole(ctx: { roles: string[] } | null) {
  return (
    hasRole(ctx, "SuperAdmin") ||
    hasRole(ctx, "Manajer Keuangan") ||
    hasRole(ctx, "Accounting")
  );
}
