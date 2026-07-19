import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase, callFunction } from "../../../lib/supabase.js";
import { formatDate, formatRupiah, qs, qsa, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/payables/index.html");

const { data: suppliers } = await supabase.from("suppliers").select("id, name").order("name");
qs("#fSupplier").innerHTML = (suppliers ?? []).map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
if (!suppliers || suppliers.length === 0) {
  qs("#fSupplier").innerHTML = `<option value="">Belum ada supplier — klik "+ Supplier" dahulu</option>`;
}

qs("#newSupplierBtn").addEventListener("click", async () => {
  const name = prompt("Nama supplier baru:");
  if (!name) return;
  const { error } = await supabase.from("suppliers").insert({ name });
  if (error) { toast(error.message, "error"); return; }
  toast("Supplier ditambahkan.", "success");
  const { data: refreshed } = await supabase.from("suppliers").select("id, name").order("name");
  qs("#fSupplier").innerHTML = (refreshed ?? []).map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
});

await loadPayables();

qs("#newBtn").addEventListener("click", () => qs("#newModal").showModal());
qs("#closeNewBtn").addEventListener("click", () => qs("#newModal").close());
qs("#closePayBtn").addEventListener("click", () => qs("#payModal").close());

qs("#newForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    supplier_id: qs("#fSupplier").value,
    invoice_number: qs("#fInvoiceNumber").value.trim(),
    invoice_date: qs("#fInvoiceDate").value,
    due_date: qs("#fDueDate").value,
    total_amount: Number(qs("#fTotal").value),
  };
  const { error } = await supabase.from("acc_payables").insert(payload);
  if (error) { toast(error.message, "error"); return; }
  toast("Hutang usaha berhasil dicatat.", "success");
  qs("#newModal").close();
  qs("#newForm").reset();
  await loadPayables();
});

qs("#payForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await callFunction("pay-payable", {
      payable_id: qs("#payPayableId").value,
      amount: Number(qs("#payAmount").value),
      method: qs("#payMethod").value,
    });
    toast("Pembayaran berhasil dicatat.", "success");
    qs("#payModal").close();
    qs("#payForm").reset();
    await loadPayables();
  } catch (err) {
    toast(err.message, "error");
  }
});

async function loadPayables() {
  const { data, error } = await supabase
    .from("acc_payables")
    .select("id, invoice_number, invoice_date, due_date, total_amount, paid_amount, status, suppliers(name)")
    .order("due_date");
  if (error) { toast(error.message, "error"); return; }

  qs("#rows").innerHTML = (data ?? []).map((p) => {
    const remaining = p.total_amount - p.paid_amount;
    return `
      <tr>
        <td>${p.invoice_number}</td>
        <td>${p.suppliers?.name ?? "-"}</td>
        <td>${formatDate(p.due_date)}</td>
        <td>${formatRupiah(p.total_amount)}</td>
        <td>${formatRupiah(p.paid_amount)}</td>
        <td>${formatRupiah(remaining)}</td>
        <td><span class="hg-badge ${statusBadge(p.status)}">${p.status}</span></td>
        <td>${p.status !== "paid" ? `<button class="hg-btn hg-btn--sm hg-btn--accent" data-pay="${p.id}">Bayar</button>` : ""}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="8">Belum ada data hutang usaha.</td></tr>`;

  qsa("[data-pay]").forEach((btn) => btn.addEventListener("click", () => {
    qs("#payPayableId").value = btn.dataset.pay;
    qs("#payModal").showModal();
  }));
}

function statusBadge(status) {
  if (status === "paid") return "hg-badge--green";
  if (status === "partial") return "hg-badge--yellow";
  if (status === "overdue") return "hg-badge--red";
  return "hg-badge--gray";
}
