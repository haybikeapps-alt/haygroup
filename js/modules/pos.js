// js/modules/pos.js
import { supabase } from '../supabaseClient.js';
import * as Accounting from './accounting.js';

// State Keranjang Belanja
let cart = [];
let activeBranchId = 1; // Default HayBike

// Mapping Cabang ke Kode Akun Pendapatan (COA)
const revenueAccountMap = {
    1: '4110', // HayBike
    2: '4120', // HayPop
    3: '4130'  // HayMotret
};

// Ambil produk dari Supabase berdasarkan Cabang
export async function getProducts(branchId) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('branch_id', branchId);
    
    if (error) { console.error("Gagal ambil produk:", error); return []; }
    return data;
}

// Tambah item ke keranjang
export function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    return cart;
}

// Hapus item dari keranjang
export function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    return cart;
}

// Hitung total keranjang
export function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

// Hitung total HPP (Harga Pokok) keranjang
export function getCartCostTotal() {
    return cart.reduce((sum, item) => sum + (item.cost * item.qty), 0);
}

// Kosongkan keranjang
export function clearCart() {
    cart = [];
    return cart;
}

// Set cabang aktif
export function setActiveBranch(branchId) {
    activeBranchId = branchId;
    cart = []; // Reset keranjang jika ganti cabang
    return activeBranchId;
}

export function getActiveBranch() {
    return activeBranchId;
}

// PROSES CHECKOUT (Integrasi Kasir + Akuntansi)
export async function checkout(paymentMethod = 'tunai') {
    if (cart.length === 0) throw new Error("Keranjang kosong!");

    const totalAmount = getCartTotal();
    const totalCost = getCartCostTotal();
    const date = new Date().toISOString().split('T')[0];
    const invoice = `INV-${Date.now()}`;

    try {
        // 1. Simpan Header Transaksi ke Supabase
        const { data: txData, error: txError } = await supabase
            .from('transactions')
            .insert({
                invoice: invoice,
                branch_id: activeBranchId,
                total: totalAmount,
                method: paymentMethod
            })
            .select('id')
            .single();

        if (txError) throw txError;
        const transactionId = txData.id;

        // 2. Simpan Detail Item Transaksi
        const items = cart.map(item => ({
            transaction_id: transactionId,
            product_id: item.id,
            qty: item.qty,
            price: item.price,
            cost: item.cost
        }));

        const { error: itemError } = await supabase.from('transaction_items').insert(items);
        if (itemError) throw itemError;

        // 3. Update Stok di Supabase (Kurangi stok)
        for (let item of cart) {
            const { data: prodData } = await supabase.from('products').select('stock').eq('id', item.id).single();
            if (prodData) {
                await supabase.from('products').update({ stock: prodData.stock - item.qty }).eq('id', item.id);
            }
        }

        // 4. POSTING JURNAL AKUNTANSI OTOMATIS (STANDAR IAI)
        const revCode = revenueAccountMap[activeBranchId];

        // Jurnal 1: Penerimaan Kas dari Penjualan
        await Accounting.postJournal(
            date,
            `Penjualan ${invoice}`,
            [
                { code: '1110', debit: totalAmount, credit: 0 }, // Kas Debit
                { code: revCode, debit: 0, credit: totalAmount } // Pendapatan Kredit
            ],
            transactionId
        );

        // Jurnal 2: Harga Pokok Penjualan (HPP)
        if (totalCost > 0) {
            await Accounting.postJournal(
                date,
                `HPP ${invoice}`,
                [
                    { code: '5110', debit: totalCost, credit: 0 }, // HPP Debit
                    { code: '1140', debit: 0, credit: totalCost } // Persediaan Kredit
                ],
                transactionId
            );
        }

        // 5. Kosongkan keranjang jika sukses
        clearCart();
        return { success: true, invoice: invoice, total: totalAmount };

    } catch (error) {
        console.error("Checkout Gagal:", error);
        throw error;
    }
}
// Tambahkan ini di paling bawah file pos.js

// Ambil data keranjang saat ini untuk di-render UI
export function getCart() {
    return cart;
}
