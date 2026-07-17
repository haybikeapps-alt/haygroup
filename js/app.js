// js/app.js
import { supabase } from './supabaseClient.js';
import * as POS from './modules/pos.js';
import * as Accounting from './modules/accounting.js';

// Register Service Worker untuk PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('SW registration failed', err));
  });
}

// Cek koneksi Supabase
async function checkConnection() {
    const { data, error } = await supabase.from('branches').select('*');
    if (error) {
        console.error("Gagal koneksi Supabase:", error);
        document.getElementById('app').innerHTML = `<div class="p-10 text-red-400">Gagal terhubung ke database. Cek koneksi Supabase Anda.</div>`;
    } else {
        console.log("Cabang terdeteksi:", data);
        initApp(data);
    }
}

function initApp(branches) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <h1 class="text-3xl font-bold text-yellow-400 p-6">HayGroup Finance</h1>
        <div class="p-6 grid grid-cols-3 gap-4">
            ${branches.map(b => `
                <div class="bg-gray-800 p-4 rounded-lg border-t-4" style="border-color: ${b.color}">
                    <h2 class="text-xl font-bold">${b.name}</h2>
                    <p class="text-gray-400">${b.type}</p>
                </div>
            `).join('')}
        </div>
    `;
}

checkConnection();
