-- =====================================================================
-- HAYGROUP — ROW LEVEL SECURITY (Bab 9.3)
-- Prinsip: aktifkan RLS di semua tabel, default deny, lalu tambah kebijakan.
-- =====================================================================

-- Aktifkan RLS di semua tabel public (kecuali _number_counters, internal only)
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> '_number_counters'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

revoke all on public._number_counters from anon, authenticated;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
create policy profiles_self_select on public.profiles for select
  using (id = auth.uid() or public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid() or public.auth_has_role('SuperAdmin'));
create policy profiles_admin_write on public.profiles for insert
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy profiles_admin_delete on public.profiles for delete
  using (public.auth_has_role('SuperAdmin'));

-- ---------------------------------------------------------------------
-- RBAC TABLES (roles, permissions, role_permissions, user_roles, user_stores)
-- ---------------------------------------------------------------------
create policy rbac_read_authenticated on public.roles for select using (auth.role() = 'authenticated');
create policy rbac_write_admin on public.roles for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy perm_read_authenticated on public.permissions for select using (auth.role() = 'authenticated');
create policy perm_write_admin on public.permissions for all
  using (public.auth_has_role('SuperAdmin'))
  with check (public.auth_has_role('SuperAdmin'));

create policy rp_read_authenticated on public.role_permissions for select using (auth.role() = 'authenticated');
create policy rp_write_admin on public.role_permissions for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy ur_self_or_admin_select on public.user_roles for select
  using (user_id = auth.uid() or public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy ur_write_admin on public.user_roles for insert
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy ur_delete_admin on public.user_roles for delete
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy us_self_or_admin_select on public.user_stores for select
  using (user_id = auth.uid() or public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy us_write_admin on public.user_stores for insert
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy us_delete_admin on public.user_stores for delete
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

-- ---------------------------------------------------------------------
-- STORES & PENGATURAN
-- ---------------------------------------------------------------------
create policy stores_read_all_authenticated on public.stores for select using (auth.role() in ('authenticated','anon'));
create policy stores_write_admin on public.stores for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy page_settings_public_read on public.page_settings for select using (true);
create policy page_settings_write_admin on public.page_settings for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy pos_settings_store_read on public.pos_settings for select
  using (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy pos_settings_store_write on public.pos_settings for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_has_role('Store Manager'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_has_role('Store Manager'));

create policy ccs_public_read on public.contact_customer_services for select using (true);
create policy ccs_write_admin on public.contact_customer_services for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy couriers_public_read on public.couriers for select using (true);
create policy couriers_write_admin on public.couriers for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy sale_sources_read on public.sale_sources for select using (auth.role() = 'authenticated');
create policy sale_sources_write_admin on public.sale_sources for all
  using (public.auth_has_role('SuperAdmin')) with check (public.auth_has_role('SuperAdmin'));

-- ---------------------------------------------------------------------
-- PRODUK (katalog publik untuk baca, tulis dibatasi unit usaha/master)
-- ---------------------------------------------------------------------
create policy categories_public_read on public.product_categories for select using (is_active = true or auth.role() = 'authenticated');
create policy categories_write_scope on public.product_categories for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator')
         or (store_id = any (public.auth_store_ids()) and public.auth_has_role('Store Manager')))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator')
         or (store_id = any (public.auth_store_ids()) and public.auth_has_role('Store Manager')));

create policy products_public_read on public.products for select using (visibility = 'public' or auth.role() = 'authenticated');
create policy products_write_scope on public.products for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator')
         or (store_id = any (public.auth_store_ids()) and public.auth_has_role('Store Manager')))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator')
         or (store_id = any (public.auth_store_ids()) and public.auth_has_role('Store Manager')));

create policy variants_read on public.product_varians for select using (true);
create policy variants_write on public.product_varians for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_has_role('Store Manager'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_has_role('Store Manager'));

create policy addons_read on public.addons for select using (true);
create policy addons_write on public.addons for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_has_role('Store Manager'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_has_role('Store Manager'));

create policy photos_read on public.product_photos for select using (true);
create policy photos_write on public.product_photos for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_has_role('Store Manager'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_has_role('Store Manager'));

create policy stocks_read_scope on public.product_stocks for select using (auth.role() = 'authenticated');
create policy stocks_write_scope on public.product_stocks for insert
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator')
              or public.auth_has_role('Store Manager') or public.auth_has_role('Kasir'));

create policy reviews_read on public.product_reviews for select using (true);
create policy reviews_write on public.product_reviews for insert with check (true);

create policy menu_cat_read on public.menu_categories for select using (true);
create policy menu_cat_write on public.menu_categories for all
  using (public.auth_has_role('SuperAdmin')) with check (public.auth_has_role('SuperAdmin'));
create policy menu_item_read on public.menu_items for select using (true);
create policy menu_item_write on public.menu_items for all
  using (public.auth_has_role('SuperAdmin')) with check (public.auth_has_role('SuperAdmin'));

-- ---------------------------------------------------------------------
-- ORANG
-- ---------------------------------------------------------------------
create policy employees_scope on public.employees for select
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or store_id = any (public.auth_store_ids()));
create policy employees_write_admin on public.employees for insert
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy employees_update_admin on public.employees for update
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy employees_delete_admin on public.employees for delete
  using (public.auth_has_role('SuperAdmin'));

create policy customers_read on public.customers for select using (auth.role() = 'authenticated');
create policy customers_write on public.customers for insert with check (auth.role() = 'authenticated');
create policy customers_update on public.customers for update using (auth.role() = 'authenticated');

create policy suppliers_read on public.suppliers for select
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_is_finance_role());
create policy suppliers_write on public.suppliers for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy addresses_self on public.user_addresses for all
  using (user_id = auth.uid() or public.auth_has_role('SuperAdmin'))
  with check (user_id = auth.uid() or public.auth_has_role('SuperAdmin'));

-- ---------------------------------------------------------------------
-- POS & ORDER (store-scoped)
-- ---------------------------------------------------------------------
create policy tables_scope on public.tables for select
  using (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'));
create policy tables_write_scope on public.tables for all
  using (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy reservations_scope on public.reservations for select
  using (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'));
create policy reservations_write_scope on public.reservations for all
  using (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'))
  with check (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'));

create policy invoices_scope_select on public.invoices for select
  using (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_is_auditor_or_finance());
create policy invoices_scope_write on public.invoices for insert
  with check (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'));
create policy invoices_scope_update on public.invoices for update
  using (store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'));

create policy invoice_items_scope on public.invoice_items for select
  using (exists (select 1 from public.invoices i where i.id = invoice_id
                 and (i.store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin') or public.auth_is_auditor_or_finance())));
create policy invoice_items_write on public.invoice_items for insert
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and (i.store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'))));
create policy invoice_items_update on public.invoice_items for update
  using (exists (select 1 from public.invoices i where i.id = invoice_id and (i.store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'))));

create policy invoice_item_addons_scope on public.invoice_item_addons for select
  using (exists (select 1 from public.invoice_items ii join public.invoices i on i.id = ii.invoice_id
                 where ii.id = invoice_item_id and (i.store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'))));
create policy invoice_item_addons_write on public.invoice_item_addons for insert
  with check (exists (select 1 from public.invoice_items ii join public.invoices i on i.id = ii.invoice_id
                 where ii.id = invoice_item_id and (i.store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'))));

create policy payments_scope on public.payments for select
  using (exists (select 1 from public.invoices i where i.id = invoice_id and (i.store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin') or public.auth_is_auditor_or_finance())));
create policy payments_write on public.payments for insert
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and (i.store_id = any (public.auth_store_ids()) or public.auth_has_role('SuperAdmin'))));

create policy carts_self on public.carts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy coupons_read on public.coupons for select using (true);
create policy coupons_write on public.coupons for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy orders_self on public.orders for select
  using (user_id = auth.uid() or public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy orders_write on public.orders for insert with check (user_id = auth.uid());
create policy order_products_self on public.order_products for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.auth_has_role('SuperAdmin'))));
create policy order_payments_self on public.order_payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.auth_has_role('SuperAdmin'))));
create policy order_shipments_self on public.order_shipments for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.auth_has_role('SuperAdmin'))));

-- ---------------------------------------------------------------------
-- KONTEN & MARKETING (baca publik untuk yang published, tulis master)
-- ---------------------------------------------------------------------
create policy articles_public_read on public.articles for select using (is_published = true or auth.role() = 'authenticated');
create policy articles_write_admin on public.articles for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy ads_public_read on public.advertisements for select using (is_active = true or auth.role() = 'authenticated');
create policy ads_write_admin on public.advertisements for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy discounts_read on public.program_discounts for select using (true);
create policy discounts_write on public.program_discounts for all
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'))
  with check (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy submissions_insert_public on public.program_submissions for insert with check (true);
create policy submissions_read_admin on public.program_submissions for select
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy affiliate_insert_public on public.affiliate_clicks for insert with check (true);
create policy affiliate_read_admin on public.affiliate_clicks for select using (public.auth_has_role('SuperAdmin'));

create policy newsletter_insert_public on public.newsletters for insert with check (true);
create policy newsletter_read_admin on public.newsletters for select using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy messages_insert_public on public.messages for insert with check (true);
create policy messages_read_admin on public.messages for select using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));
create policy messages_update_admin on public.messages for update using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy analytics_insert_public on public.analytics_events for insert with check (true);
create policy analytics_read_admin on public.analytics_events for select using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator'));

create policy notifications_self on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_self on public.notifications for update using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- KEUANGAN OPERASIONAL (cashflow store-scoped, finance roles)
-- ---------------------------------------------------------------------
create policy cashflows_scope_select on public.cashflows for select
  using (public.auth_is_auditor_or_finance() or store_id = any (public.auth_store_ids()));
create policy cashflows_write_finance on public.cashflows for insert
  with check (public.auth_is_finance_role() or (store_id = any (public.auth_store_ids()) and public.auth_has_role('Store Manager')));

create policy report_sales_read on public.report_sales for select
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or store_id = any (public.auth_store_ids()));
create policy report_sale_drafts_read on public.report_sale_drafts for select
  using (public.auth_has_role('SuperAdmin') or store_id = any (public.auth_store_ids()));
create policy report_sale_items_read on public.report_sale_items for select
  using (public.auth_has_role('SuperAdmin') or public.auth_has_role('Administrator') or public.auth_is_finance_role());

-- ---------------------------------------------------------------------
-- AKUNTANSI (acc_*) — hanya peran keuangan; Auditor read-only (Bab 9.3)
-- ---------------------------------------------------------------------
create policy acc_accounts_read on public.acc_accounts for select using (public.auth_is_auditor_or_finance());
create policy acc_accounts_write on public.acc_accounts for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_periods_read on public.acc_periods for select using (public.auth_is_auditor_or_finance());
create policy acc_periods_write on public.acc_periods for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_journals_read on public.acc_journals for select using (public.auth_is_auditor_or_finance());
create policy acc_journals_write on public.acc_journals for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_journal_lines_read on public.acc_journal_lines for select using (public.auth_is_auditor_or_finance());
create policy acc_journal_lines_write on public.acc_journal_lines for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_audit_logs_read on public.acc_audit_logs for select using (public.auth_is_auditor_or_finance());
-- audit log hanya ditulis via SECURITY DEFINER function (fn_*), tidak ada policy insert untuk role biasa

create policy acc_mappings_read on public.acc_product_account_mappings for select using (public.auth_is_auditor_or_finance());
create policy acc_mappings_write on public.acc_product_account_mappings for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_fixed_assets_read on public.acc_fixed_assets for select using (public.auth_is_auditor_or_finance());
create policy acc_fixed_assets_write on public.acc_fixed_assets for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_depreciations_read on public.acc_fixed_asset_depreciations for select using (public.auth_is_auditor_or_finance());
create policy acc_depreciations_write on public.acc_fixed_asset_depreciations for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_inv_settings_read on public.acc_inventory_settings for select using (public.auth_is_auditor_or_finance());
create policy acc_inv_settings_write on public.acc_inventory_settings for all
  using (public.auth_has_role('SuperAdmin')) with check (public.auth_has_role('SuperAdmin'));

create policy acc_tax_read on public.acc_tax_configs for select using (auth.role() = 'authenticated');
create policy acc_tax_write on public.acc_tax_configs for all
  using (public.auth_has_role('SuperAdmin') or public.auth_is_finance_role())
  with check (public.auth_has_role('SuperAdmin') or public.auth_is_finance_role());

create policy acc_payables_read on public.acc_payables for select using (public.auth_is_auditor_or_finance());
create policy acc_payables_write on public.acc_payables for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());
create policy acc_payable_payments_read on public.acc_payable_payments for select using (public.auth_is_auditor_or_finance());
create policy acc_payable_payments_write on public.acc_payable_payments for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_receivables_read on public.acc_receivables for select using (public.auth_is_auditor_or_finance());
create policy acc_receivables_write on public.acc_receivables for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());
create policy acc_receivable_payments_read on public.acc_receivable_payments for select using (public.auth_is_auditor_or_finance());
create policy acc_receivable_payments_write on public.acc_receivable_payments for all
  using (public.auth_is_finance_role()) with check (public.auth_is_finance_role());

create policy acc_closings_read on public.acc_closings for select using (public.auth_is_auditor_or_finance());
create policy acc_closings_write on public.acc_closings for all
  using (public.auth_has_role('SuperAdmin')) with check (public.auth_has_role('SuperAdmin'));
