import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase } from "../../../lib/supabase.js";
import { formatRupiah, qs, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/master/products/index.html");

let stores = [];
let categories = [];

await loadStores();
await loadProducts();

qs("#storeFilter").addEventListener("change", async () => { await loadCategoriesForFilter(); await loadProducts(); });
qs("#categoryFilter").addEventListener("change", loadProducts);
qs("#newBtn").addEventListener("click", () => openModal());
qs("#closeModalBtn").addEventListener("click", () => qs("#productModal").close());
qs("#fStore").addEventListener("change", () => populateCategorySelect(qs("#fCategory"), qs("#fStore").value));
qs("#productForm").addEventListener("submit", saveProduct);

async function loadStores() {
  const { data } = await supabase.from("stores").select("id, name").eq("status", "active");
  stores = data ?? [];
  qs("#storeFilter").innerHTML = `<option value="">Semua Unit Usaha</option>` + stores.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  qs("#fStore").innerHTML = stores.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  await loadCategoriesForFilter();
  populateCategorySelect(qs("#fCategory"), qs("#fStore").value);
}

async function loadCategoriesForFilter() {
  const storeId = qs("#storeFilter").value;
  let query = supabase.from("product_categories").select("id, name, store_id").eq("is_active", true);
  if (storeId) query = query.eq("store_id", storeId);
  const { data } = await query;
  categories = data ?? [];
  qs("#categoryFilter").innerHTML = `<option value="">Semua Kategori</option>` + categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
}

function populateCategorySelect(select, storeId) {
  const filtered = categories.filter((c) => c.store_id === storeId);
  select.innerHTML = `<option value="">Tanpa Kategori</option>` + filtered.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
}

async function loadProducts() {
  let query = supabase.from("products").select("id, name, price, stock_qty, status, product_type, is_stock_tracked, store_id, product_categories(name)").order("created_at", { ascending: false });
  const storeId = qs("#storeFilter").value;
  const categoryId = qs("#categoryFilter").value;
  if (storeId) query = query.eq("store_id", storeId);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) { toast(error.message, "error"); return; }

  qs("#productRows").innerHTML = (data ?? []).map((p) => `
    <tr>
      <td>${p.name}</td>
      <td>${p.product_categories?.name ?? "-"}</td>
      <td>${p.product_type === "goods" ? "Barang" : "Jasa"}</td>
      <td>${formatRupiah(p.price)}</td>
      <td>${p.is_stock_tracked ? p.stock_qty : "-"}</td>
      <td><span class="hg-badge ${p.status === "active" ? "hg-badge--green" : "hg-badge--gray"}">${p.status}</span></td>
      <td><button class="hg-btn hg-btn--outline hg-btn--sm" data-edit="${p.id}">Ubah</button></td>
    </tr>
  `).join("") || `<tr><td colspan="7">Belum ada produk.</td></tr>`;

  document.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => openModal(btn.dataset.edit)));
}

async function openModal(productId) {
  qs("#productForm").reset();
  qs("#productId").value = productId ?? "";
  qs("#modalTitle").textContent = productId ? "Ubah Produk" : "Produk Baru";

  if (productId) {
    const { data: p } = await supabase.from("products").select("*").eq("id", productId).single();
    qs("#fStore").value = p.store_id;
    populateCategorySelect(qs("#fCategory"), p.store_id);
    qs("#fCategory").value = p.category_id ?? "";
    qs("#fName").value = p.name;
    qs("#fType").value = p.product_type;
    qs("#fTracked").value = String(p.is_stock_tracked);
    qs("#fPrice").value = p.price;
    qs("#fCost").value = p.cost_price;
    qs("#fStock").value = p.stock_qty;
  } else {
    populateCategorySelect(qs("#fCategory"), qs("#fStore").value);
  }
  qs("#productModal").showModal();
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36).slice(-4);
}

async function saveProduct(e) {
  e.preventDefault();
  const id = qs("#productId").value;
  const payload = {
    store_id: qs("#fStore").value,
    category_id: qs("#fCategory").value || null,
    name: qs("#fName").value,
    product_type: qs("#fType").value,
    is_stock_tracked: qs("#fTracked").value === "true",
    price: Number(qs("#fPrice").value),
    cost_price: Number(qs("#fCost").value || 0),
    stock_qty: Number(qs("#fStock").value || 0),
  };

  let error;
  if (id) {
    ({ error } = await supabase.from("products").update(payload).eq("id", id));
  } else {
    payload.slug = slugify(payload.name);
    ({ error } = await supabase.from("products").insert(payload));
  }

  if (error) { toast(error.message, "error"); return; }
  toast("Produk berhasil disimpan.", "success");
  qs("#productModal").close();
  await loadProducts();
}
