// create-user — membuat akun baru (auth.users + profiles) via Admin API.
// Hanya SuperAdmin/Administrator. Password awal wajib diganti di login pertama.
import { getAdminClient, getUserContext, hasRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

const DEFAULT_PASSWORD = "Haygroup#2026";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await getUserContext(req);
  const allowed = hasRole(ctx, "SuperAdmin") || hasRole(ctx, "Administrator");
  if (!ctx || !allowed) return errorResponse("Hanya SuperAdmin/Administrator yang boleh membuat akun baru", 403);

  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.name || !body?.role_id) {
    return errorResponse("email, name, dan role_id wajib diisi");
  }

  const admin = getAdminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password || DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { name: body.name },
  });
  if (createErr) return errorResponse(createErr.message, 400);

  const userId = created.user.id;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId, name: body.name, email: body.email, status: "active", must_change_password: true,
  });
  if (profileErr) return errorResponse(profileErr.message, 400);

  await admin.from("user_roles").insert({ user_id: userId, role_id: body.role_id });

  if (Array.isArray(body.store_ids) && body.store_ids.length > 0) {
    await admin.from("user_stores").insert(body.store_ids.map((sid: string) => ({ user_id: userId, store_id: sid })));
  }

  return jsonResponse({ success: true, user_id: userId, temp_password: body.password || DEFAULT_PASSWORD });
});
