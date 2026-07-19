// generate-depreciation — hitung penyusutan seluruh aset aktif untuk satu
// periode (year, month) dan buat jurnal: Dr 5500 Beban Penyusutan / Cr 1600
// Akumulasi Penyusutan (Bab 8.9).
import { getAdminClient, getUserContext, isFinanceRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ctx = await getUserContext(req);
  if (!ctx || !isFinanceRole(ctx)) return errorResponse("Anda tidak punya akses ke modul akuntansi", 403);

  const body = await req.json().catch(() => null);
  const year = body?.period_year;
  const month = body?.period_month;
  if (!year || !month) return errorResponse("period_year dan period_month wajib diisi");

  const admin = getAdminClient();
  const { data: assets, error: assetsErr } = await admin
    .from("acc_fixed_assets")
    .select("*")
    .eq("is_active", true);
  if (assetsErr) return errorResponse(assetsErr.message, 400);

  const { data: expenseAccount } = await admin.from("acc_accounts").select("id").eq("code", "5500").single();
  const { data: accumAccount } = await admin.from("acc_accounts").select("id").eq("code", "1600").single();

  const results: Record<string, unknown>[] = [];
  const journalDate = `${year}-${String(month).padStart(2, "0")}-01`;

  for (const asset of assets ?? []) {
    // cek apakah sudah pernah digenerate untuk periode ini
    const { data: existing } = await admin
      .from("acc_fixed_asset_depreciations")
      .select("id")
      .eq("fixed_asset_id", asset.id)
      .eq("period_year", year)
      .eq("period_month", month)
      .maybeSingle();
    if (existing) {
      results.push({ asset: asset.name, skipped: "sudah digenerate" });
      continue;
    }

    const { data: priorRows } = await admin
      .from("acc_fixed_asset_depreciations")
      .select("accumulated_depreciation")
      .eq("fixed_asset_id", asset.id)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(1);
    const priorAccum = priorRows?.[0]?.accumulated_depreciation ?? 0;

    const depreciableBase = asset.acquisition_cost - asset.residual_value;
    let monthlyDepreciation = 0;

    if (asset.depreciation_method === "straight_line") {
      monthlyDepreciation = depreciableBase / asset.useful_life_months;
    } else {
      // declining balance sederhana: 2x rate garis lurus atas nilai buku berjalan
      const rate = (2 / asset.useful_life_months);
      const bookValueBefore = asset.acquisition_cost - priorAccum;
      monthlyDepreciation = Math.max(bookValueBefore - asset.residual_value, 0) * rate;
    }

    const remainingBase = depreciableBase - priorAccum;
    monthlyDepreciation = Math.min(monthlyDepreciation, Math.max(remainingBase, 0));
    if (monthlyDepreciation <= 0) {
      results.push({ asset: asset.name, skipped: "sudah disusutkan penuh" });
      continue;
    }

    const newAccum = priorAccum + monthlyDepreciation;
    const bookValue = asset.acquisition_cost - newAccum;

    const { data: journalId, error: journalErr } = await admin.rpc("fn_create_journal", {
      p_journal_date: journalDate,
      p_reference: asset.asset_code,
      p_description: `Penyusutan ${asset.name} periode ${year}-${month}`,
      p_source_type: `depreciation:${year}-${String(month).padStart(2, "0")}`,
      p_source_id: asset.id,
      p_lines: [
        { account_id: expenseAccount?.id, description: `Beban penyusutan ${asset.name}`, debit: monthlyDepreciation, credit: 0 },
        { account_id: accumAccount?.id, description: `Akumulasi penyusutan ${asset.name}`, debit: 0, credit: monthlyDepreciation },
      ],
      p_created_by: ctx.id,
      p_auto_post: true,
    });

    if (journalErr) {
      results.push({ asset: asset.name, error: journalErr.message });
      continue;
    }

    await admin.from("acc_fixed_asset_depreciations").insert({
      fixed_asset_id: asset.id,
      period_year: year,
      period_month: month,
      depreciation_amount: monthlyDepreciation,
      accumulated_depreciation: newAccum,
      book_value: bookValue,
      journal_id: journalId,
    });

    results.push({ asset: asset.name, depreciation_amount: monthlyDepreciation, book_value: bookValue, journal_id: journalId });
  }

  return jsonResponse({ success: true, period: `${year}-${month}`, results });
});
