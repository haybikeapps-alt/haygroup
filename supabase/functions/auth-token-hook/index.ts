// auth-token-hook
// Didaftarkan sebagai "Custom Access Token Hook" di Supabase Auth (Dashboard ->
// Authentication -> Hooks -> Customize Access Token). Supabase memanggil fungsi
// ini setiap kali JWT baru diterbitkan (login / refresh token), lalu mengambil
// nilai `claims` dari respons untuk dijadikan isi token.
//
// Referensi: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
//
// Payload masuk (dari Supabase): { user_id, claims }
// Balikan wajib: { claims: {...claims lama, ...tambahan kita} }

import { getAdminClient } from "../_shared/supabaseClients.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const userId: string = payload.user_id;
    const claims = payload.claims ?? {};

    const admin = getAdminClient();

    const { data: roleRows } = await admin
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", userId);

    const roleNames = (roleRows ?? []).map((r: any) => r.roles?.name).filter(Boolean);

    let permissionNames: string[] = [];
    if (roleNames.length > 0) {
      const { data: roleIds } = await admin.from("roles").select("id").in("name", roleNames);
      const ids = (roleIds ?? []).map((r: any) => r.id);
      const { data: permRows } = await admin
        .from("role_permissions")
        .select("permissions(name)")
        .in("role_id", ids)
        .eq("can_view", true);
      permissionNames = [...new Set((permRows ?? []).map((p: any) => p.permissions?.name).filter(Boolean))];
    }

    const { data: storeRows } = await admin.from("user_stores").select("store_id").eq("user_id", userId);
    const storeIds = (storeRows ?? []).map((s: any) => s.store_id);

    claims["app_roles"] = roleNames;
    claims["app_permissions"] = permissionNames;
    claims["store_ids"] = storeIds;

    return new Response(JSON.stringify({ claims }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    // Jika gagal, kembalikan klaim asli tanpa tambahan agar login tidak macet total,
    // namun user praktis tidak akan punya akses (RLS default deny).
    console.error("auth-token-hook error", e);
    const payload = await req.clone().json().catch(() => ({ claims: {} }));
    return new Response(JSON.stringify({ claims: payload.claims ?? {} }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
