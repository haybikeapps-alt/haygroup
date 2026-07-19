import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase } from "../../../lib/supabase.js";
import { formatDate, formatRupiah, qs, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/ledger/index.html");

let accounts = [];
const { data } = await supabase.from("acc_accounts").select("id, code, name, normal_balance").order("code");
accounts = data ?? [];
qs("#accountSelect").innerHTML = accounts.map((a) => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join("");

const now = new Date();
qs("#startDate").value = `${now.getFullYear()}-01-01`;
qs("#endDate").value = now.toISOString().slice(0, 10);

qs("#loadBtn").addEventListener("click", load);

async function load() {
  const accountId = qs("#accountSelect").value;
  const account = accounts.find((a) => a.id === accountId);
  const startDate = qs("#startDate").value;
  const endDate = qs("#endDate").value;

  try {
    const { data: openingLines, error: err1 } = await supabase
      .from("acc_journal_lines")
      .select("debit, credit, acc_journals!inner(journal_date, status)")
      .eq("account_id", accountId)
      .eq("acc_journals.status", "posted")
      .lt("acc_journals.journal_date", startDate);
    if (err1) throw err1;

    const openingBalance = (openingLines ?? []).reduce((s, l) => {
      const net = account.normal_balance === "debit" ? Number(l.debit) - Number(l.credit) : Number(l.credit) - Number(l.debit);
      return s + net;
    }, 0);

    const { data: rangeLines, error: err2 } = await supabase
      .from("acc_journal_lines")
      .select("id, debit, credit, description, acc_journals!inner(journal_number, journal_date, status, description)")
      .eq("account_id", accountId)
      .eq("acc_journals.status", "posted")
      .gte("acc_journals.journal_date", startDate)
      .lte("acc_journals.journal_date", endDate)
      .order("journal_date", { foreignTable: "acc_journals" });
    if (err2) throw err2;

    let running = openingBalance;
    const rows = (rangeLines ?? []).map((l) => {
      const net = account.normal_balance === "debit" ? Number(l.debit) - Number(l.credit) : Number(l.credit) - Number(l.debit);
      running += net;
      return { ...l, running };
    });

    qs("#output").innerHTML = `
      <p class="hg-card__title">${account.code} - ${account.name}</p>
      <table class="hg-table">
        <thead><tr><th>Tanggal</th><th>No. Jurnal</th><th>Keterangan</th><th>Debit</th><th>Kredit</th><th>Saldo</th></tr></thead>
        <tbody>
          <tr><td colspan="5"><strong>Saldo Awal</strong></td><td><strong>${formatRupiah(openingBalance)}</strong></td></tr>
          ${rows.map((r) => `
            <tr>
              <td>${formatDate(r.acc_journals.journal_date)}</td>
              <td>${r.acc_journals.journal_number}</td>
              <td>${r.description || r.acc_journals.description || "-"}</td>
              <td>${Number(r.debit) > 0 ? formatRupiah(r.debit) : ""}</td>
              <td>${Number(r.credit) > 0 ? formatRupiah(r.credit) : ""}</td>
              <td>${formatRupiah(r.running)}</td>
            </tr>
          `).join("")}
          <tr><td colspan="5"><strong>Saldo Akhir</strong></td><td><strong>${formatRupiah(rows.length ? rows[rows.length - 1].running : openingBalance)}</strong></td></tr>
        </tbody>
      </table>
    `;
  } catch (err) {
    toast(err.message, "error");
  }
}
