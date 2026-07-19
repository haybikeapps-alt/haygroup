import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../../lib/supabase.js";
import { formatRupiah, qs, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/reports/index.html");

const now = new Date();
qs("#startDate").value = `${now.getFullYear()}-01-01`;
qs("#endDate").value = now.toISOString().slice(0, 10);

qs("#generateBtn").addEventListener("click", generateReport);

async function generateReport() {
  const type = qs("#reportType").value;
  const startDate = qs("#startDate").value;
  const endDate = qs("#endDate").value;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const url = `${SUPABASE_URL}/functions/v1/financial-reports?type=${type}&start_date=${startDate}&end_date=${endDate}`;
  qs("#reportOutput").innerHTML = "<p>Memuat laporan...</p>";

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memuat laporan");
    renderReport(type, data);
  } catch (err) {
    toast(err.message, "error");
    qs("#reportOutput").innerHTML = `<p style="color:#dc2626">${err.message}</p>`;
  }
}

function renderReport(type, data) {
  const out = qs("#reportOutput");

  if (type === "income_statement") {
    out.innerHTML = `
      <p class="hg-card__title">Laporan Laba Rugi (${data.start_date} s.d. ${data.end_date})</p>
      <table class="hg-table">
        <tr><th colspan="2">Pendapatan</th></tr>
        ${data.revenue.map((r) => `<tr><td>${r.name}</td><td>${formatRupiah(r.amount)}</td></tr>`).join("")}
        <tr><td><strong>Total Pendapatan</strong></td><td><strong>${formatRupiah(data.total_revenue)}</strong></td></tr>
        <tr><td>Harga Pokok Penjualan</td><td>${formatRupiah(data.hpp)}</td></tr>
        <tr><td><strong>Laba Kotor</strong></td><td><strong>${formatRupiah(data.gross_profit)}</strong></td></tr>
        <tr><th colspan="2">Beban</th></tr>
        ${data.expense.filter(e=>e.name!=='Harga Pokok Penjualan (HPP)').map((r) => `<tr><td>${r.name}</td><td>${formatRupiah(r.amount)}</td></tr>`).join("")}
        <tr><td><strong>Laba Bersih</strong></td><td><strong>${formatRupiah(data.net_income)}</strong></td></tr>
      </table>`;
  } else if (type === "balance_sheet") {
    out.innerHTML = `
      <p class="hg-card__title">Neraca per ${data.as_of}</p>
      <div class="hg-grid-2">
        <div>
          <h4>Aset</h4>
          <table class="hg-table">${data.assets.map((a) => `<tr><td>${a.name}</td><td>${formatRupiah(a.amount)}</td></tr>`).join("")}
          <tr><td><strong>Total Aset</strong></td><td><strong>${formatRupiah(data.total_assets)}</strong></td></tr></table>
        </div>
        <div>
          <h4>Liabilitas & Ekuitas</h4>
          <table class="hg-table">
            ${data.liabilities.map((a) => `<tr><td>${a.name}</td><td>${formatRupiah(a.amount)}</td></tr>`).join("")}
            <tr><td><strong>Total Liabilitas</strong></td><td><strong>${formatRupiah(data.total_liabilities)}</strong></td></tr>
            ${data.equity.map((a) => `<tr><td>${a.name}</td><td>${formatRupiah(a.amount)}</td></tr>`).join("")}
            <tr><td>Laba Berjalan</td><td>${formatRupiah(data.running_net_income)}</td></tr>
            <tr><td><strong>Total Ekuitas</strong></td><td><strong>${formatRupiah(data.total_equity)}</strong></td></tr>
          </table>
        </div>
      </div>
      <p style="margin-top:10px">${data.balanced ? '<span style="color:#16a34a">✓ Neraca seimbang</span>' : '<span style="color:#dc2626">✗ Neraca TIDAK seimbang, periksa jurnal</span>'}</p>`;
  } else if (type === "equity_changes") {
    out.innerHTML = `
      <p class="hg-card__title">Laporan Perubahan Ekuitas</p>
      <table class="hg-table">
        <tr><td>Ekuitas Awal</td><td>${formatRupiah(data.opening_equity)}</td></tr>
        <tr><td>Laba Bersih Periode</td><td>${formatRupiah(data.net_income)}</td></tr>
        <tr><td>Prive</td><td>(${formatRupiah(data.prive)})</td></tr>
        <tr><td><strong>Ekuitas Akhir</strong></td><td><strong>${formatRupiah(data.closing_equity)}</strong></td></tr>
      </table>`;
  } else if (type === "cash_flow") {
    out.innerHTML = `
      <p class="hg-card__title">Laporan Arus Kas (${data.start_date} s.d. ${data.end_date})</p>
      <table class="hg-table">
        <tr><td>Aktivitas Operasi</td><td>${formatRupiah(data.operating)}</td></tr>
        <tr><td>Aktivitas Investasi</td><td>${formatRupiah(data.investing)}</td></tr>
        <tr><td>Aktivitas Pendanaan</td><td>${formatRupiah(data.financing)}</td></tr>
        <tr><td><strong>Kenaikan (Penurunan) Kas Bersih</strong></td><td><strong>${formatRupiah(data.net_change_in_cash)}</strong></td></tr>
      </table>
      <p style="color:#94a3b8; font-size:.8rem; margin-top:8px">Catatan: klasifikasi arus kas saat ini disederhanakan berdasarkan jenis sumber transaksi.</p>`;
  }
}
