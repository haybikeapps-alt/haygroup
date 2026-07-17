import { supabase } from '../supabaseClient.js';

var currentBranch = 1; // Default HayBike

export async function renderProductsPage(container) {
    container.innerHTML = '<div class="flex items-center justify-center h-64 text-amber-400">Memuat produk...</div>';
    
    var res1 = await supabase.from('branches').select('*');
    var branches = res1.data || [];
    
    var res2 = await supabase.from('products').select('*').eq('branch_id', currentBranch).order('id', { ascending: true });
    var products = res2.data || [];

    var branchTabs = '';
    for (var i = 0; i < branches.length; i++) {
        var b = branches[i];
        branchTabs += '<button onclick="window.switchProductBranch(' + b.id + ')" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ' + (currentBranch === b.id ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600') + '">' + b.name + '</button>';
    }

    var tableRows = '';
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        tableRows += '<tr class="border-b border-slate-700 hover:bg-slate-700/50">' +
            '<td class="py-3 px-4 text-white font-semibold">' + p.name + '</td>' +
            '<td class="py-3 px-4 text-slate-400">' + p.category + '</td>' +
            '<td class="py-3 px-4 text-amber-400">Rp ' + Number(p.price).toLocaleString('id-ID') + '</td>' +
            '<td class="py-3 px-4 text-slate-300">Rp ' + Number(p.cost).toLocaleString('id-ID') + '</td>' +
            '<td class="py-3 px-4 text-white">' + p.stock + '</td>' +
            '<td class="py-3 px-4">' +
            '<button onclick="window.editProduct(' + p.id + ')" class="text-sky-400 hover:text-sky-300 mr-3"><i class="fas fa-edit"></i></button>' +
            '<button onclick="window.deleteProduct(' + p.id + ')" class="text-red-400 hover:text-red-300"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }

    container.innerHTML = '<div class="p-6">' +
        '<div class="flex justify-between items-center mb-6">' +
        '<h2 class="text-2xl font-black text-white">Manajemen Produk</h2>' +
        '<button onclick="window.openProductForm()" class="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 px-4 rounded-lg transition-all"><i class="fas fa-plus mr-2"></i>Tambah Produk</button>' +
        '</div>' +
        '<div class="flex gap-2 mb-6">' + branchTabs + '</div>' +
        '<div class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">' +
        '<table class="w-full text-left"><thead class="bg-slate-700/50 text-slate-400 text-sm"><tr>' +
        '<th class="py-3 px-4">Nama Produk</th><th class="py-3 px-4">Kategori</th><th class="py-3 px-4">Harga Jual</th><th class="py-3 px-4">Harga Modal</th><th class="py-3 px-4">Stok</th><th class="py-3 px-4">Aksi</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody></table>' +
        (products.length === 0 ? '<div class="p-6 text-center text-slate-500">Tidak ada produk untuk cabang ini.</div>' : '') +
        '</div></div>' +
        '<div id="product-modal" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-50 backdrop-blur-sm" onclick="if(event.target===this)window.closeProductForm()">' +
        '<div class="bg-slate-800 border border-slate-700 p-6 rounded-xl w-full max-w-md shadow-2xl" id="product-modal-content"></div></div>';
}

window.switchProductBranch = function(branchId) {
    currentBranch = branchId;
    renderProductsPage(document.getElementById('main-content'));
};

window.openProductForm = async function(productId) {
    var product = { name: '', category: '', price: '', cost: '', stock: 0 };
    var isEdit = false;
    
    if (productId) {
        var res = await supabase.from('products').select('*').eq('id', productId).single();
        if (res.data) { product = res.data; isEdit = true; }
    }

    var modalContent = document.getElementById('product-modal-content');
    modalContent.innerHTML = '<h3 class="text-xl font-bold text-white mb-4">' + (isEdit ? 'Edit' : 'Tambah') + ' Produk</h3>' +
        '<div class="space-y-4">' +
        '<div><label class="text-sm text-slate-400 block mb-1">Nama Produk</label><input id="p-name" type="text" class="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500" value="' + product.name + '"></div>' +
        '<div><label class="text-sm text-slate-400 block mb-1">Kategori</label><input id="p-cat" type="text" class="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500" value="' + product.category + '"></div>' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div><label class="text-sm text-slate-400 block mb-1">Harga Jual</label><input id="p-price" type="number" class="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500" value="' + product.price + '"></div>' +
        '<div><label class="text-sm text-slate-400 block mb-1">Harga Modal (HPP)</label><input id="p-cost" type="number" class="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500" value="' + product.cost + '"></div>' +
        '</div>' +
        '<div><label class="text-sm text-slate-400 block mb-1">Stok</label><input id="p-stock" type="number" class="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500" value="' + product.stock + '"></div>' +
        '</div>' +
        '<div class="flex gap-3 mt-6">' +
        '<button onclick="window.closeProductForm()" class="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 rounded-lg transition-all">Batal</button>' +
        '<button onclick="window.saveProduct(' + (isEdit ? product.id : 'null') + ')" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 rounded-lg transition-all">Simpan</button>' +
        '</div>';
    
    var modal = document.getElementById('product-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.editProduct = function(id) { window.openProductForm(id); };

window.closeProductForm = function() {
    var modal = document.getElementById('product-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.saveProduct = async function(id) {
    var name = document.getElementById('p-name').value;
    var category = document.getElementById('p-cat').value;
    var price = parseFloat(document.getElementById('p-price').value);
    var cost = parseFloat(document.getElementById('p-cost').value);
    var stock = parseInt(document.getElementById('p-stock').value);

    if (!name || !category || isNaN(price) || isNaN(cost)) {
        alert('Harap isi semua field dengan benar!');
        return;
    }

    var payload = { name: name, category: category, price: price, cost: cost, stock: stock, branch_id: currentBranch };
    var error = null;

    if (id) {
        var res = await supabase.from('products').update(payload).eq('id', id);
        error = res.error;
    } else {
        var res = await supabase.from('products').insert(payload);
        error = res.error;
    }

    if (error) {
        alert('Gagal menyimpan: ' + error.message);
    } else {
        window.closeProductForm();
        renderProductsPage(document.getElementById('main-content'));
    }
};

window.deleteProduct = async function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini? Data transaksi lama yang terkait tidak akan terhapus.')) {
        var res = await supabase.from('products').delete().eq('id', id);
        if (res.error) {
            alert('Gagal menghapus: ' + res.error.message);
        } else {
            renderProductsPage(document.getElementById('main-content'));
        }
    }
};