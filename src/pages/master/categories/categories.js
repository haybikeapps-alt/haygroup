import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase } from "../../../lib/supabase.js";
import { qs, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/master/categories/index.html");

const { data: stores } = await supabase.from("stores").select("id, name").eq("status", "active");
qs("#fStore").innerHTML = (stores ?? []).map((s) => `<option value="${s.id}">${s.name}</option>`).join("");

await loadCategories();

qs("#categoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = qs("#fName").value.trim();
  const storeId = qs("#fStore").value;
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36).slice(-4);

  const { error } = await supabase.from("product_categories").insert({ store_id: storeId, name, slug });
  if (error) { toast(error.message, "error"); return; }
  toast("Kategori ditambahkan.", "success");
  qs("#fName").value = "";
  await loadCategories();
});

async function loadCategories() {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name, is_active, stores(name)")
    .order("created_at", { ascending: false });
  if (error) { toast(error.message, "error"); return; }

  qs("#rows").innerHTML = (data ?? []).map((c) => `
    <tr>
      <td>${c.name}</td>
      <td>${c.stores?.name ?? "-"}</td>
      <td><span class="hg-badge ${c.is_active ? "hg-badge--green" : "hg-badge--gray"}">${c.is_active ? "Aktif" : "Nonaktif"}</span></td>
      <td><button class="hg-btn hg-btn--outline hg-btn--sm" data-toggle="${c.id}" data-active="${c.is_active}">${c.is_active ? "Nonaktifkan" : "Aktifkan"}</button></td>
    </tr>
  `).join("") || `<tr><td colspan="4">Belum ada kategori.</td></tr>`;

  document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const isActive = btn.dataset.active === "true";
      await supabase.from("product_categories").update({ is_active: !isActive }).eq("id", btn.dataset.toggle);
      await loadCategories();
    });
  });
}
