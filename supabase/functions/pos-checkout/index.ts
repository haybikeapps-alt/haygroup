// pos-checkout
// Menerima keranjang dari layar POS (3 unit usaha), memvalidasi bahwa user
// berhak menjual di store tsb (store_ids di JWT / user_stores), lalu
// memanggil RPC atomik fn_pos_checkout (transaksi + stok + auto-journal).

import { getAdminClient, getUserContext, hasRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const ctx = await getUserContext(req);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  if (!body?.store_id || !Array.isArray(body?.items) || body.items.length === 0) {
    return errorResponse("Payload tidak valid: store_id dan items wajib diisi");
  }

  const isSuperAdmin = hasRole(ctx, "SuperAdmin");
  const canSellHere = isSuperAdmin || ctx.storeIds.includes(body.store_id);
  if (!canSellHere) {
    return errorResponse("Anda tidak memiliki akses ke unit usaha ini", 403);
  }

  const admin = getAdminClient();
  const payload = { ...body, user_id: ctx.id };

  const { data, error } = await admin.rpc("fn_pos_checkout", { p_payload: payload });
  if (error) {
    console.error("pos-checkout rpc error", error);
    return errorResponse(error.message, 400);
  }

  return jsonResponse({ success: true, result: data });
});
