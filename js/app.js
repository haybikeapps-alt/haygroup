// js/app.js
import { supabase } from './supabaseClient.js';
import * as POS from './modules/pos.js';

// js/app.js - bagian Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/haygroup/sw.js') // Tambahkan path repo
      .then(reg => console.log('✅ Service Worker terdaftar'))
      .catch(err => console.error('❌ Gagal daftar SW:', err);
  });
}

let branchesData = [];

async function initApp() {
    const { data } = await supabase.from('branches').select('*');
    branchesData = data || [];
    renderApp();
}

function renderApp() {
    const appDiv = document.getElementById('app');
    const activeBranch = POS.getActiveBranch();

    appDiv.innerHTML = `
        <div class="flex h-screen font-sans">
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
            <div class="flex-1 bg-slate-900 p-6 overflow-y-auto">
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
    
    if(products.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-20">Belum ada produk di cabang ini. Tambahkan di database Supabase.</div>`;
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

// Global Event Handlers
window.handleBranchChange = function(branchId) {
    POS.setActiveBranch(branchId);
    renderApp();
}

window.handleAddToCart = function(productId) {
    const products = POS.getProducts(0); // dummy call cache maybe? for now supabase doesn't cache
    // Since we need the product data, let's find it from the DOM or re-fetch
    // Better: fetch products, find by id, add
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
            alert(`Transaksi Sukses!\nInvoice: ${result.invoice}\nTotal: Rp ${result.total.toLocaleString('id-ID')}\n\nJurnal Akuntansi otomatis tercatat di Supabase.`);
            renderApp();
        } catch(err) {
            alert("Gagal memproses: " + err.message);
        }
    }
}

initApp();
