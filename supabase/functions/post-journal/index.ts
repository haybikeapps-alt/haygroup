// post-journal — posting jurnal draft menjadi posted (masuk buku besar)
import { getAdminClient, getUserContext, isFinanceRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await getUserContext(req);
  if (!ctx || !isFinanceRole(ctx)) return errorResponse("Anda tidak punya akses ke modul akuntansi", 403);

  const body = await req.json().catch(() => null);
  if (!body?.journal_id) return errorResponse("journal_id wajib diisi");

  const admin = getAdminClient();
  const { error } = await admin.rpc("fn_post_journal", {
    p_journal_id: body.journal_id,
    p_user_id: ctx.id,
  });

  if (error) return errorResponse(error.message, 400);
  return jsonResponse({ success: true });
});
