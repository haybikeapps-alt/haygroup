// src/lib/rbac.js
// Membaca app_roles / app_permissions / store_ids dari JWT (disisipkan oleh
// Edge Function auth-token-hook). Dipakai HANYA untuk menampilkan/menyembunyikan
// menu di UI — keamanan sesungguhnya tetap dijaga oleh RLS di database.
import { supabase } from "./supabase.js";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return {};
  }
}

export async function getClaims() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { app_roles: [], app_permissions: [], store_ids: [] };
  const claims = decodeJwt(token);
  return {
    app_roles: claims.app_roles || [],
    app_permissions: claims.app_permissions || [],
    store_ids: claims.store_ids || [],
  };
}

export async function hasRole(role) {
  const claims = await getClaims();
  return claims.app_roles.includes(role);
}

export async function hasPermission(permission) {
  const claims = await getClaims();
  return claims.app_permissions.includes(permission) || claims.app_roles.includes("SuperAdmin");
}

export async function isSuperAdmin() {
  return hasRole("SuperAdmin");
}

export async function myStoreIds() {
  const claims = await getClaims();
  return claims.store_ids;
}
