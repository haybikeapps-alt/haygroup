// reopen-period — buka kembali periode yang sudah ditutup. Hanya SuperAdmin (Bab 8.11).
import { getAdminClient, getUserContext, hasRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await getUserContext(req);
  if (!ctx || !hasRole(ctx, "SuperAdmin")) return errorResponse("Hanya SuperAdmin yang boleh membuka kembali periode", 403);

  const body = await req.json().catch(() => null);
  if (!body?.period_year || !body?.period_month) {
    return errorResponse("period_year dan period_month wajib diisi");
  }

  const admin = getAdminClient();
  const { error } = await admin.rpc("fn_reopen_period", {
    p_year: body.period_year,
    p_month: body.period_month,
    p_user_id: ctx.id,
  });

  if (error) return errorResponse(error.message, 400);
  return jsonResponse({ success: true });
});
