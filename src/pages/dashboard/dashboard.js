import { requireAuth } from "../../lib/auth.js";
import { renderSidebar } from "../../components/sidebar.js";
import { supabase } from "../../lib/supabase.js";
import { formatRupiah, qs } from "../../lib/utils.js";

const auth = await requireAuth();
if (auth) {
  qs("#userInfo").textContent = `${auth.profile?.name ?? ""} · ${auth.session.user.email}`;
  await renderSidebar(qs("#sidebar"), "/src/pages/dashboard/index.html");
  await loadStats();
}

async function loadStats() {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const { data: invoicesToday } = await supabase
    .from("invoices")
    .select("id, total, store_id, status")
    .eq("status", "completed")
    .gte("created_at", todayStart.toISOString());

  const totalSales = (invoicesToday ?? []).reduce((s, i) => s + Number(i.total), 0);
  qs("#statSalesToday").textContent = formatRupiah(totalSales);
  qs("#statInvoicesToday").textContent = (invoicesToday ?? []).length;

  const { data: receivables } = await supabase
    .from("acc_receivables")
    .select("total_amount, paid_amount")
    .in("status", ["open", "partial", "overdue"]);
  const openReceivable = (receivables ?? []).reduce((s, r) => s + (Number(r.total_amount) - Number(r.paid_amount)), 0);
  qs("#statReceivable").textContent = formatRupiah(openReceivable);

  // estimasi saldo kas: total debit-kredit akun 1100 dari jurnal posted (butuh akses finance; abaikan jika RLS menolak)
  const { data: cashLines } = await supabase
    .from("acc_journal_lines")
    .select("debit, credit, acc_accounts!inner(code), acc_journals!inner(status)")
    .eq("acc_accounts.code", "1100")
    .eq("acc_journals.status", "posted");
  if (cashLines) {
    const balance = cashLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    qs("#statCash").textContent = formatRupiah(balance);
  } else {
    qs("#statCash").textContent = "—";
  }

  const { data: stores } = await supabase.from("stores").select("id, name");
  const rows = (stores ?? []).map((s) => {
    const storeInvoices = (invoicesToday ?? []).filter((i) => i.store_id === s.id);
    const total = storeInvoices.reduce((sum, i) => sum + Number(i.total), 0);
    return `<tr><td>${s.name}</td><td>${storeInvoices.length}</td><td>${formatRupiah(total)}</td></tr>`;
  });
  qs("#storeTable tbody").innerHTML = rows.join("") || `<tr><td colspan="3">Belum ada data.</td></tr>`;
}
