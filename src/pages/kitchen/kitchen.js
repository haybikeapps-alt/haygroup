import { requireAuth } from "../../lib/auth.js";
import { renderSidebar } from "../../components/sidebar.js";
import { supabase } from "../../lib/supabase.js";
import { subscribeKitchen } from "../../lib/realtime.js";
import { qs, qsa } from "../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/kitchen/index.html");

let currentStoreId = null;
let unsubscribe = null;

const { data: stores } = await supabase.from("stores").select("id, name").eq("code", "HAYPOP");
qs("#storeSelect").innerHTML = (stores ?? []).map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
currentStoreId = stores?.[0]?.id ?? null;

qs("#storeSelect").addEventListener("change", (e) => {
  currentStoreId = e.target.value;
  loadBoard();
  attachRealtime();
});

loadBoard();
attachRealtime();

function attachRealtime() {
  if (unsubscribe) unsubscribe();
  unsubscribe = subscribeKitchen(currentStoreId, () => loadBoard());
}

async function loadBoard() {
  if (!currentStoreId) return;
  const { data: items } = await supabase
    .from("invoice_items")
    .select("id, name_snapshot, qty, note, kitchen_status, invoices!inner(store_id, invoice_number, order_type, status)")
    .eq("invoices.store_id", currentStoreId)
    .in("invoices.status", ["pending", "completed"])
    .order("id");

  const pending = (items ?? []).filter((i) => i.kitchen_status === "pending");
  const preparing = (items ?? []).filter((i) => i.kitchen_status === "preparing");
  const ready = (items ?? []).filter((i) => i.kitchen_status === "ready");

  qs("#colPending").innerHTML = renderColumn(pending, "preparing", "Mulai Proses");
  qs("#colPreparing").innerHTML = renderColumn(preparing, "ready", "Tandai Siap");
  qs("#colReady").innerHTML = renderColumn(ready, "served", "Sudah Disajikan");

  qsa("[data-advance]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await supabase.from("invoice_items").update({ kitchen_status: btn.dataset.next }).eq("id", btn.dataset.advance);
      loadBoard();
    });
  });
}

function renderColumn(items, nextStatus, actionLabel) {
  if (items.length === 0) return `<p style="color:#94a3b8; font-size:.85rem">Tidak ada pesanan.</p>`;
  return items.map((i) => `
    <div class="hg-card" style="padding:10px; margin-bottom:8px">
      <div style="font-weight:600">${i.name_snapshot} × ${i.qty}</div>
      <div style="font-size:.78rem; color:#64748b">${i.invoices.invoice_number} · ${i.invoices.order_type}</div>
      ${i.note ? `<div style="font-size:.78rem; color:#f97316">Catatan: ${i.note}</div>` : ""}
      ${nextStatus !== "served" ? `<button class="hg-btn hg-btn--sm hg-btn--outline" style="margin-top:8px" data-advance="${i.id}" data-next="${nextStatus}">${actionLabel}</button>` : ""}
    </div>
  `).join("");
}
