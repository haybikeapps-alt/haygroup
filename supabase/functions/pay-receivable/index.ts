// pay-receivable — catat penerimaan pembayaran piutang usaha (atomik + auto-journal)
import { getAdminClient, getUserContext, isFinanceRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await getUserContext(req);
  if (!ctx || !isFinanceRole(ctx)) return errorResponse("Anda tidak punya akses ke modul keuangan", 403);

  const body = await req.json().catch(() => null);
  if (!body?.receivable_id || !body?.amount || !body?.method) {
    return errorResponse("receivable_id, amount, dan method wajib diisi");
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("fn_pay_receivable", {
    p_receivable_id: body.receivable_id,
    p_amount: body.amount,
    p_method: body.method,
    p_user_id: ctx.id,
  });

  if (error) return errorResponse(error.message, 400);
  return jsonResponse({ success: true, result: data });
});
