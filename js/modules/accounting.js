// js/modules/accounting.js
import { supabase } from '../supabaseClient.js';

/**
 * ENGINE AKUNTANSI DOUBLE-ENTRY (STANDAR IAI/PSAK)
 * Modul ini bertanggung jawab untuk:
 * 1. Posting Jurnal (memastikan Debit = Kredit)
 * 2. Menghitung Saldo Akun (Buku Besar)
 * 3. Menghasilkan Laporan Keuangan (Laba Rugi & Neraca)
 */

// Fungsi utama untuk mencatat jurnal
export async function postJournal(date, description, entries, transactionId = null) {
    let totalDebit = 0;
    let totalCredit = 0;

    // 1. Validasi Keseimbangan (Debit HARUS sama dengan Kredit)
    entries.forEach(entry => {
        totalDebit += entry.debit || 0;
        totalCredit += entry.credit || 0;
    });

    if (totalDebit !== totalCredit) {
        throw new Error(`Jurnal tidak seimbang! Debit: ${totalDebit}, Kredit: ${totalCredit}`);
    }

    // 2. Simpan ke Database Supabase
    try {
        // Step A: Simpan Header Jurnal
        const { data: journalData, error: journalError } = await supabase
            .from('journals')
            .insert({
                date: date,
                description: description,
                transaction_id: transactionId
            })
            .select('id')
            .single();

        if (journalError) throw journalError;
        const journalId = journalData.id;

        // Step B: Persiapkan Detail Jurnal (tambahkan journal_id)
        const journalEntries = entries.map(entry => ({
            journal_id: journalId,
            account_code: entry.code,
            debit: entry.debit || 0,
            credit: entry.credit || 0
        }));

        // Step C: Simpan Detail Jurnal
        const { error: entriesError } = await supabase
            .from('journal_entries')
            .insert(journalEntries);

        if (entriesError) throw entriesError;

        return { success: true, journalId: journalId };

    } catch (error) {
        console.error("Gagal posting jurnal:", error);
        throw error;
    }
}

// Fungsi untuk menghitung saldo satu akun (Buku Besar)
export async function getAccountBalance(accountCode) {
    try {
        // Ambil info akun (apakah normalnya Debit atau Kredit)
        const { data: accountData, error: accError } = await supabase
            .from('accounts')
            .select('is_debit')
            .eq('code', accountCode)
            .single();

        if (accError) throw accError;

        // Hitung total Debit dan Kredit dari jurnal
        const { data: entries, error: entryError } = await supabase
            .from('journal_entries')
            .select('debit, credit')
            .eq('account_code', accountCode);

        if (entryError) throw entryError;

        let totalDebit = 0;
        let totalCredit = 0;
        entries.forEach(e => {
            totalDebit += e.debit;
            totalCredit += e.credit;
        });

        // Hitung Saldo berdasarkan sisi normal akun
        if (accountData.is_debit) {
            return totalDebit - totalCredit; // Aset & Beban
        } else {
            return totalCredit - totalDebit; // Kewajiban, Ekuitas, Pendapatan
        }
    } catch (error) {
        console.error("Gagal menghitung saldo:", error);
        return 0;
    }
}

// Fungsi untuk generate Laporan Laba Rugi
export async function getIncomeStatement() {
    try {
        // Ambil saldo akun Pendapatan (4xxx)
        const { data: revenues } = await supabase.from('accounts').select('code, name').like('code', '4%');
        const { data: expenses } = await supabase.from('accounts').select('code, name').like('code', '5%');

        let totalRevenue = 0;
        const revenueDetails = [];

        for (let rev of revenues) {
            const balance = await getAccountBalance(rev.code);
            if (balance > 0) {
                revenueDetails.push({ ...rev, balance });
                totalRevenue += balance;
            }
        }

        let totalExpense = 0;
        const expenseDetails = [];

        for (let exp of expenses) {
            const balance = await getAccountBalance(exp.code);
            if (balance > 0) {
                expenseDetails.push({ ...exp, balance });
                totalExpense += balance;
            }
        }

        const netIncome = totalRevenue - totalExpense;

        return {
            revenues: revenueDetails,
            totalRevenue,
            expenses: expenseDetails,
            totalExpense,
            netIncome
        };
    } catch (error) {
        console.error("Gagal membuat Laba Rugi:", error);
    }
}

// Fungsi untuk generate Neraca (Balance Sheet)
export async function getBalanceSheet() {
    try {
        const { data: assets } = await supabase.from('accounts').select('code, name').like('code', '1%');
        const { data: liabilities } = await supabase.from('accounts').select('code, name').like('code', '2%');
        const { data: equities } = await supabase.from('accounts').select('code, name').like('code', '3%');

        let totalAsset = 0;
        const assetDetails = [];
        for (let a of assets) {
            const balance = await getAccountBalance(a.code);
            if (balance > 0) { assetDetails.push({ ...a, balance }); totalAsset += balance; }
        }

        let totalLiability = 0;
        const liabilityDetails = [];
        for (let l of liabilities) {
            const balance = await getAccountBalance(l.code);
            if (balance > 0) { liabilityDetails.push({ ...l, balance }); totalLiability += balance; }
        }

        let totalEquity = 0;
        const equityDetails = [];
        for (let e of equities) {
            const balance = await getAccountBalance(e.code);
            if (balance > 0) { equityDetails.push({ ...e, balance }); totalEquity += balance; }
        }

        // Tambahkan Laba Berjalan ke Ekuitas
        const incomeStatement = await getIncomeStatement();
        totalEquity += incomeStatement.netIncome;

        const totalPassiva = totalLiability + totalEquity;

        return {
            assets: assetDetails, totalAsset,
            liabilities: liabilityDetails, totalLiability,
            equities: equityDetails, totalEquity,
            netIncome: incomeStatement.netIncome,
            totalPassiva,
            isBalanced: totalAsset === totalPassiva // Validasi Neraca
        };
    } catch (error) {
        console.error("Gagal membuat Neraca:", error);
    }
}
