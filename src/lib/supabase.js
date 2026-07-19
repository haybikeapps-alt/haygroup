// src/lib/supabase.js
// Inisialisasi client Supabase untuk browser. Hanya "anon key" yang boleh
// ada di sini (aman untuk publik, karena keamanan sebenarnya di RLS).
// Isi SUPABASE_URL & SUPABASE_ANON_KEY sesuai project Supabase Anda.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = window.__HAYGROUP_CONFIG__?.SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = window.__HAYGROUP_CONFIG__?.SUPABASE_ANON_KEY || "YOUR-ANON-KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Panggil Edge Function dengan Authorization: Bearer <access_token> otomatis. */
export async function callFunction(name, body = {}, method = "POST") {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      apikey: SUPABASE_ANON_KEY,
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Gagal memanggil fungsi ${name}`);
  }
  return json;
}
