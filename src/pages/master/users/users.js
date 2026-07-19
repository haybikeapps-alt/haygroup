import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase, callFunction } from "../../../lib/supabase.js";
import { qs, qsa, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/master/users/index.html");

let roles = [];
let stores = [];

await loadOptions();
await loadUsers();

qs("#newBtn").addEventListener("click", () => qs("#modal").showModal());
qs("#closeBtn").addEventListener("click", () => qs("#modal").close());
qs("#userForm").addEventListener("submit", createUser);

async function loadOptions() {
  const { data: roleData } = await supabase.from("roles").select("id, name").order("name");
  roles = roleData ?? [];
  qs("#fRole").innerHTML = roles.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");

  const { data: storeData } = await supabase.from("stores").select("id, name").eq("status", "active");
  stores = storeData ?? [];
  qs("#fStores").innerHTML = stores.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
}

async function createUser(e) {
  e.preventDefault();
  const storeIds = Array.from(qs("#fStores").selectedOptions).map((o) => o.value);
  try {
    const res = await callFunction("create-user", {
      name: qs("#fName").value.trim(),
      email: qs("#fEmail").value.trim(),
      role_id: qs("#fRole").value,
      store_ids: storeIds,
    });
    toast(`Akun berhasil dibuat. Password awal: ${res.temp_password}`, "success");
    qs("#modal").close();
    qs("#userForm").reset();
    await loadUsers();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function loadUsers() {
  const { data: profiles, error } = await supabase.from("profiles").select("id, name, email, status").order("created_at", { ascending: false });
  if (error) { toast(error.message, "error"); return; }

  const { data: userRoles } = await supabase.from("user_roles").select("user_id, roles(name)");
  const { data: userStores } = await supabase.from("user_stores").select("user_id, stores(name)");

  qs("#rows").innerHTML = (profiles ?? []).map((p) => {
    const roleNames = (userRoles ?? []).filter((r) => r.user_id === p.id).map((r) => r.roles?.name).join(", ") || "-";
    const storeNames = (userStores ?? []).filter((s) => s.user_id === p.id).map((s) => s.stores?.name).join(", ") || "-";
    return `
      <tr>
        <td>${p.name}</td>
        <td>${p.email}</td>
        <td>${roleNames}</td>
        <td>${storeNames}</td>
        <td><span class="hg-badge ${p.status === "active" ? "hg-badge--green" : "hg-badge--gray"}">${p.status}</span></td>
        <td><button class="hg-btn hg-btn--outline hg-btn--sm" data-toggle="${p.id}" data-active="${p.status === "active"}">${p.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button></td>
      </tr>
    `;
  }).join("");

  qsa("[data-toggle]").forEach((btn) => btn.addEventListener("click", async () => {
    const isActive = btn.dataset.active === "true";
    await supabase.from("profiles").update({ status: isActive ? "inactive" : "active" }).eq("id", btn.dataset.toggle);
    await loadUsers();
  }));
}
