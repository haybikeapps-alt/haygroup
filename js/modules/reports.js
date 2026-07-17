import * as Accounting from './accounting.js';

var formatRp = function(amount) { return 'Rp ' + Math.abs(amount).toLocaleString('id-ID'); };

export async function renderIncomeStatement(container) {
    container.innerHTML = '<div class="flex items-center justify-center h-64 text-amber-400">Menghitung Laba Rugi...</div>';
    var data = await Accounting.getIncomeStatement();
    var revHtml = '';
    for (var i = 0; i < data.revenues.length; i++) {
        var r = data.revenues[i];
        revHtml += '<div class="flex justify-between py-1 text-sm"><span class="text-slate-400 pl-4">' + r.name + '</span><span class="text-white">' + formatRp(r.balance) + '</span></div>';
    }
    var expHtml = '';
    for (var i = 0; i < data.expenses.length; i++) {
        var e = data.expenses[i];
        expHtml += '<div class="flex justify-between py-1 text-sm"><span class="text-slate-400 pl-4">' + e.name + '</span><span class="text-red-400">(' + formatRp(e.balance) + ')</span></div>';
    }
    container.innerHTML = '<div class="bg-slate-800 p-6 rounded-xl max-w-3xl mx-auto shadow-xl border border-slate-700">' +
        '<div class="text-center mb-6"><h2 class="text-2xl font-black text-white">HAYGROUP</h2><h3 class="text-lg text-amber-400 font-bold">Laporan Laba Rugi Konsolidasi</h3><p class="text-sm text-slate-400">Periode Berjalan</p></div>' +
        '<div class="mb-6"><h4 class="font-bold text-slate-300 border-b border-slate-600 pb-1 mb-3">PENDAPATAN</h4>' + revHtml +
        '<div class="flex justify-between py-2 border-t border-slate-600 mt-2 font-bold"><span class="text-white">Total Pendapatan</span><span class="text-emerald-400">' + formatRp(data.totalRevenue) + '</span></div></div>' +
        '<div class="mb-6"><h4 class="font-bold text-slate-300 border-b border-slate-600 pb-1 mb-3">BEBAN & HPP</h4>' + expHtml +
        '<div class="flex justify-between py-2 border-t border-slate-600 mt-2 font-bold"><span class="text-white">Total Beban</span><span class="text-red-400">(' + formatRp(data.totalExpense) + ')</span></div></div>' +
        '<div class="flex justify-between py-4 border-t-4 border-amber-500 mt-4 bg-amber-500/10 px-4 rounded-lg"><span class="text-xl font-black text-white">LABA BERSIH</span><span class="text-xl font-black ' + (data.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400') + '">' + formatRp(data.netIncome) + '</span></div>' +
        '</div>';
}

export async function renderBalanceSheet(container) {
    container.innerHTML = '<div class="flex items-center justify-center h-64 text-amber-400">Menghitung Neraca...</div>';
    var data = await Accounting.getBalanceSheet();
    var assetHtml = '';
    for (var i = 0; i < data.assets.length; i++) { var a = data.assets[i]; assetHtml += '<div class="flex justify-between py-1 text-sm"><span class="text-slate-400 pl-4">' + a.name + '</span><span class="text-white">' + formatRp(a.balance) + '</span></div>'; }
    var liabHtml = '';
    for (var i = 0; i < data.liabilities.length; i++) { var l = data.liabilities[i]; liabHtml += '<div class="flex justify-between py-1 text-sm"><span class="text-slate-400 pl-4">' + l.name + '</span><span class="text-white">' + formatRp(l.balance) + '</span></div>'; }
    if (data.liabilities.length === 0) { liabHtml = '<p class="text-sm text-slate-500 pl-4">Tidak ada kewajiban</p>'; }
    var eqHtml = '';
    for (var i = 0; i < data.equities.length; i++) { var e = data.equities[i]; eqHtml += '<div class="flex justify-between py-1 text-sm"><span class="text-slate-400 pl-4">' + e.name + '</span><span class="text-white">' + formatRp(e.balance) + '</span></div>'; }
    container.innerHTML = '<div class="bg-slate-800 p-6 rounded-xl max-w-3xl mx-auto shadow-xl border border-slate-700">' +
        '<div class="text-center mb-6"><h2 class="text-2xl font-black text-white">HAYGROUP</h2><h3 class="text-lg text-amber-400 font-bold">Neraca (Balance Sheet)</h3><p class="text-sm text-slate-400">Per Hari Ini</p></div>' +
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">' +
        '<div><h4 class="font-bold text-white bg-slate-700 px-3 py-2 rounded mb-3">ASET</h4>' + assetHtml + '<div class="flex justify-between py-2 border-t-2 border-slate-500 mt-3 font-bold"><span class="text-white">Total Aset</span><span class="text-amber-400">' + formatRp(data.totalAsset) + '</span></div></div>' +
        '<div><h4 class="font-bold text-white bg-slate-700 px-3 py-2 rounded mb-3">KEWAJIBAN</h4>' + liabHtml +
        '<h4 class="font-bold text-white bg-slate-700 px-3 py-2 rounded mb-3 mt-4">EKUITAS</h4>' + eqHtml +
        '<div class="flex justify-between py-1 text-sm"><span class="text-slate-400 pl-4">Laba Berjalan</span><span class="text-emerald-400">' + formatRp(data.netIncome) + '</span></div>' +
        '<div class="flex justify-between py-2 border-t-2 border-slate-500 mt-3 font-bold"><span class="text-white">Total Pasiva</span><span class="text-amber-400">' + formatRp(data.totalPassiva) + '</span></div></div></div>' +
        '<div class="mt-6 text-center p-3 rounded-lg ' + (data.isBalanced ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700' : 'bg-red-900/30 text-red-400 border border-red-700') + '">' +
        '<i class="fas ' + (data.isBalanced ? 'fa-check-circle' : 'fa-exclamation-triangle') + ' mr-2"></i>Status Neraca: <strong>' + (data.isBalanced ? 'SEIMBANG (Valid IAI)' : 'TIDAK SEIMBANG') + '</strong></div></div>';
}