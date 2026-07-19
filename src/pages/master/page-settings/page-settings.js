import { requireAuth } from "../../../lib/auth.js";
import { renderSidebar } from "../../../components/sidebar.js";
import { supabase } from "../../../lib/supabase.js";
import { qs, qsa, toast } from "../../../lib/utils.js";

const auth = await requireAuth();
if (!auth) throw new Error("not authenticated");
await renderSidebar(qs("#sidebar"), "/src/pages/master/page-settings/index.html");

const GROUP_LABEL = {
  identity: "Identitas Aplikasi", seo: "SEO", homepage: "Halaman Utama", about: "Tentang Kami",
  contact: "Kontak", "social-media": "Media Sosial", policy: "Kebijakan",
  "courier-settings": "Pengaturan Kurir", "payment-method-settings": "Metode Pembayaran", "tax-settings": "Pengaturan Pajak",
};

await load();

async function load() {
  const { data, error } = await supabase.from("page_settings").select("*").order("group_name");
  if (error) { toast(error.message, "error"); return; }

  const groups = {};
  for (const row of data ?? []) {
    (groups[row.group_name] ??= []).push(row);
  }

  qs("#groups").innerHTML = Object.entries(groups).map(([group, rows]) => `
    <div class="hg-card">
      <p class="hg-card__title">${GROUP_LABEL[group] ?? group}</p>
      ${rows.map((r) => `
        <div class="hg-field">
          <label class="hg-label">${r.parameter}</label>
          ${r.value && r.value.length > 80
            ? `<textarea class="hg-input" rows="3" data-param="${r.parameter}">${r.value ?? ""}</textarea>`
            : `<input class="hg-input" data-param="${r.parameter}" value="${(r.value ?? "").replace(/"/g, "&quot;")}" ${!r.editable_parameter ? "disabled" : ""} />`
          }
        </div>
      `).join("")}
      <button class="hg-btn hg-btn--accent hg-btn--sm" data-save-group="${group}">Simpan ${GROUP_LABEL[group] ?? group}</button>
    </div>
  `).join("");

  qsa("[data-save-group]").forEach((btn) => btn.addEventListener("click", () => saveGroup(btn.dataset.saveGroup)));
}

async function saveGroup(group) {
  const card = [...document.querySelectorAll(".hg-card")].find((c) => c.querySelector(`[data-save-group="${group}"]`));
  const fields = card.querySelectorAll("[data-param]");
  const updates = Array.from(fields).map((f) => ({ parameter: f.dataset.param, value: f.value }));

  for (const u of updates) {
    const { error } = await supabase.from("page_settings").update({ value: u.value }).eq("parameter", u.parameter);
    if (error) { toast(error.message, "error"); return; }
  }
  toast("Pengaturan berhasil disimpan.", "success");
}
