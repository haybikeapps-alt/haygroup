import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase } from "../../../lib/supabase.js";
import { qs, qsa, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/master/stores/index.html");

await load();

async function load() {
  const { data, error } = await supabase.from("stores").select("*").order("name");
  if (error) { toast(error.message, "error"); return; }

  qs("#rows").innerHTML = (data ?? []).map((s) => `
    <tr>
      <td>${s.name}</td>
      <td>${s.code}</td>
      <td>${s.address ?? "-"}</td>
      <td><span class="hg-badge ${s.status === "active" ? "hg-badge--green" : "hg-badge--gray"}">${s.status}</span></td>
      <td><button class="hg-btn hg-btn--outline hg-btn--sm" data-toggle="${s.id}" data-active="${s.status === "active"}">${s.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button></td>
    </tr>
  `).join("");

  qsa("[data-toggle]").forEach((btn) => btn.addEventListener("click", async () => {
    const isActive = btn.dataset.active === "true";
    await supabase.from("stores").update({ status: isActive ? "inactive" : "active" }).eq("id", btn.dataset.toggle);
    await load();
  }));
}
