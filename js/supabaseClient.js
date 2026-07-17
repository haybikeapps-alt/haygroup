// Import library Supabase langsung dari CDN (ES Module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// GANTI INI dengan kredensial Supabase Anda!
// Bisa didapat di Dashboard Supabase > Settings > API
const SUPABASE_URL = 'https://ielxzxvlyrhmokeqylhv.supabase.co' 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbHh6eHZseXJobW9rZXF5bGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTIyOTksImV4cCI6MjA5OTg2ODI5OX0.Wbk25P_gsnHGaqg6Dsb8yr7NO3_X5NiJMtG-QVuHCGE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
