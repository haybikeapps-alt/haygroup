import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase } from "../../../lib/supabase.js";
import { qs, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/coa/index.html");

const TYPE_LABEL = { asset: "Aset", liability: "Liabilitas", equity: "Ekuitas", revenue: "Pendapatan", expense: "Beban" };

await loadAccounts();

qs("#newBtn").addEventListener("click", () => qs("#modal").showModal());
qs("#closeBtn").addEventListener("click", () => qs("#modal").close());
qs("#accForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    code: qs("#fCode").value.trim(),
    name: qs("#fName").value.trim(),
    account_type: qs("#fType").value,
    normal_balance: qs("#fNormal").value,
    level: 2,
  };
  const { error } = await supabase.from("acc_accounts").insert(payload);
  if (error) { toast(error.message, "error"); return; }
  toast("Akun berhasil ditambahkan.", "success");
  qs("#modal").close();
  qs("#accForm").reset();
  await loadAccounts();
});

async function loadAccounts() {
  const { data, error } = await supabase.from("acc_accounts").select("*").order("code");
  if (error) { toast(error.message, "error"); return; }

  qs("#rows").innerHTML = (data ?? []).map((a) => `
    <tr>
      <td>${a.code}</td>
      <td style="padding-left:${(a.level - 1) * 16 + 12}px">${a.name}</td>
      <td>${TYPE_LABEL[a.account_type]}</td>
      <td>${a.normal_balance === "debit" ? "Debit" : "Kredit"}</td>
      <td><span class="hg-badge ${a.is_active ? "hg-badge--green" : "hg-badge--gray"}">${a.is_active ? "Aktif" : "Nonaktif"}</span></td>
    </tr>
  `).join("");
}
