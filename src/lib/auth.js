// src/lib/auth.js
import { supabase } from "./supabase.js";

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/src/pages/auth/login/index.html";
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  return data;
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  const session = await getSession();
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", session.user.id);
}

/**
 * Guard halaman: panggil di awal setiap halaman dashboard/pos/finance/master.
 * Redirect ke login bila belum login; redirect ke ganti password bila wajib.
 */
export async function requireAuth({ allowUnverifiedPassword = false } = {}) {
  const session = await getSession();
  if (!session) {
    window.location.href = "/src/pages/auth/login/index.html";
    return null;
  }
  const profile = await getProfile();
  if (profile?.status === "inactive") {
    await logout();
    return null;
  }
  if (profile?.must_change_password && !allowUnverifiedPassword) {
    window.location.href = "/src/pages/auth/login/change-password.html";
    return null;
  }
  return { session, profile };
}
