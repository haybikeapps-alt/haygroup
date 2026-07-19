// cancel-journal — batalkan jurnal (buat jurnal pembalik jika sudah posted).
// Accounting TIDAK boleh membatalkan jurnal (Bab 4.2: "tanpa closing/hapus"),
// hanya SuperAdmin & Manajer Keuangan.
import { getAdminClient, getUserContext, hasRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await getUserContext(req);
  const allowed = hasRole(ctx, "SuperAdmin") || hasRole(ctx, "Manajer Keuangan");
  if (!ctx || !allowed) return errorResponse("Hanya SuperAdmin/Manajer Keuangan yang boleh membatalkan jurnal", 403);

  const body = await req.json().catch(() => null);
  if (!body?.journal_id) return errorResponse("journal_id wajib diisi");

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("fn_cancel_journal", {
    p_journal_id: body.journal_id,
    p_user_id: ctx.id,
    p_reason: body.reason ?? null,
  });

  if (error) return errorResponse(error.message, 400);
  return jsonResponse({ success: true, reversal_or_journal_id: data });
});
