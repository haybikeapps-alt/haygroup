// payment-xendit — membuat invoice pembayaran via Xendit dan menerima callback.
// Secret key Xendit HANYA ada di sini (environment variable), tidak pernah di browser.
//
// POST /payment-xendit                -> body: { action: "create", invoice_id, amount, payer_email? }
// POST /payment-xendit/webhook        -> dipanggil Xendit (callback), body: payload Xendit standar

import { getAdminClient, getUserContext } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY") ?? "";
const XENDIT_CALLBACK_TOKEN = Deno.env.get("XENDIT_CALLBACK_TOKEN") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const admin = getAdminClient();

  // ---- Webhook dari Xendit (tidak pakai JWT user, pakai token callback) ----
  if (url.pathname.endsWith("/webhook")) {
    const callbackToken = req.headers.get("x-callback-token");
    if (!XENDIT_CALLBACK_TOKEN || callbackToken !== XENDIT_CALLBACK_TOKEN) {
      return errorResponse("Invalid callback token", 401);
    }
    const payload = await req.json().catch(() => null);
    if (!payload?.external_id) return errorResponse("Payload webhook tidak valid");

    const invoiceId = payload.external_id; // dipakai sebagai invoice_id kita
    const isPaid = payload.status === "PAID" || payload.status === "SETTLED";

    if (isPaid) {
      await admin.from("payments")
        .update({ status: "paid", reference: payload.id, paid_at: new Date().toISOString() })
        .eq("invoice_id", invoiceId).eq("method", "xendit");

      const { data: inv } = await admin.from("invoices").select("total").eq("id", invoiceId).single();
      if (inv) {
        await admin.from("invoices").update({
          status: "completed", paid_amount: inv.total, completed_at: new Date().toISOString(),
        }).eq("id", invoiceId);

        const { data: invoiceRow } = await admin.from("invoices").select("user_id").eq("id", invoiceId).single();
        await admin.rpc("fn_auto_journal_invoice", { p_invoice_id: invoiceId, p_user_id: invoiceRow?.user_id });
      }
    } else {
      await admin.from("payments").update({ status: "failed" }).eq("invoice_id", invoiceId).eq("method", "xendit");
    }

    return jsonResponse({ received: true });
  }

  // ---- Membuat invoice Xendit (dipanggil dari layar POS saat pilih QRIS/transfer) ----
  const ctx = await getUserContext(req);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  if (!body?.invoice_id || !body?.amount) return errorResponse("invoice_id dan amount wajib diisi");

  if (!XENDIT_SECRET_KEY) {
    return errorResponse("XENDIT_SECRET_KEY belum diatur di environment Edge Function", 500);
  }

  const xenditRes = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa(`${XENDIT_SECRET_KEY}:`),
    },
    body: JSON.stringify({
      external_id: body.invoice_id,
      amount: body.amount,
      payer_email: body.payer_email ?? undefined,
      description: `Pembayaran HayGroup - ${body.invoice_id}`,
      currency: "IDR",
    }),
  });

  const xenditData = await xenditRes.json();
  if (!xenditRes.ok) {
    return errorResponse(xenditData?.message ?? "Gagal membuat invoice Xendit", 400);
  }

  await admin.from("payments").insert({
    invoice_id: body.invoice_id,
    method: "xendit",
    amount: body.amount,
    status: "pending",
    reference: xenditData.id,
  });

  return jsonResponse({ success: true, xendit_invoice_url: xenditData.invoice_url, xendit_id: xenditData.id });
});
