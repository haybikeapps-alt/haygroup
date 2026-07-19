// auto-journal
// Dipanggil manual dari tombol "Sinkronkan Jurnal" (Bab 8.6) untuk menjurnal
// invoice/cashflow lama yang belum punya jurnal. Hanya boleh dijalankan
// oleh peran keuangan.

import { getAdminClient, getUserContext, isFinanceRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await getUserContext(req);
  if (!ctx || !isFinanceRole(ctx)) return errorResponse("Hanya peran keuangan yang boleh menjalankan sinkronisasi jurnal", 403);

  const admin = getAdminClient();
  const results: Record<string, unknown>[] = [];

  // invoice completed yang belum ada jurnal 'invoice'
  const { data: journaledInvoices } = await admin
    .from("acc_journals")
    .select("source_id")
    .eq("source_type", "invoice");
  const journaledIds = new Set((journaledInvoices ?? []).map((j: any) => j.source_id));

  const { data: allInvoices } = await admin
    .from("invoices")
    .select("id, invoice_number")
    .eq("status", "completed");
  const invoices = (allInvoices ?? []).filter((i: any) => !journaledIds.has(i.id));

  for (const inv of invoices) {
    const { data, error } = await admin.rpc("fn_auto_journal_invoice", {
      p_invoice_id: inv.id,
      p_user_id: ctx.id,
    });
    results.push({ invoice_number: inv.invoice_number, journal_id: data, error: error?.message });
  }

  // cashflow yang belum ada journal_id
  const { data: cashflows } = await admin.from("cashflows").select("id").is("journal_id", null);
  for (const cf of cashflows ?? []) {
    const { data, error } = await admin.rpc("fn_auto_journal_cashflow", {
      p_cashflow_id: cf.id,
      p_user_id: ctx.id,
    });
    results.push({ cashflow_id: cf.id, journal_id: data, error: error?.message });
  }

  return jsonResponse({ success: true, synced: results.length, results });
});
