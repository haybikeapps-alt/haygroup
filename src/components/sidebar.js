// src/components/sidebar.js
import { getClaims } from "../lib/rbac.js";
import { logout } from "../lib/auth.js";

// Definisi menu global. `roles` = tampil jika user punya salah satu role ini.
// Kosongkan `roles` berarti tampil untuk semua yang login.
const MENU = [
  { group: "Utama", items: [
    { label: "Dashboard", href: "/src/pages/dashboard/index.html", roles: [] },
  ]},
  { group: "Kasir / POS", items: [
    { label: "Kasir (POS)", href: "/src/pages/pos/index.html", roles: ["SuperAdmin","Administrator","Kasir","Store Manager"] },
    { label: "Dapur (Kitchen)", href: "/src/pages/kitchen/index.html", roles: ["SuperAdmin","Administrator","Dapur","Kasir"], storeCode: "HAYPOP" },
  ]},
  { group: "Data Master", items: [
    { label: "Unit Usaha", href: "/src/pages/master/stores/index.html", roles: ["SuperAdmin","Administrator"] },
    { label: "Produk", href: "/src/pages/master/products/index.html", roles: ["SuperAdmin","Administrator","Store Manager"] },
    { label: "Kategori Produk", href: "/src/pages/master/categories/index.html", roles: ["SuperAdmin","Administrator","Store Manager"] },
    { label: "Pengguna & Peran", href: "/src/pages/master/users/index.html", roles: ["SuperAdmin","Administrator"] },
    { label: "Pengaturan Situs", href: "/src/pages/master/page-settings/index.html", roles: ["SuperAdmin","Administrator"] },
  ]},
  { group: "Keuangan & Akuntansi", items: [
    { label: "Bagan Akun (COA)", href: "/src/pages/finance/coa/index.html", roles: ["SuperAdmin","Manajer Keuangan","Accounting","Auditor"] },
    { label: "Jurnal Umum", href: "/src/pages/finance/journals/index.html", roles: ["SuperAdmin","Manajer Keuangan","Accounting","Auditor"] },
    { label: "Buku Besar", href: "/src/pages/finance/ledger/index.html", roles: ["SuperAdmin","Manajer Keuangan","Accounting","Auditor"] },
    { label: "Neraca Saldo", href: "/src/pages/finance/trial-balance/index.html", roles: ["SuperAdmin","Manajer Keuangan","Accounting","Auditor"] },
    { label: "Hutang Usaha", href: "/src/pages/finance/payables/index.html", roles: ["SuperAdmin","Manajer Keuangan","Accounting","Auditor"] },
    { label: "Piutang Usaha", href: "/src/pages/finance/receivables/index.html", roles: ["SuperAdmin","Manajer Keuangan","Accounting","Auditor"] },
    { label: "Aset Tetap", href: "/src/pages/finance/fixed-assets/index.html", roles: ["SuperAdmin","Manajer Keuangan","Accounting","Auditor"] },
    { label: "Tutup Buku", href: "/src/pages/finance/closing/index.html", roles: ["SuperAdmin","Manajer Keuangan"] },
    { label: "Laporan Keuangan", href: "/src/pages/finance/reports/index.html", roles: ["SuperAdmin","Manajer Keuangan","Accounting","Auditor"] },
  ]},
];

export async function renderSidebar(container, activeHref) {
  const claims = await getClaims();
  const isSuperAdmin = claims.app_roles.includes("SuperAdmin");

  const visibleGroups = MENU.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.length === 0 || isSuperAdmin || item.roles.some((r) => claims.app_roles.includes(r))),
  })).filter((g) => g.items.length > 0);

  container.innerHTML = `
    <div class="hg-sidebar__brand">Hay<span>Group</span></div>
    <ul class="hg-nav">
      ${visibleGroups.map((g) => `
        <li class="hg-nav__group">${g.group}</li>
        ${g.items.map((i) => `<li><a href="${i.href}" class="${activeHref === i.href ? 'active' : ''}">${i.label}</a></li>`).join("")}
      `).join("")}
      <li class="hg-nav__group">Akun</li>
      <li><a href="#" id="logoutLink">Keluar</a></li>
    </ul>
  `;

  container.querySelector("#logoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}
