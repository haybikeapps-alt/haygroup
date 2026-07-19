// src/lib/realtime.js
import { supabase } from "./supabase.js";

/**
 * Subscribe perubahan invoice_items (kitchen_status) untuk satu store.
 * Menggantikan event Laravel Reverb "KitchenInvoicesUpdated" (Bab 7.3).
 */
export function subscribeKitchen(storeId, onChange) {
  const channel = supabase
    .channel(`kitchen-${storeId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "invoice_items" },
      (payload) => onChange(payload)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Subscribe invoice baru masuk untuk satu store (layar kasir & dapur). */
export function subscribeNewOrders(storeId, onInsert) {
  const channel = supabase
    .channel(`orders-${storeId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "invoices", filter: `store_id=eq.${storeId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Subscribe notifikasi realtime untuk user Master ("NewOrderPlaced"). */
export function subscribeNotifications(userId, onInsert) {
  const channel = supabase
    .channel(`notif-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
