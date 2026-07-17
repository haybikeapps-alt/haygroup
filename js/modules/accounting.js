import { supabase } from '../supabaseClient.js';

export async function postJournal(date, description, entries, transactionId) {
    var totalDebit = 0;
    var totalCredit = 0;
    for (var i = 0; i < entries.length; i++) {
        totalDebit += entries[i].debit || 0;
        totalCredit += entries[i].credit || 0;
    }
    if (totalDebit !== totalCredit) {
        throw new Error('Jurnal tidak seimbang! Debit: ' + totalDebit + ', Kredit: ' + totalCredit);
    }
    try {
        var result = await supabase.from('journals').insert({
            date: date, description: description, transaction_id: transactionId || null
        }).select('id').single();
        if (result.error) throw result.error;
        var journalId = result.data.id;
        var journalEntries = [];
        for (var i = 0; i < entries.length; i++) {
            journalEntries.push({
                journal_id: journalId,
                account_code: entries[i].code,
                debit: entries[i].debit || 0,
                credit: entries[i].credit || 0
            });
        }
        var res = await supabase.from('journal_entries').insert(journalEntries);
        if (res.error) throw res.error;
        return { success: true, journalId: journalId };
    } catch (error) {
        console.error('Gagal posting jurnal:', error);
        throw error;
    }
}

export async function getAccountBalance(accountCode) {
    try {
        var res1 = await supabase.from('accounts').select('is_debit').eq('code', accountCode).single();
        if (res1.error) throw res1.error;
        var isDebit = res1.data.is_debit;
        var res2 = await supabase.from('journal_entries').select('debit, credit').eq('account_code', accountCode);
        if (res2.error) throw res2.error;
        var totalDebit = 0;
        var totalCredit = 0;
        for (var i = 0; i < res2.data.length; i++) {
            totalDebit += res2.data[i].debit;
            totalCredit += res2.data[i].credit;
        }
        return isDebit ? (totalDebit - totalCredit) : (totalCredit - totalDebit);
    } catch (error) {
        console.error('Gagal menghitung saldo:', error);
        return 0;
    }
}

export async function getIncomeStatement() {
    try {
        var res1 = await supabase.from('accounts').select('code, name').like('code', '4%');
        var res2 = await supabase.from('accounts').select('code, name').like('code', '5%');
        var totalRevenue = 0;
        var revenueDetails = [];
        for (var i = 0; i < res1.data.length; i++) {
            var balance = await getAccountBalance(res1.data[i].code);
            if (balance > 0) {
                revenueDetails.push({ code: res1.data[i].code, name: res1.data[i].name, balance: balance });
                totalRevenue += balance;
            }
        }
        var totalExpense = 0;
        var expenseDetails = [];
        for (var i = 0; i < res2.data.length; i++) {
            var balance = await getAccountBalance(res2.data[i].code);
            if (balance > 0) {
                expenseDetails.push({ code: res2.data[i].code, name: res2.data[i].name, balance: balance });
                totalExpense += balance;
            }
        }
        return {
            revenues: revenueDetails, totalRevenue: totalRevenue,
            expenses: expenseDetails, totalExpense: totalExpense,
            netIncome: totalRevenue - totalExpense
        };
    } catch (error) { console.error('Gagal membuat Laba Rugi:', error); }
}

export async function getBalanceSheet() {
    try {
        var res1 = await supabase.from('accounts').select('code, name').like('code', '1%');
        var res2 = await supabase.from('accounts').select('code, name').like('code', '2%');
        var res3 = await supabase.from('accounts').select('code, name').like('code', '3%');
        var totalAsset = 0; var assetDetails = [];
        for (var i = 0; i < res1.data.length; i++) {
            var b = await getAccountBalance(res1.data[i].code);
            if (b > 0) { assetDetails.push({ code: res1.data[i].code, name: res1.data[i].name, balance: b }); totalAsset += b; }
        }
        var totalLiability = 0; var liabilityDetails = [];
        for (var i = 0; i < res2.data.length; i++) {
            var b = await getAccountBalance(res2.data[i].code);
            if (b > 0) { liabilityDetails.push({ code: res2.data[i].code, name: res2.data[i].name, balance: b }); totalLiability += b; }
        }
        var totalEquity = 0; var equityDetails = [];
        for (var i = 0; i < res3.data.length; i++) {
            var b = await getAccountBalance(res3.data[i].code);
            if (b > 0) { equityDetails.push({ code: res3.data[i].code, name: res3.data[i].name, balance: b }); totalEquity += b; }
        }
        var incomeStatement = await getIncomeStatement();
        totalEquity += incomeStatement.netIncome;
        var totalPassiva = totalLiability + totalEquity;
        return {
            assets: assetDetails, totalAsset: totalAsset,
            liabilities: liabilityDetails, totalLiability: totalLiability,
            equities: equityDetails, totalEquity: totalEquity,
            netIncome: incomeStatement.netIncome,
            totalPassiva: totalPassiva,
            isBalanced: totalAsset === totalPassiva
        };
    } catch (error) { console.error('Gagal membuat Neraca:', error); }
} 