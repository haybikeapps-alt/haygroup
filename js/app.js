// js/app.js
import { supabase } from './supabaseClient.js';
import * as Accounting from './modules/accounting.js'; // Panggil Engine Akuntansi

// Register Service Worker untuk PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ Service Worker terdaftar'))
      .catch(err => console.error('❌ Gagal daftar SW:', err));
  });
}

// Fungsi untuk test Engine Akuntansi
async function testAccountingEngine() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = `<div class="p-6 text-amber-400">Menjalankan Engine Akuntansi...</div>`;

    try {
        // TEST 1: Jurnal Modal Awal (Pemilik menyetor Rp 50.000.000)
        await Accounting.postJournal(
            '2023-10-01', 
            'Setoran Modal Awal Pemilik', 
            [
                { code: '1110', debit: 50000000, credit: 0 }, // Kas (Debit)
                { code: '3110', debit: 0, credit: 50000000 }  // Modal (Kredit)
            ]
        );

        // TEST 2: Jurnal Penjualan HayPop (Penjualan Kopi Rp 100.000, Modal Kopi Rp 30.000)
        await Accounting.postJournal(
            '2023-10-02', 
            'Penjualan HayPop - INV001', 
            [
                { code: '1110', debit: 100000, credit: 0 },    // Kas (Debit)
                { code: '4120', debit: 0, credit: 100000 }     // Pendapatan HayPop (Kredit)
            ]
        );

        // TEST 3: Jurnal HPP (Harga Pokok Penjualan)
        await Accounting.postJournal(
            '2023-10-02', 
            'HPP HayPop - INV001', 
            [
                { code: '5110', debit: 30000, credit: 0 },     // HPP (Debit)
                { code: '1140', debit: 0, credit: 30000 }      // Persediaan (Kredit)
            ]
        );

        // TEST 4: Cek Neraca (Harus Seimbang!)
        const balanceSheet = await Accounting.getBalanceSheet();
        const incomeStatement = await Accounting.getIncomeStatement();

        appDiv.innerHTML = `
            <div class="p-6">
                <h1 class="text-2xl font-bold text-emerald-400 mb-4">✅ Engine Akuntansi Berjalan!</h1>
                
                <div class="grid grid-cols-2 gap-6 mb-6">
                    <div class="bg-slate-800 p-4 rounded-lg">
                        <h2 class="text-lg font-bold text-amber-400 mb-2">Laba Rugi</h2>
                        <p>Pendapatan: Rp ${incomeStatement.totalRevenue.toLocaleString('id-ID')}</p>
                        <p>HPP & Beban: Rp ${incomeStatement.totalExpense.toLocaleString('id-ID')}</p>
                        <p class="font-bold text-emerald-400 mt-2">Laba Bersih: Rp ${incomeStatement.netIncome.toLocaleString('id-ID')}</p>
                    </div>
                    
                    <div class="bg-slate-800 p-4 rounded-lg">
                        <h2 class="text-lg font-bold text-amber-400 mb-2">Neraca</h2>
                        <p>Total Aset: Rp ${balanceSheet.totalAsset.toLocaleString('id-ID')}</p>
                        <p>Total Pasiva: Rp ${balanceSheet.totalPassiva.toLocaleString('id-ID')}</p>
                        <p class="font-bold ${balanceSheet.isBalanced ? 'text-emerald-400' : 'text-red-400'} mt-2">
                            Status: ${balanceSheet.isBalanced ? 'SEIMBANG (Valid IAI)' : 'TIDAK SEIMBANG (Error)'}
                        </p>
                    </div>
                </div>
                
                <p class="text-slate-400 text-sm">Cek dashboard Supabase Anda, tabel 'journals' dan 'journal_entries' sekarang seharusnya sudah terisi data.</p>
            </div>
        `;

    } catch (error) {
        appDiv.innerHTML = `<div class="p-6 text-red-400">Error: ${error.message}</div>`;
    }
}

// Jalankan test
testAccountingEngine();
