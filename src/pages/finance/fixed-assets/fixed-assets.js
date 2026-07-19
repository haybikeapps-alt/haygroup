import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase, callFunction } from "../../../lib/supabase.js";
import { formatDate, formatRupiah, qs, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/fixed-assets/index.html");

const now = new Date();
qs("#depYear").value = now.getFullYear();
qs("#depMonth").value = now.getMonth() + 1;

await loadAssets();

qs("#newBtn").addEventListener("click", () => qs("#modal").showModal());
qs("#closeBtn").addEventListener("click", () => qs("#modal").close());

qs("#assetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    asset_code: qs("#fCode").value.trim(),
    name: qs("#fName").value.trim(),
    category: qs("#fCategory").value.trim() || null,
    location: qs("#fLocation").value.trim() || null,
    acquisition_date: qs("#fDate").value,
    acquisition_cost: Number(qs("#fCost").value),
    residual_value: Number(qs("#fResidual").value || 0),
    useful_life_months: Number(qs("#fLife").value),
    depreciation_method: qs("#fMethod").value,
    is_active: true,
  };
  const { error } = await supabase.from("acc_fixed_assets").insert(payload);
  if (error) { toast(error.message, "error"); return; }
  toast("Aset tetap berhasil ditambahkan.", "success");
  qs("#modal").close();
  qs("#assetForm").reset();
  await loadAssets();
});

qs("#depBtn").addEventListener("click", async () => {
  const year = Number(qs("#depYear").value);
  const month = Number(qs("#depMonth").value);
  if (!year || !month) { toast("Isi tahun dan bulan terlebih dahulu.", "error"); return; }
  if (!confirm(`Hitung & jurnal penyusutan untuk periode ${year}-${String(month).padStart(2, "0")}?`)) return;

  try {
    const res = await callFunction("generate-depreciation", { period_year: year, period_month: month });
    const done = (res.results ?? []).filter((r) => r.journal_id).length;
    const skipped = (res.results ?? []).filter((r) => r.skipped).length;
    toast(`Penyusutan selesai: ${done} jurnal dibuat, ${skipped} dilewati.`, "success");
  } catch (err) {
    toast(err.message, "error");
  }
});

async function loadAssets() {
  const { data, error } = await supabase
    .from("acc_fixed_assets")
    .select("asset_code, name, acquisition_date, acquisition_cost, useful_life_months, depreciation_method, is_active")
    .order("asset_code");
  if (error) { toast(error.message, "error"); return; }

  qs("#rows").innerHTML = (data ?? []).map((a) => `
    <tr>
      <td>${a.asset_code}</td>
      <td>${a.name}</td>
      <td>${formatDate(a.acquisition_date)}</td>
      <td>${formatRupiah(a.acquisition_cost)}</td>
      <td>${a.useful_life_months}</td>
      <td>${a.depreciation_method === "straight_line" ? "Garis Lurus" : "Saldo Menurun"}</td>
      <td><span class="hg-badge ${a.is_active ? "hg-badge--green" : "hg-badge--gray"}">${a.is_active ? "Aktif" : "Nonaktif"}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="7">Belum ada aset tetap.</td></tr>`;
}
