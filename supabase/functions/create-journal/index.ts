// create-journal — membuat jurnal manual berstatus draft (Bab 8.3)
import { getAdminClient, getUserContext, isFinanceRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await getUserContext(req);
  if (!ctx || !isFinanceRole(ctx)) return errorResponse("Anda tidak punya akses ke modul akuntansi", 403);
  // Accounting boleh create, tapi post/cancel/closing dibatasi lebih lanjut di fungsi masing-masing.

  const body = await req.json().catch(() => null);
  if (!body?.journal_date || !Array.isArray(body?.lines)) {
    return errorResponse("journal_date dan lines wajib diisi");
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("fn_create_journal", {
    p_journal_date: body.journal_date,
    p_reference: body.reference ?? null,
    p_description: body.description ?? null,
    p_source_type: "manual",
    p_source_id: null,
    p_lines: body.lines,
    p_created_by: ctx.id,
    p_auto_post: false,
  });

  if (error) return errorResponse(error.message, 400);
  return jsonResponse({ success: true, journal_id: data });
});
