// close-period — tutup buku bulanan (Bab 8.11). Hanya SuperAdmin / Manajer Keuangan.
import { getAdminClient, getUserContext, hasRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await getUserContext(req);
  const allowed = hasRole(ctx, "SuperAdmin") || hasRole(ctx, "Manajer Keuangan");
  if (!ctx || !allowed) return errorResponse("Hanya SuperAdmin/Manajer Keuangan yang boleh menutup buku", 403);

  const body = await req.json().catch(() => null);
  if (!body?.period_year || !body?.period_month) {
    return errorResponse("period_year dan period_month wajib diisi");
  }

  const admin = getAdminClient();

  // validasi: pastikan tidak ada jurnal draft tersisa di periode ini
  const { data: period } = await admin
    .from("acc_periods")
    .select("id")
    .eq("period_year", body.period_year)
    .eq("period_month", body.period_month)
    .maybeSingle();

  if (period) {
    const { count } = await admin
      .from("acc_journals")
      .select("id", { count: "exact", head: true })
      .eq("period_id", period.id)
      .eq("status", "draft");
    if (count && count > 0) {
      return errorResponse(`Masih ada ${count} jurnal draft di periode ini. Posting atau batalkan dahulu sebelum tutup buku.`, 400);
    }
  }

  const { data, error } = await admin.rpc("fn_close_period", {
    p_year: body.period_year,
    p_month: body.period_month,
    p_user_id: ctx.id,
    p_notes: body.notes ?? null,
  });

  if (error) return errorResponse(error.message, 400);
  return jsonResponse({ success: true, closing_id: data });
});
