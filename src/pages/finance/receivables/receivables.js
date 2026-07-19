import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase, callFunction } from "../../../lib/supabase.js";
import { formatDate, formatRupiah, qs, qsa, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/receivables/index.html");

await loadReceivables();

qs("#newBtn").addEventListener("click", () => qs("#newModal").showModal());
qs("#closeNewBtn").addEventListener("click", () => qs("#newModal").close());
qs("#closePayBtn").addEventListener("click", () => qs("#payModal").close());

qs("#newForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: customer, error: custErr } = await supabase.from("customers").insert({
    name: qs("#fCustomerName").value.trim(),
    phone: qs("#fCustomerPhone").value.trim() || null,
  }).select().single();
  if (custErr) { toast(custErr.message, "error"); return; }

  const { error } = await supabase.from("acc_receivables").insert({
    customer_id: customer.id,
    invoice_date: qs("#fDate").value,
    due_date: qs("#fDueDate").value,
    total_amount: Number(qs("#fTotal").value),
    status: "open",
  });
  if (error) { toast(error.message, "error"); return; }

  toast("Piutang berhasil dicatat.", "success");
  qs("#newModal").close();
  qs("#newForm").reset();
  await loadReceivables();
});

qs("#payForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await callFunction("pay-receivable", {
      receivable_id: qs("#payReceivableId").value,
      amount: Number(qs("#payAmount").value),
      method: qs("#payMethod").value,
    });
    toast("Pembayaran diterima & dicatat.", "success");
    qs("#payModal").close();
    qs("#payForm").reset();
    await loadReceivables();
  } catch (err) {
    toast(err.message, "error");
  }
});

async function loadReceivables() {
  const { data, error } = await supabase
    .from("acc_receivables")
    .select("id, invoice_date, due_date, total_amount, paid_amount, status, customers(name), invoices(invoice_number)")
    .order("due_date");
  if (error) { toast(error.message, "error"); return; }

  qs("#rows").innerHTML = (data ?? []).map((r) => {
    const remaining = r.total_amount - r.paid_amount;
    const label = r.customers?.name ? r.customers.name : (r.invoices?.invoice_number ? `Invoice ${r.invoices.invoice_number}` : "-");
    return `
      <tr>
        <td>${label}</td>
        <td>${formatDate(r.due_date)}</td>
        <td>${formatRupiah(r.total_amount)}</td>
        <td>${formatRupiah(r.paid_amount)}</td>
        <td>${formatRupiah(remaining)}</td>
        <td><span class="hg-badge ${statusBadge(r.status)}">${r.status}</span></td>
        <td>${r.status !== "paid" ? `<button class="hg-btn hg-btn--sm hg-btn--accent" data-pay="${r.id}">Terima</button>` : ""}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="7">Belum ada piutang usaha.</td></tr>`;

  qsa("[data-pay]").forEach((btn) => btn.addEventListener("click", () => {
    qs("#payReceivableId").value = btn.dataset.pay;
    qs("#payModal").showModal();
  }));
}

function statusBadge(status) {
  if (status === "paid") return "hg-badge--green";
  if (status === "partial") return "hg-badge--yellow";
  if (status === "overdue") return "hg-badge--red";
  return "hg-badge--gray";
}
