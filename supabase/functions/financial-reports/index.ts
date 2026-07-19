// financial-reports — menghasilkan laporan keuangan sesuai SAK EMKM (Bab 8.12).
// GET /financial-reports?type=trial_balance|balance_sheet|income_statement|cash_flow|equity_changes
//     &start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
// Catatan: laporan ini konsolidasi grup. Pemisahan per unit usaha (store)
// membutuhkan pemetaan tambahan source->store dan menjadi pekerjaan lanjutan
// (roadmap M6), karena acc_journal_lines tidak menyimpan store_id langsung.

import { getAdminClient, getUserContext, isFinanceRole, hasRole } from "../_shared/supabaseClients.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await getUserContext(req);
  if (!ctx || !(isFinanceRole(ctx) || hasRole(ctx, "Auditor"))) {
    return errorResponse("Anda tidak punya akses ke laporan keuangan", 403);
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "trial_balance";
  const startDate = url.searchParams.get("start_date") ?? `${new Date().getFullYear()}-01-01`;
  const endDate = url.searchParams.get("end_date") ?? new Date().toISOString().slice(0, 10);

  const admin = getAdminClient();

  // ambil semua baris jurnal posted s.d. end_date (untuk saldo akun) & dalam rentang (untuk laba rugi)
  const { data: accounts } = await admin.from("acc_accounts").select("*").order("code");
  const { data: linesUntilEnd } = await admin
    .from("acc_journal_lines")
    .select("account_id, debit, credit, acc_journals!inner(journal_date, status)")
    .lte("acc_journals.journal_date", endDate)
    .eq("acc_journals.status", "posted");

  const { data: linesInRange } = await admin
    .from("acc_journal_lines")
    .select("account_id, debit, credit, acc_journals!inner(journal_date, status)")
    .gte("acc_journals.journal_date", startDate)
    .lte("acc_journals.journal_date", endDate)
    .eq("acc_journals.status", "posted");

  const balanceOf = (rows: any[] | null, accountId: string, normalBalance: string) => {
    const totals = (rows ?? []).filter((r) => r.account_id === accountId)
      .reduce((acc, r) => ({ debit: acc.debit + Number(r.debit), credit: acc.credit + Number(r.credit) }), { debit: 0, credit: 0 });
    const net = normalBalance === "debit" ? totals.debit - totals.credit : totals.credit - totals.debit;
    return { debit: totals.debit, credit: totals.credit, balance: net };
  };

  const accountRows = (accounts ?? []).map((a: any) => ({
    ...a,
    cumulative: balanceOf(linesUntilEnd, a.id, a.normal_balance),
    period: balanceOf(linesInRange, a.id, a.normal_balance),
  }));

  if (type === "trial_balance") {
    const rows = accountRows.map((a) => ({
      code: a.code, name: a.name, account_type: a.account_type,
      debit: a.period.debit, credit: a.period.credit,
    }));
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    return jsonResponse({ type, start_date: startDate, end_date: endDate, rows, total_debit: totalDebit, total_credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
  }

  if (type === "income_statement") {
    const revenue = accountRows.filter((a) => a.account_type === "revenue" && a.level > 1);
    const expense = accountRows.filter((a) => a.account_type === "expense" && a.level > 1);
    const totalRevenue = revenue.reduce((s, a) => s + a.period.balance, 0);
    const hpp = expense.find((a) => a.code === "5110")?.period.balance ?? 0;
    const otherExpense = expense.filter((a) => a.code !== "5110").reduce((s, a) => s + a.period.balance, 0);
    const grossProfit = totalRevenue - hpp;
    const netIncome = grossProfit - otherExpense;
    return jsonResponse({
      type, start_date: startDate, end_date: endDate,
      revenue: revenue.map((a) => ({ code: a.code, name: a.name, amount: a.period.balance })),
      expense: expense.map((a) => ({ code: a.code, name: a.name, amount: a.period.balance })),
      total_revenue: totalRevenue, hpp, gross_profit: grossProfit,
      total_other_expense: otherExpense, net_income: netIncome,
    });
  }

  if (type === "balance_sheet") {
    const assets = accountRows.filter((a) => a.account_type === "asset" && a.level > 1);
    const liabilities = accountRows.filter((a) => a.account_type === "liability" && a.level > 1);
    const equity = accountRows.filter((a) => a.account_type === "equity" && a.level > 1);
    const totalAssets = assets.reduce((s, a) => s + a.cumulative.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.cumulative.balance, 0);
    const totalEquityBase = equity.reduce((s, a) => s + a.cumulative.balance, 0);
    // laba berjalan (belum ditutup ke Laba Ditahan) ikut menambah ekuitas agar Aset = Liabilitas + Ekuitas
    const revenueAll = accountRows.filter((a) => a.account_type === "revenue").reduce((s, a) => s + a.cumulative.balance, 0);
    const expenseAll = accountRows.filter((a) => a.account_type === "expense").reduce((s, a) => s + a.cumulative.balance, 0);
    const runningNetIncome = revenueAll - expenseAll;
    const totalEquity = totalEquityBase + runningNetIncome;
    return jsonResponse({
      type, as_of: endDate,
      assets: assets.map((a) => ({ code: a.code, name: a.name, amount: a.cumulative.balance })),
      liabilities: liabilities.map((a) => ({ code: a.code, name: a.name, amount: a.cumulative.balance })),
      equity: equity.map((a) => ({ code: a.code, name: a.name, amount: a.cumulative.balance })),
      running_net_income: runningNetIncome,
      total_assets: totalAssets, total_liabilities: totalLiabilities, total_equity: totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    });
  }

  if (type === "equity_changes") {
    const equityAccounts = accountRows.filter((a) => a.account_type === "equity" && a.level > 1);
    const openingEquity = equityAccounts.reduce((s, a) => {
      const before = balanceOf(
        (linesUntilEnd ?? []).filter((r: any) => new Date(r.acc_journals.journal_date) < new Date(startDate)),
        a.id, a.normal_balance
      );
      return s + before.balance;
    }, 0);
    const netIncomePeriod = accountRows.filter((a) => a.account_type === "revenue").reduce((s, a) => s + a.period.balance, 0)
      - accountRows.filter((a) => a.account_type === "expense").reduce((s, a) => s + a.period.balance, 0);
    const prive = equityAccounts.find((a) => a.code === "3300")?.period.balance ?? 0;
    const closingEquity = openingEquity + netIncomePeriod - prive;
    return jsonResponse({ type, start_date: startDate, end_date: endDate, opening_equity: openingEquity, net_income: netIncomePeriod, prive, closing_equity: closingEquity });
  }

  if (type === "cash_flow") {
    // metode langsung sederhana: kelompokkan mutasi akun Kas (1100) & Bank (1110) berdasarkan source_type jurnal
    const { data: cashLines } = await admin
      .from("acc_journal_lines")
      .select("debit, credit, acc_journals!inner(journal_date, status, source_type)")
      .in("account_id", (accounts ?? []).filter((a: any) => ["1100", "1110"].includes(a.code)).map((a: any) => a.id))
      .gte("acc_journals.journal_date", startDate)
      .lte("acc_journals.journal_date", endDate)
      .eq("acc_journals.status", "posted");

    let operating = 0, investing = 0, financing = 0;
    for (const l of cashLines ?? []) {
      const net = Number(l.debit) - Number(l.credit);
      const sourceType = (l as any).acc_journals.source_type as string;
      if (sourceType === "depreciation") continue; // non-kas
      if (sourceType?.startsWith("fixed_asset")) investing += net;
      else if (sourceType === "equity" || sourceType === "prive") financing += net;
      else operating += net;
    }
    const netChange = operating + investing + financing;
    return jsonResponse({ type, start_date: startDate, end_date: endDate, operating, investing, financing, net_change_in_cash: netChange });
  }

  return errorResponse("type tidak dikenal. Gunakan: trial_balance | income_statement | balance_sheet | equity_changes | cash_flow");
});
