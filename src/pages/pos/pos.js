import { requireAuth } from "../../lib/auth.js";
import { renderSidebar } from "../../components/sidebar.js";
import { supabase, callFunction } from "../../lib/supabase.js";
import { myStoreIds } from "../../lib/rbac.js";
import { formatRupiah, qs, qsa, toast } from "../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/pos/index.html");

let currentStoreId = null;
let categories = [];
let products = [];
let activeCategory = "all";
/** cart item: { key, product_id, variant_id, name, category, price, qty, discount, addons:[{addon_id,name,price}], note } */
let cart = [];

await initStoreSelect();
qs("#storeSelect").addEventListener("change", async (e) => {
  currentStoreId = e.target.value;
  cart = [];
  renderCart();
  await loadCatalog();
});
qs("#paymentMethod").addEventListener("change", updatePaymentUiState);
qs("#checkoutBtn").addEventListener("click", checkout);
updatePaymentUiState();

async function initStoreSelect() {
  const storeIds = await myStoreIds();
  let query = supabase.from("stores").select("id, name").eq("status", "active");
  const claims = await import("../../lib/rbac.js").then((m) => m.getClaims());
  if (!claims.app_roles.includes("SuperAdmin") && storeIds.length > 0) {
    query = query.in("id", storeIds);
  }
  const { data: stores } = await query;
  const select = qs("#storeSelect");
  select.innerHTML = (stores ?? []).map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  currentStoreId = stores?.[0]?.id ?? null;
  await loadCatalog();
}

async function loadCatalog() {
  if (!currentStoreId) return;
  const { data: cats } = await supabase
    .from("product_categories")
    .select("id, name")
    .eq("store_id", currentStoreId)
    .eq("is_active", true)
    .order("sort_order");
  categories = cats ?? [];

  const { data: prods } = await supabase
    .from("products")
    .select("id, name, price, cost_price, product_type, category_id, is_stock_tracked, stock_qty, product_categories(name), product_varians(id,name,price), addons(id,name,price)")
    .eq("store_id", currentStoreId)
    .eq("status", "active");
  products = prods ?? [];

  activeCategory = "all";
  renderTabs();
  renderProducts();
}

function renderTabs() {
  const tabs = [{ id: "all", name: "Semua" }, ...categories];
  qs("#categoryTabs").innerHTML = tabs.map((c) =>
    `<button class="hg-pos__tab ${c.id === activeCategory ? "active" : ""}" data-cat="${c.id}">${c.name}</button>`
  ).join("");
  qsa(".hg-pos__tab").forEach((btn) => btn.addEventListener("click", () => {
    activeCategory = btn.dataset.cat;
    renderTabs();
    renderProducts();
  }));
}

function renderProducts() {
  const list = activeCategory === "all" ? products : products.filter((p) => p.category_id === activeCategory);
  const grid = qs("#productGrid");
  if (list.length === 0) {
    grid.innerHTML = `<p style="color:#94a3b8">Belum ada produk di kategori ini.</p>`;
    return;
  }
  grid.innerHTML = list.map((p) => `
    <button class="hg-product-card" data-id="${p.id}">
      <div class="hg-product-card__name">${p.name}</div>
      <div class="hg-product-card__price">${formatRupiah(p.price)}</div>
      ${p.is_stock_tracked ? `<div style="font-size:.72rem;color:#94a3b8">Stok: ${p.stock_qty}</div>` : ""}
    </button>
  `).join("");
  qsa(".hg-product-card").forEach((el) => el.addEventListener("click", () => addToCart(el.dataset.id)));
}

function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  if (product.is_stock_tracked && product.stock_qty <= 0) {
    toast("Stok produk ini habis.", "error");
    return;
  }

  const key = `${product.id}`;
  const existing = cart.find((c) => c.key === key);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      key, product_id: product.id, variant_id: null,
      name: product.name, category: product.product_categories?.name ?? null,
      price: Number(product.price), cost_price: Number(product.cost_price),
      qty: 1, discount: 0, addons: [], note: "",
    });
  }
  renderCart();
}

function renderCart() {
  const container = qs("#cartItems");
  if (cart.length === 0) {
    container.innerHTML = `<p style="color:#94a3b8; font-size:.85rem; padding:0 14px">Belum ada item.</p>`;
  } else {
    container.innerHTML = cart.map((item, idx) => {
      const addonTotal = item.addons.reduce((s, a) => s + a.price, 0);
      const lineTotal = (item.price + addonTotal) * item.qty - item.discount;
      return `
        <div class="hg-cart__item" style="flex-direction:column; align-items:stretch; gap:4px">
          <div style="display:flex; justify-content:space-between">
            <strong>${item.name}</strong>
            <button data-remove="${idx}" style="border:none;background:none;color:#dc2626;cursor:pointer">✕</button>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center">
            <div>
              <button data-dec="${idx}" class="hg-btn hg-btn--outline hg-btn--sm">-</button>
              <span style="margin:0 8px">${item.qty}</span>
              <button data-inc="${idx}" class="hg-btn hg-btn--outline hg-btn--sm">+</button>
            </div>
            <span>${formatRupiah(lineTotal)}</span>
          </div>
        </div>
      `;
    }).join("");

    qsa("[data-inc]").forEach((b) => b.addEventListener("click", () => { cart[b.dataset.inc].qty += 1; renderCart(); }));
    qsa("[data-dec]").forEach((b) => b.addEventListener("click", () => {
      const i = b.dataset.dec;
      cart[i].qty -= 1;
      if (cart[i].qty <= 0) cart.splice(i, 1);
      renderCart();
    }));
    qsa("[data-remove]").forEach((b) => b.addEventListener("click", () => { cart.splice(b.dataset.remove, 1); renderCart(); }));
  }
  updateSummary();
}

function computeTotals() {
  const subtotal = cart.reduce((s, i) => {
    const addonTotal = i.addons.reduce((a, x) => a + x.price, 0);
    return s + (i.price + addonTotal) * i.qty - i.discount;
  }, 0);
  const discount = 0;
  const tax = 0; // sesuai pos_settings jika ingin diaktifkan
  const serviceCharge = 0;
  const total = subtotal - discount + tax + serviceCharge;
  return { subtotal, discount, tax, serviceCharge, total };
}

function updateSummary() {
  const { subtotal, discount, tax, total } = computeTotals();
  qs("#sumSubtotal").textContent = formatRupiah(subtotal);
  qs("#sumDiscount").textContent = formatRupiah(discount);
  qs("#sumTax").textContent = formatRupiah(tax);
  qs("#sumTotal").textContent = formatRupiah(total);
}

function updatePaymentUiState() {
  const method = qs("#paymentMethod").value;
  qs("#cashPaidWrap").style.display = method === "cash" ? "block" : "none";
}

async function checkout() {
  if (cart.length === 0) {
    toast("Keranjang masih kosong.", "error");
    return;
  }
  const { subtotal, discount, tax, serviceCharge, total } = computeTotals();
  const method = qs("#paymentMethod").value;
  const btn = qs("#checkoutBtn");
  btn.disabled = true;
  btn.textContent = "Memproses...";

  try {
    const payload = {
      store_id: currentStoreId,
      order_type: qs("#orderType").value,
      discount, tax, service_charge: serviceCharge,
      items: cart.map((i) => ({
        product_id: i.product_id, variant_id: i.variant_id, name: i.name, category: i.category,
        qty: i.qty, price: i.price, cost_price: i.cost_price, discount: i.discount, note: i.note,
        addons: i.addons.map((a) => ({ addon_id: a.addon_id, name: a.name, price: a.price })),
      })),
      payments: [],
    };

    if (method === "cash") {
      const paid = Number(qs("#cashPaid").value || 0);
      if (paid < total) {
        toast("Uang diterima kurang dari total.", "error");
        btn.disabled = false; btn.textContent = "Bayar & Selesaikan";
        return;
      }
      payload.payments.push({ method: "cash", amount: paid });
    } else {
      // transfer manual dicatat langsung lunas; QRIS via Xendit dibuat setelah invoice ada
      payload.payments.push({ method: method === "qris" ? "xendit" : "transfer", amount: total });
    }

    const res = await callFunction("pos-checkout", payload);
    const result = res.result;

    if (method === "qris") {
      const xenditRes = await callFunction("payment-xendit", { invoice_id: result.invoice_id, amount: total });
      toast(`Invoice ${result.invoice_number} dibuat. Membuka link pembayaran QRIS...`, "success");
      window.open(xenditRes.xendit_invoice_url, "_blank");
    } else {
      toast(`Invoice ${result.invoice_number} berhasil diselesaikan.`, "success");
    }

    cart = [];
    renderCart();
    qs("#cashPaid").value = "";
    await loadCatalog(); // refresh stok
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Bayar & Selesaikan";
  }
}
