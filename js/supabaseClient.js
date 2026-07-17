// js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Ganti dengan URL dan Anon Key dari menu Settings > API di Dashboard Supabase Anda
const SUPABASE_URL = 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
