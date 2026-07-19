import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../../lib/supabase.js";
import { formatRupiah, qs, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/trial-balance/index.html");

const now = new Date();
qs("#startDate").value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
qs("#endDate").value = now.toISOString().slice(0, 10);

qs("#loadBtn").addEventListener("click", load);

async function load() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const url = `${SUPABASE_URL}/functions/v1/financial-reports?type=trial_balance&start_date=${qs("#startDate").value}&end_date=${qs("#endDate").value}`;

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    qs("#output").innerHTML = `
      <table class="hg-table">
        <thead><tr><th>Kode</th><th>Nama Akun</th><th>Debit</th><th>Kredit</th></tr></thead>
        <tbody>
          ${data.rows.filter(r => r.debit > 0 || r.credit > 0).map((r) => `<tr><td>${r.code}</td><td>${r.name}</td><td>${formatRupiah(r.debit)}</td><td>${formatRupiah(r.credit)}</td></tr>`).join("")}
          <tr><td colspan="2"><strong>Total</strong></td><td><strong>${formatRupiah(data.total_debit)}</strong></td><td><strong>${formatRupiah(data.total_credit)}</strong></td></tr>
        </tbody>
      </table>
      <p style="margin-top:10px">${data.balanced ? '<span style="color:#16a34a">✓ Seimbang</span>' : '<span style="color:#dc2626">✗ Tidak seimbang</span>'}</p>
    `;
  } catch (err) {
    toast(err.message, "error");
  }
}
