import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase, callFunction } from "../../../lib/supabase.js";
import { hasRole } from "../../../lib/rbac.js";
import { formatDate, qs, qsa, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/finance/journals/index.html");

const canCancel = (await hasRole("SuperAdmin")) || (await hasRole("Manajer Keuangan"));

let accounts = [];
const { data: accData } = await supabase.from("acc_accounts").select("id, code, name").order("code");
accounts = accData ?? [];

await loadJournals();
addLineRow(); addLineRow();

qs("#newBtn").addEventListener("click", () => qs("#modal").showModal());
qs("#closeBtn").addEventListener("click", () => qs("#modal").close());
qs("#addLineBtn").addEventListener("click", addLineRow);
qs("#journalForm").addEventListener("submit", submitJournal);

function accountOptions() {
  return accounts.map((a) => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join("");
}

function addLineRow() {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="hg-select line-account">${accountOptions()}</select></td>
    <td><input class="hg-input line-debit" type="number" value="0" style="width:110px" /></td>
    <td><input class="hg-input line-credit" type="number" value="0" style="width:110px" /></td>
    <td><button type="button" class="hg-btn hg-btn--outline hg-btn--sm remove-line">✕</button></td>
  `;
  qs("#lineRows").appendChild(tr);
  tr.querySelector(".remove-line").addEventListener("click", () => { tr.remove(); updateTotals(); });
  tr.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", updateTotals));
  updateTotals();
}

function updateTotals() {
  const debits = qsa(".line-debit").reduce((s, i) => s + Number(i.value || 0), 0);
  const credits = qsa(".line-credit").reduce((s, i) => s + Number(i.value || 0), 0);
  const balanced = Math.abs(debits - credits) < 0.01;
  qs("#lineTotals").innerHTML = `Total Debit: ${debits.toLocaleString("id-ID")} · Total Kredit: ${credits.toLocaleString("id-ID")}
    ${balanced ? '<span style="color:#16a34a"> ✓ Seimbang</span>' : '<span style="color:#dc2626"> ✗ Belum seimbang</span>'}`;
}

async function submitJournal(e) {
  e.preventDefault();
  const rows = qsa("#lineRows tr");
  const lines = rows.map((tr) => ({
    account_id: tr.querySelector(".line-account").value,
    debit: Number(tr.querySelector(".line-debit").value || 0),
    credit: Number(tr.querySelector(".line-credit").value || 0),
  })).filter((l) => l.debit > 0 || l.credit > 0);

  try {
    await callFunction("create-journal", {
      journal_date: qs("#fDate").value,
      reference: qs("#fRef").value,
      description: qs("#fDesc").value,
      lines,
    });
    toast("Jurnal draft berhasil dibuat.", "success");
    qs("#modal").close();
    qs("#journalForm").reset();
    qs("#lineRows").innerHTML = "";
    addLineRow(); addLineRow();
    await loadJournals();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function loadJournals() {
  const { data, error } = await supabase
    .from("acc_journals")
    .select("id, journal_number, journal_date, description, source_type, status")
    .order("journal_date", { ascending: false })
    .limit(100);
  if (error) { toast(error.message, "error"); return; }

  qs("#rows").innerHTML = (data ?? []).map((j) => `
    <tr>
      <td>${j.journal_number}</td>
      <td>${formatDate(j.journal_date)}</td>
      <td>${j.description ?? "-"}</td>
      <td>${j.source_type}</td>
      <td><span class="hg-badge ${statusBadge(j.status)}">${j.status}</span></td>
      <td>
        ${j.status === "draft" ? `<button class="hg-btn hg-btn--sm hg-btn--accent" data-post="${j.id}">Posting</button>` : ""}
        ${j.status !== "canceled" && canCancel ? `<button class="hg-btn hg-btn--sm hg-btn--danger" data-cancel="${j.id}">Batal</button>` : ""}
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">Belum ada jurnal.</td></tr>`;

  qsa("[data-post]").forEach((btn) => btn.addEventListener("click", async () => {
    try { await callFunction("post-journal", { journal_id: btn.dataset.post }); toast("Jurnal diposting.", "success"); await loadJournals(); }
    catch (err) { toast(err.message, "error"); }
  }));
  qsa("[data-cancel]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Batalkan jurnal ini?")) return;
    try { await callFunction("cancel-journal", { journal_id: btn.dataset.cancel }); toast("Jurnal dibatalkan.", "success"); await loadJournals(); }
    catch (err) { toast(err.message, "error"); }
  }));
}

function statusBadge(status) {
  if (status === "posted") return "hg-badge--green";
  if (status === "draft") return "hg-badge--yellow";
  return "hg-badge--red";
}
