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
                <div class="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-black">H</div>
                <span class="text-xl font-black text-white tracking-tight">HayGroup <span class="text-amber-400">Finance</span></span>
            </div>
            <div class="flex bg-slate-900 rounded-lg p-1 gap-1">
                <button onclick="window.navigate('pos')" class="px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${currentPage === 'pos' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}">
                    <i class="fas fa-cash-register mr-1"></i> Kasir
                </button>
                <button onclick="window.navigate('laba-rugi')" class="px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${currentPage === 'laba-rugi' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}">
                    <i class="fas fa-chart-line mr-1"></i> Laba Rugi
                </button>
                <button onclick="window.navigate('neraca')" class="px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${currentPage === 'neraca' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}">
                    <i class="fas fa-scale-balanced mr-1"></i> Neraca
                </button>
            </div>
            <div class="text-xs text-slate-500">PWA + Supabase</div>
        </nav>

        <!-- Main Content Area -->
        <main id="main-content" class="flex-1 overflow-y-auto bg-slate-900">
            <!-- Konten dirender oleh JS -->
        </main>
    `;

    renderPageContent();
}

function renderPageContent() {
    const container = document.getElementById('main-content');
    
    if (currentPage === 'pos') {
        renderPOSPage(container);
    } else if (currentPage === 'laba-rugi') {
        Reports.renderIncomeStatement(container);
    } else if (currentPage === 'neraca') {
        Reports.renderBalanceSheet(container);
    }
}

function renderPOSPage(container) {
    const activeBranch = POS.getActiveBranch();
    
    container.innerHTML = `
        <div class="flex h-[calc(100vh-4rem)]">
            <!-- Sidebar Cabang -->
            <div class="w-20 bg-slate-800 flex flex-col items-center py-6 gap-6 border-r border-slate-700">
                ${branchesData.map(b => `
                    <button onclick="window.handleBranchChange(${b.id})" 
                            class="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeBranch === b.id ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}"
                            title="${b.name}">
                        <i class="fas ${b.id === 1 ? 'fa-bicycle' : b.id === 2 ? 'fa-mug-hot' : 'fa-camera'} text-lg"></i>
                        <span class="text-[9px] font-bold">${b.name.replace('Hay','')}</span>
                    </button>
                `).join('')}
            </div>

            <!-- Area Produk -->
            <div class="flex-1 p-6 overflow-y-auto">
                <h2 class="text-2xl font-black text-white mb-6">Kasir <span class="text-amber-400">${branchesData.find(b=>b.id===activeBranch)?.name || ''}</span></h2>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="product-grid">
                    <div class="col-span-full text-center text-slate-500 py-20">Memuat produk...</div>
                </div>
            </div>

            <!-- Keranjang -->
            <div class="w-96 bg-slate-800 flex flex-col border-l border-slate-700">
                <div class="p-5 border-b border-slate-700">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <i class="fas fa-shopping-cart text-amber-400"></i> Keranjang
                    </h3>
                </div>
                <div class="flex-1 p-4 overflow-y-auto" id="cart-container"></div>
                <div class="p-5 bg-slate-900/50 border-t border-slate-700">
                    <div class="flex justify-between text-2xl font-black mb-5">
                        <span class="text-slate-300">Total</span>
                        <span class="text-amber-400" id="cart-total">Rp 0</span>
                    </div>
                    <button onclick="window.handleCheckout()" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 rounded-xl text-lg transition-all active:scale-95 shadow-lg shadow-amber-500/20">
                        BAYAR
                    </button>
                </div>
            </div>
        </div>
    `;

    loadProducts();
    renderCartUI();
}

async function loadProducts() {
    const products = await POS.getProducts(POS.getActiveBranch());
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    
    if(products.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-20">Belum ada produk.</div>`;
        return;
    }
    grid.innerHTML = products.map(p => `
        <div onclick="window.handleAddToCart(${p.id})" 
             class="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-amber-500 cursor-pointer transition-all hover:shadow-lg hover:shadow-amber-500/10 active:scale-95">
            <h4 class="font-bold text-white mb-1 truncate">${p.name}</h4>
            <p class="text-xs text-slate-500 mb-3">${p.category}</p>
            <p class="text-amber-400 font-bold text-lg">Rp ${p.price.toLocaleString('id-ID')}</p>
        </div>
    `).join('');
}

function renderCartUI() {
    const cart = POS.getCart();
    const container = document.getElementById('cart-container');
    const totalEl = document.getElementById('cart-total');
    if(!container || !totalEl) return;

    if (cart.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-600"><i class="fas fa-box-open text-4xl mb-3"></i>Keranjang kosong</div>`;
    } else {
        container.innerHTML = cart.map(item => `
            <div class="flex items-center justify-between py-3 border-b border-slate-700">
                <div class="flex-1">
                    <p class="text-white font-semibold text-sm">${item.name}</p>
                    <p class="text-slate-400 text-xs">${item.qty} x Rp ${item.price.toLocaleString('id-ID')}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-white font-bold text-sm">Rp ${(item.qty * item.price).toLocaleString('id-ID')}</span>
                    <button onclick="window.handleRemoveFromCart(${item.id})" class="text-red-400 hover:text-red-300"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `).join('');
    }
    totalEl.innerText = `Rp ${POS.getCartTotal().toLocaleString('id-ID')}`;
}

window.navigate = function(page) {
    currentPage = page;
    renderShell();
}

window.handleBranchChange = function(branchId) {
    POS.setActiveBranch(branchId);
    renderPOSPage(document.getElementById('main-content'));
}

window.handleAddToCart = function(productId) {
    supabase.from('products').select('*').eq('id', productId).single().then(({data}) => {
        if(data) {
            POS.addToCart(data);
            renderCartUI();
        }
    });
}

window.handleRemoveFromCart = function(productId) {
    POS.removeFromCart(productId);
    renderCartUI();
}

window.handleCheckout = async function() {
    if(POS.getCartTotal() === 0) return;
    if(confirm("Proses pembayaran dan catat jurnal akuntansi?")) {
        try {
            const result = await POS.checkout('tunai');
            alert(`Sukses! Invoice: ${result.invoice}\nTotal: Rp ${result.total.toLocaleString('id-ID')}\n\nCek halaman Laporan Keuangan untuk melihat dampak jurnalnya.`);
            renderCartUI();
            loadProducts(); // Refresh stok
        } catch(err) {
            alert("Gagal: " + err.message);
        }
    }
}

initApp();
