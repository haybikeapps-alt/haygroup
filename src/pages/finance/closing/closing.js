import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase, callFunction } from "../../../lib/supabase.js";
import { isSuperAdmin } from "../../../lib/rbac.js";
import { qs, qsa, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/closing/index.html");

const canReopen = await isSuperAdmin();

const now = new Date();
qs("#year").value = now.getFullYear();
qs("#month").value = now.getMonth() + 1;

await loadPeriods();

qs("#closeBtn").addEventListener("click", async () => {
  const year = Number(qs("#year").value);
  const month = Number(qs("#month").value);
  if (!year || !month) { toast("Isi tahun dan bulan.", "error"); return; }
  if (!confirm(`Tutup buku periode ${year}-${String(month).padStart(2, "0")}? Tindakan ini akan mengunci seluruh jurnal periode tersebut.`)) return;

  try {
    await callFunction("close-period", { period_year: year, period_month: month });
    toast("Periode berhasil ditutup.", "success");
    await loadPeriods();
  } catch (err) {
    toast(err.message, "error");
  }
});

async function loadPeriods() {
  const { data, error } = await supabase
    .from("acc_periods")
    .select("period_year, period_month, start_date, end_date, status")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
  if (error) { toast(error.message, "error"); return; }

  qs("#rows").innerHTML = (data ?? []).map((p) => `
    <tr>
      <td>${p.period_year}-${String(p.period_month).padStart(2, "0")}</td>
      <td>${p.start_date} s/d ${p.end_date}</td>
      <td><span class="hg-badge ${p.status === "closed" ? "hg-badge--gray" : "hg-badge--green"}">${p.status === "closed" ? "Ditutup" : "Terbuka"}</span></td>
      <td>${p.status === "closed" && canReopen ? `<button class="hg-btn hg-btn--outline hg-btn--sm" data-reopen="${p.period_year}-${p.period_month}">Buka Kembali</button>` : ""}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">Belum ada periode yang tercatat.</td></tr>`;

  qsa("[data-reopen]").forEach((btn) => btn.addEventListener("click", async () => {
    const [year, month] = btn.dataset.reopen.split("-").map(Number);
    if (!confirm(`Buka kembali periode ${year}-${String(month).padStart(2, "0")}?`)) return;
    try {
      await callFunction("reopen-period", { period_year: year, period_month: month });
      toast("Periode berhasil dibuka kembali.", "success");
      await loadPeriods();
    } catch (err) {
      toast(err.message, "error");
    }
  }));
}
