import { supabase } from '../supabaseClient.js';
import * as Accounting from './accounting.js';

var cart = [];
var activeBranchId = 1;
var revenueAccountMap = { 1: '4110', 2: '4120', 3: '4130' };

export async function getProducts(branchId) {
    var result = await supabase.from('products').select('*').eq('branch_id', branchId);
    if (result.error) { console.error('Gagal ambil produk:', result.error); return []; }
    return result.data;
}

export function addToCart(product) {
    var found = false;
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id === product.id) { cart[i].qty += 1; found = true; break; }
    }
    if (!found) { cart.push({ id: product.id, name: product.name, price: product.price, cost: product.cost, qty: 1 }); }
    return cart;
}

export function removeFromCart(productId) {
    var newCart = [];
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].id !== productId) { newCart.push(cart[i]); }
    }
    cart = newCart;
    return cart;
}

export function getCartTotal() {
    var sum = 0;
    for (var i = 0; i < cart.length; i++) { sum += cart[i].price * cart[i].qty; }
    return sum;
}

export function getCartCostTotal() {
    var sum = 0;
    for (var i = 0; i < cart.length; i++) { sum += cart[i].cost * cart[i].qty; }
    return sum;
}

export function clearCart() { cart = []; return cart; }

export function setActiveBranch(branchId) { activeBranchId = branchId; cart = []; return activeBranchId; }

export function getActiveBranch() { return activeBranchId; }

export function getCart() { return cart; }

export async function checkout(paymentMethod) {
    if (cart.length === 0) throw new Error('Keranjang kosong!');
    var totalAmount = getCartTotal();
    var totalCost = getCartCostTotal();
    var date = new Date().toISOString().split('T')[0];
    var invoice = 'INV-' + Date.now();
    try {
        var res1 = await supabase.from('transactions').insert({
            invoice: invoice, branch_id: activeBranchId, total: totalAmount, method: paymentMethod || 'tunai'
        }).select('id').single();
        if (res1.error) throw res1.error;
        var transactionId = res1.data.id;
        var items = [];
        for (var i = 0; i < cart.length; i++) {
            items.push({ transaction_id: transactionId, product_id: cart[i].id, qty: cart[i].qty, price: cart[i].price, cost: cart[i].cost });
        }
        var res2 = await supabase.from('transaction_items').insert(items);
        if (res2.error) throw res2.error;
        for (var i = 0; i < cart.length; i++) {
            var res3 = await supabase.from('products').select('stock').eq('id', cart[i].id).single();
            if (res3.data) {
                await supabase.from('products').update({ stock: res3.data.stock - cart[i].qty }).eq('id', cart[i].id);
            }
        }
        var revCode = revenueAccountMap[activeBranchId];
        await Accounting.postJournal(date, 'Penjualan ' + invoice, [
            { code: '1110', debit: totalAmount, credit: 0 },
            { code: revCode, debit: 0, credit: totalAmount }
        ], transactionId);
        if (totalCost > 0) {
            await Accounting.postJournal(date, 'HPP ' + invoice, [
                { code: '5110', debit: totalCost, credit: 0 },
                { code: '1140', debit: 0, credit: totalCost }
            ], transactionId);
        }
        clearCart();
        return { success: true, invoice: invoice, total: totalAmount };
    } catch (error) {
        console.error('Checkout Gagal:', error);
        throw error;
    }
}