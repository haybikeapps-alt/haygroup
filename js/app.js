import { supabase } from './supabaseClient.js';
import * as POS from './modules/pos.js';
import * as Reports from './modules/reports.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/haygroup/sw.js')
      .then(function(reg) { console.log('Service Worker registered'); })
      .catch(function(err) { console.error('SW registration failed:', err); });
  });
}

var currentPage = 'pos';
var branchesData = [];

async function initApp() {
    var result = await supabase.from('branches').select('*');
    branchesData = result.data || [];
    renderShell();
}

function renderShell() {
    var appDiv = document.getElementById('app');
    var pages = [
        { id: 'pos', icon: 'fa-cash-register', label: 'Kasir' },
        { id: 'laba-rugi', icon: 'fa-chart-line', label: 'Laba Rugi' },
        { id: 'neraca', icon: 'fa-scale-balanced', label: 'Neraca' }
    ];
    var navBtns = '';
    for (var i = 0; i < pages.length; i++) {
        var p = pages[i];
        var active = currentPage === p.id;
        navBtns += '<button onclick="window.navigate(\'' + p.id + '\')" class="px-4 py-1.5 rounded-md text-sm font-semibold transition-all ' + (active ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white') + '"><i class="fas ' + p.icon + ' mr-1"></i> ' + p.label + '</button>';
    }
    appDiv.innerHTML = '<nav class="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-6 justify-between flex-shrink-0">' +
        '<div class="flex items-center gap-3"><div class="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-black">H</div>' +
        '<span class="text-xl font-black text-white tracking-tight">HayGroup <span class="text-amber-400">Finance</span></span></div>' +
        '<div class="flex bg-slate-900 rounded-lg p-1 gap-1">' + navBtns + '</div>' +
        '<div class="text-xs text-slate-500">PWA + Supabase</div></nav>' +
        '<main id="main-content" class="flex-1 overflow-y-auto bg-slate-900"></main>';
    renderPageContent();
}

function renderPageContent() {
    var container = document.getElementById('main-content');
    if (currentPage === 'pos') { renderPOSPage(container); }
    else if (currentPage === 'laba-rugi') { Reports.renderIncomeStatement(container); }
    else if (currentPage === 'neraca') { Reports.renderBalanceSheet(container); }
}

function renderPOSPage(container) {
    var activeBranch = POS.getActiveBranch();
    var branchBtns = '';
    for (var i = 0; i < branchesData.length; i++) {
        var b = branchesData[i];
        var isActive = activeBranch === b.id;
        var iconClass = b.id === 1 ? 'fa-bicycle' : b.id === 2 ? 'fa-mug-hot' : 'fa-camera';
        var shortName = b.name.replace('Hay', '');
        branchBtns += '<button onclick="window.handleBranchChange(' + b.id + ')" class="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ' + (isActive ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'bg-slate-700 text-slate-400 hover:bg-slate-600') + '" title="' + b.name + '"><i class="fas ' + iconClass + ' text-lg"></i><span class="text-[9px] font-bold">' + shortName + '</span></button>';
    }
    var branchName = '';
    for (var i = 0; i < branchesData.length; i++) {
        if (branchesData[i].id === activeBranch) { branchName = branchesData[i].name; break; }
    }
    container.innerHTML = '<div class="flex h-[calc(100vh-4rem)]">' +
        '<div class="w-20 bg-slate-800 flex flex-col items-center py-6 gap-6 border-r border-slate-700">' + branchBtns + '</div>' +
        '<div class="flex-1 p-6 overflow-y-auto"><h2 class="text-2xl font-black text-white mb-6">Kasir <span class="text-amber-400">' + branchName + '</span></h2><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="product-grid"><div class="col-span-full text-center text-slate-500 py-20">Memuat produk...</div></div></div>' +
        '<div class="w-96 bg-slate-800 flex flex-col border-l border-slate-700"><div class="p-5 border-b border-slate-700"><h3 class="text-lg font-bold text-white flex items-center gap-2"><i class="fas fa-shopping-cart text-amber-400"></i> Keranjang</h3></div><div class="flex-1 p-4 overflow-y-auto" id="cart-container"></div><div class="p-5 bg-slate-900/50 border-t border-slate-700"><div class="flex justify-between text-2xl font-black mb-5"><span class="text-slate-300">Total</span><span class="text-amber-400" id="cart-total">Rp 0</span></div><button onclick="window.handleCheckout()" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 rounded-xl text-lg transition-all active:scale-95 shadow-lg shadow-amber-500/20">BAYAR</button></div></div></div>';
    loadProducts();
    renderCartUI();
}

async function loadProducts() {
    var products = await POS.getProducts(POS.getActiveBranch());
    var grid = document.getElementById('product-grid');
    if (!grid) return;
    if (products.length === 0) { grid.innerHTML = '<div class="col-span-full text-center text-slate-500 py-20">Belum ada produk.</div>'; return; }
    var html = '';
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        html += '<div onclick="window.handleAddToCart(' + p.id + ')" class="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-amber-500 cursor-pointer transition-all hover:shadow-lg hover:shadow-amber-500/10 active:scale-95"><h4 class="font-bold text-white mb-1 truncate">' + p.name + '</h4><p class="text-xs text-slate-500 mb-3">' + p.category + '</p><p class="text-amber-400 font-bold text-lg">Rp ' + p.price.toLocaleString('id-ID') + '</p></div>';
    }
    grid.innerHTML = html;
}

function renderCartUI() {
    var cart = POS.getCart();
    var container = document.getElementById('cart-container');
    var totalEl = document.getElementById('cart-total');
    if (!container || !totalEl) return;
    if (cart.length === 0) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-600"><i class="fas fa-box-open text-4xl mb-3"></i>Keranjang kosong</div>';
    } else {
        var html = '';
        for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            html += '<div class="flex items-center justify-between py-3 border-b border-slate-700"><div class="flex-1"><p class="text-white font-semibold text-sm">' + item.name + '</p><p class="text-slate-400 text-xs">' + item.qty + ' x Rp ' + item.price.toLocaleString('id-ID') + '</p></div><div class="flex items-center gap-3"><span class="text-white font-bold text-sm">Rp ' + (item.qty * item.price).toLocaleString('id-ID') + '</span><button onclick="window.handleRemoveFromCart(' + item.id + ')" class="text-red-400 hover:text-red-300"><i class="fas fa-times"></i></button></div></div>';
        }
        container.innerHTML = html;
    }
    totalEl.innerText = 'Rp ' + POS.getCartTotal().toLocaleString('id-ID');
}

window.navigate = function(page) { currentPage = page; renderShell(); };
window.handleBranchChange = function(branchId) { POS.setActiveBranch(branchId); renderPOSPage(document.getElementById('main-content')); };
window.handleAddToCart = function(productId) {
    supabase.from('products').select('*').eq('id', productId).single().then(function(result) {
        if (result.data) { POS.addToCart(result.data); renderCartUI(); }
    });
};
window.handleRemoveFromCart = function(productId) { POS.removeFromCart(productId); renderCartUI(); };
window.handleCheckout = async function() {
    if (POS.getCartTotal() === 0) return;
    if (confirm('Proses pembayaran dan catat jurnal akuntansi?')) {
        try {
            var result = await POS.checkout('tunai');
            alert('Sukses! Invoice: ' + result.invoice + '\nTotal: Rp ' + result.total.toLocaleString('id-ID'));
            renderCartUI();
            loadProducts();
        } catch (err) { alert('Gagal: ' + err.message); }
    }
};

initApp();