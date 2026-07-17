// Import library Supabase langsung dari CDN (ES Module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// GANTI INI dengan kredensial Supabase Anda!
// Bisa didapat di Dashboard Supabase > Settings > API
const SUPABASE_URL = 'https://XXXXX.supabase.co' 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
