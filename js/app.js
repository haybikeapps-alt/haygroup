// js/app.js
import { supabase } from './supabaseClient.js';

// 1. Register Service Worker untuk PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ Service Worker terdaftar'))
      .catch(err => console.error('❌ Gagal daftar SW:', err));
  });
}

// 2. Cek Koneksi Database
async function initializeApp() {
    const appDiv = document.getElementById('app');
    
    try {
        // Coba ambil data cabang dari Supabase
        const { data: branches, error } = await supabase.from('branches').select('*');
        
        if (error) throw error;

        // Jika berhasil, tampilkan Dashboard Awal
        appDiv.innerHTML = `
            <div class="p-6">
                <h1 class="text-3xl font-black text-amber-400 mb-6">HayGroup Dashboard</h1>
                <p class="text-slate-400 mb-4">Koneksi Supabase Berhasil! Cabang terdeteksi:</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${branches.map(b => `
                        <div class="bg-slate-800 p-5 rounded-xl border-t-4 shadow-lg" style="border-color: ${b.color}">
                            <h2 class="text-xl font-bold text-white">${b.name}</h2>
                            <p class="text-slate-400 text-sm">${b.type}</p>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-8 p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-400">
                    ✅ Fondasi PWA & Database siap! Kita bisa lanjut membuat modul Kasir & Akuntansi.
                </div>
            </div>
        `;

    } catch (err) {
        // Jika gagal
        appDiv.innerHTML = `
            <div class="p-6 text-center">
                <h1 class="text-2xl font-bold text-red-400 mb-4">Koneksi Gagal</h1>
                <p class="text-slate-400">Pastikan URL dan Anon Key Supabase sudah benar di file <code>js/supabaseClient.js</code></p>
                <p class="text-red-400 mt-4 text-sm">Error: ${err.message}</p>
            </div>
        `;
    }
}

// Jalankan aplikasi
initializeApp();
