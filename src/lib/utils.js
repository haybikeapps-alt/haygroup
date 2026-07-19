// src/lib/utils.js
export function formatRupiah(value) {
  const n = Number(value || 0);
  return "Rp" + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric", ...opts,
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    dateStyle: "medium", timeStyle: "short",
  });
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function toast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `hg-toast hg-toast--${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

export function uuidShort(id) {
  return id ? id.slice(0, 8) : "";
}
