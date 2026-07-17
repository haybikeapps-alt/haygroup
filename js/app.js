// js/app.js
import { supabase } from './supabaseClient.js';
import * as POS from './modules/pos.js';
import * as Reports from './modules/reports.js';

// Register Service Worker (Sudah diperbaiki)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/haygroup/sw.js')
      .then(reg => console.log('✅ Service Worker terdaftar'))
      .catch(err => console.error('❌ Gagal daftar SW:', err)); // Tanda kurung sudah ditutup
  });
}

let currentPage = 'pos';
let branchesData = [];

async function initApp() {
    const { data } = await supabase.from('branches').select('*');
    branchesData = data || [];
    renderShell();
}

function renderShell() {
    const appDiv = document.getElementById('app');
    
    appDiv.innerHTML = `
        <!-- Top Navbar -->
        <nav class="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-6 justify-between flex-shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-8 h-
