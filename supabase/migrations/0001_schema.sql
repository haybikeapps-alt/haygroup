-- =====================================================================
-- HAYGROUP — SKEMA DATABASE (Supabase / PostgreSQL)
-- Rewrite total dari Laravel+MySQL -> Supabase, TANPA migrasi data lama.
-- Urutan: extensions -> auth&akses -> master&unit -> produk -> orang ->
--         pos&order -> konten&marketing -> keuangan operasional -> akuntansi (acc_*)
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- pencarian teks (opsional, produk/artikel)

-- =====================================================================
-- 1. AUTH & AKSES
-- =====================================================================

-- Mirror profil dari auth.users (Supabase Auth mengelola kredensial)
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text not null,
  email               text not null unique,
  phone               text,
  avatar_path         text,
  status              text not null default 'active' check (status in ('active','inactive')),
  must_change_password boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,          -- SuperAdmin, Administrator, Manajer Keuangan, Accounting, Auditor, Kasir, Store Manager, Dapur
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table public.permissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,   -- mis. 'Menu Kasir', 'Menu Produk', dst (Bab 4.3)
  group_name text,                    -- pengelompokan menu
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  can_view      boolean not null default false,  -- Lihat
  can_create    boolean not null default false,  -- Tambah
  can_update    boolean not null default false,  -- Ubah
  can_delete    boolean not null default false,  -- Hapus
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- =====================================================================
-- 2. MASTER & UNIT USAHA
-- =====================================================================

create table public.stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,             -- Haybike / Haypop / Hay Motret
  slug        text not null unique,
  code        text not null unique,       -- HAYBIKE / HAYPOP / HAYMOTRET
  address     text,
  email       text,
  phone       text,
  description text,
  photo_path  text,
  postal_code text,
  status      text not null default 'active' check (status in ('active','inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table public.user_stores (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  primary key (user_id, store_id)
);

-- key-value store konten situs (identitas, SEO, homepage, about, kontak, sosmed, kebijakan, dll)
create table public.page_settings (
  id                 uuid primary key default gen_random_uuid(),
  parameter          text not null unique,
  group_name         text not null,     -- identity, seo, homepage, about, contact, social-media, policy, courier-settings, payment-method-settings, tax-settings
  value              text,
  photo_path         text,
  editable_parameter boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- pengaturan POS per unit usaha (key-value scoped store_id)
create table public.pos_settings (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  parameter  text not null,             -- tax_rate, service_charge_rate, receipt_footer, printer_name, currency, ...
  value      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, parameter)
);

create table public.contact_customer_services (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  priority   int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.couriers (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  code      text not null unique,
  is_active boolean not null default true
);

create table public.sale_sources (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique
);

-- =====================================================================
-- 3. PRODUK
-- =====================================================================

create table public.product_categories (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  name       text not null,
  slug       text not null,
  description text,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (store_id, slug)
);

create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  store_id             uuid not null references public.stores(id) on delete cascade,
  category_id          uuid references public.product_categories(id) on delete set null,
  name                 text not null,
  slug                 text not null,
  sku                  text,
  description          text,
  price                numeric(18,2) not null default 0,
  cost_price           numeric(18,2) not null default 0,
  weight               numeric(10,2),
  unit                 text default 'pcs',
  product_type         text not null default 'goods' check (product_type in ('goods','service')), -- barang vs jasa
  is_stock_tracked     boolean not null default true,
  stock_qty            numeric(18,2) not null default 0,   -- ringkasan stok berjalan (detail di product_stocks)
  status               text not null default 'active' check (status in ('active','inactive')),
  visibility           text not null default 'public' check (visibility in ('public','hidden')),
  -- kolom akuntansi (Bab 6.2)
  inventory_account_id uuid,
  sales_account_id     uuid,
  cogs_account_id      uuid,
  return_account_id    uuid,
  discount_account_id  uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  unique (store_id, slug)
);

create table public.product_varians (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name       text not null,     -- Small/Medium/Large
  price      numeric(18,2) not null default 0,
  sku        text,
  is_active  boolean not null default true,
  sort_order int not null default 0
);

create table public.addons (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade, -- null = berlaku semua produk store
  name       text not null,     -- extra shot, boba, keju
  price      numeric(18,2) not null default 0,
  is_active  boolean not null default true
);

create table public.product_photos (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path       text not null,
  is_primary boolean not null default false,
  sort_order int not null default 0
);

create table public.product_stocks (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  type        text not null check (type in ('in','out','adjustment')),
  qty         numeric(18,2) not null,
  unit_cost   numeric(18,2) default 0,
  source      text,                  -- purchase, pos_sale, adjustment, return
  supplier_id uuid,
  weight      numeric(10,2),
  note        text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  customer_id uuid,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create table public.menu_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order int not null default 0
);

create table public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.menu_categories(id) on delete cascade,
  label       text not null,
  url         text,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

-- =====================================================================
-- 4. ORANG (karyawan, pelanggan, supplier)
-- =====================================================================

create table public.employees (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  store_id   uuid references public.stores(id) on delete set null,
  position   text,
  status     text not null default 'active' check (status in ('active','inactive')),
  joined_at  date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  address    text,
  note       text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  address    text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.user_addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  label      text,
  address    text not null,
  is_primary boolean not null default false
);

-- =====================================================================
-- 5. POS & ORDER
-- =====================================================================

create table public.tables (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  name       text not null,
  capacity   int default 2,
  status     text not null default 'available' check (status in ('available','occupied','reserved'))
);

create table public.reservations (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores(id) on delete cascade,
  table_id         uuid references public.tables(id) on delete set null,
  product_id       uuid references public.products(id) on delete set null, -- paket foto dsb
  customer_name    text not null,
  phone            text,
  reservation_date date not null,
  reservation_time time,
  status           text not null default 'booked' check (status in ('booked','confirmed','completed','canceled')),
  dp_amount        numeric(18,2) default 0,
  note             text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now()
);

create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_number  text not null unique,     -- INV-YYYYMMDD-#### per store
  store_id        uuid not null references public.stores(id),
  user_id         uuid references public.profiles(id),   -- kasir
  table_id        uuid references public.tables(id),
  customer_id     uuid references public.customers(id),
  reservation_id  uuid references public.reservations(id),
  order_type      text not null default 'takeaway' check (order_type in ('dine_in','takeaway','delivery','service')),
  status          text not null default 'pending' check (status in ('draft','pending','completed','canceled')),
  subtotal        numeric(18,2) not null default 0,
  discount        numeric(18,2) not null default 0,
  tax             numeric(18,2) not null default 0,
  service_charge  numeric(18,2) not null default 0,
  total           numeric(18,2) not null default 0,
  paid_amount     numeric(18,2) not null default 0,
  change_amount   numeric(18,2) not null default 0,
  is_draft        boolean not null default false,
  note            text,
  served_at       timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table public.invoice_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices(id) on delete cascade,
  product_id       uuid references public.products(id),
  variant_id        uuid references public.product_varians(id),
  name_snapshot    text not null,
  category_snapshot text,
  qty              numeric(18,2) not null default 1,
  price            numeric(18,2) not null default 0,
  cost_price       numeric(18,2) not null default 0,
  discount         numeric(18,2) not null default 0,
  subtotal         numeric(18,2) not null default 0,
  note             text,       -- mis. nama pelanggan + no rangka sepeda (servis Haybike)
  kitchen_status   text default 'pending' check (kitchen_status in ('pending','preparing','ready','served'))
);

create table public.invoice_item_addons (
  id              uuid primary key default gen_random_uuid(),
  invoice_item_id uuid not null references public.invoice_items(id) on delete cascade,
  addon_id        uuid references public.addons(id),
  name_snapshot   text not null,
  price           numeric(18,2) not null default 0
);

create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  method     text not null check (method in ('cash','qris','transfer','xendit')),
  amount     numeric(18,2) not null,
  status     text not null default 'pending' check (status in ('pending','paid','failed')),
  reference  text,           -- id transaksi Xendit
  paid_at    timestamptz,
  created_at timestamptz not null default now()
);

-- marketplace/frontpage (opsional, dipertahankan dari app lama)
create table public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  qty        numeric(18,2) not null default 1,
  created_at timestamptz not null default now()
);

create table public.coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  type        text not null check (type in ('percent','fixed')),
  value       numeric(18,2) not null,
  quota       int,
  expires_at  timestamptz,
  is_active   boolean not null default true
);

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null unique,
  user_id        uuid references public.profiles(id),
  status         text not null default 'pending',
  subtotal       numeric(18,2) not null default 0,
  shipping_cost  numeric(18,2) not null default 0,
  discount       numeric(18,2) not null default 0,
  total          numeric(18,2) not null default 0,
  coupon_id      uuid references public.coupons(id),
  created_at     timestamptz not null default now()
);

create table public.order_products (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  qty        numeric(18,2) not null default 1,
  price      numeric(18,2) not null default 0
);

create table public.order_payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  method     text,
  amount     numeric(18,2) not null,
  status     text default 'pending',
  reference  text,
  paid_at    timestamptz
);

create table public.order_shipments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  courier_id    uuid references public.couriers(id),
  tracking_no   text,
  status        text default 'pending',
  shipped_at    timestamptz,
  delivered_at  timestamptz
);

-- =====================================================================
-- 6. KONTEN & MARKETING
-- =====================================================================

create table public.articles (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  content      text,
  cover_photo  text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table public.advertisements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  image_path text,
  link       text,
  position   text default 'homepage',
  is_active  boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz
);

create table public.program_discounts (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid references public.stores(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('percent','fixed')),
  value      numeric(18,2) not null,
  start_date date,
  end_date   date,
  is_active  boolean not null default true
);

create table public.program_submissions (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,   -- affiliate, supplier, promosi, mitra
  name       text not null,
  email      text,
  phone      text,
  message    text,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table public.affiliate_clicks (
  id         uuid primary key default gen_random_uuid(),
  source     text,
  url        text,
  ip_address text,
  created_at timestamptz not null default now()
);

create table public.newsletters (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  subscribed_at   timestamptz not null default now()
);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  subject    text,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  event_type text not null,     -- visit, whatsapp_click, conversion
  page       text,
  store_id   uuid references public.stores(id),
  user_id    uuid references public.profiles(id),
  ip_address text,
  metadata   jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  title      text not null,
  body       text,
  type       text,
  data       jsonb default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 7. KEUANGAN (OPERASIONAL, non acc_*)
-- =====================================================================

create table public.cashflows (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid references public.stores(id),
  type        text not null check (type in ('in','out')),
  code        text not null,   -- DBP/DBE/DBO/DBA/CRG/CRS/CRP (Bab 8.6)
  amount      numeric(18,2) not null,
  description text,
  cashflow_date date not null default current_date,
  account_id  uuid,            -- references acc_accounts(id), FK ditambahkan setelah acc_accounts dibuat
  journal_id  uuid,            -- references acc_journals(id)
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table public.report_sales (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid references public.stores(id),
  period_date date not null,
  total_sales numeric(18,2) not null default 0,
  total_items int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.report_sale_drafts (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid references public.stores(id),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table public.report_sale_items (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid references public.report_sales(id) on delete cascade,
  product_id  uuid references public.products(id),
  qty         numeric(18,2) not null default 0,
  total       numeric(18,2) not null default 0
);

-- =====================================================================
-- 8. AKUNTANSI (prefix acc_) — SAK EMKM
-- =====================================================================

create table public.acc_accounts (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name           text not null,
  account_type   text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  parent_id      uuid references public.acc_accounts(id) on delete set null,
  level          int not null default 1,
  normal_balance text not null check (normal_balance in ('debit','credit')),
  is_active      boolean not null default true,
  description    text,
  created_by     uuid references public.profiles(id),
  updated_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

alter table public.cashflows
  add constraint cashflows_account_id_fkey foreign key (account_id) references public.acc_accounts(id);

alter table public.products
  add constraint products_inventory_account_fkey foreign key (inventory_account_id) references public.acc_accounts(id),
  add constraint products_sales_account_fkey     foreign key (sales_account_id)     references public.acc_accounts(id),
  add constraint products_cogs_account_fkey      foreign key (cogs_account_id)      references public.acc_accounts(id),
  add constraint products_return_account_fkey    foreign key (return_account_id)    references public.acc_accounts(id),
  add constraint products_discount_account_fkey  foreign key (discount_account_id)  references public.acc_accounts(id);

create table public.acc_periods (
  id          uuid primary key default gen_random_uuid(),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'open' check (status in ('open','closed')),
  closed_by   uuid references public.profiles(id),
  closed_at   timestamptz,
  unique (period_year, period_month)
);

create table public.acc_journals (
  id             uuid primary key default gen_random_uuid(),
  journal_number text not null unique,     -- JRN-YYYYMM-#####
  journal_date   date not null default current_date,
  reference      text,
  description    text,
  status         text not null default 'draft' check (status in ('draft','posted','canceled')),
  source_type    text,          -- invoice, cashflow, payable_payment, receivable_payment, depreciation, manual, closing
  source_id      uuid,
  period_id      uuid references public.acc_periods(id),
  posted_by      uuid references public.profiles(id),
  posted_at      timestamptz,
  canceled_by    uuid references public.profiles(id),
  canceled_at    timestamptz,
  created_by     uuid references public.profiles(id),
  updated_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- cegah jurnal ganda dari sumber yang sama (Bab 8.6)
create unique index acc_journals_source_unique on public.acc_journals (source_type, source_id) where source_id is not null;

alter table public.cashflows
  add constraint cashflows_journal_id_fkey foreign key (journal_id) references public.acc_journals(id);

create table public.acc_journal_lines (
  id          uuid primary key default gen_random_uuid(),
  journal_id  uuid not null references public.acc_journals(id) on delete cascade,
  account_id  uuid not null references public.acc_accounts(id),
  description text,
  debit       numeric(18,2) not null default 0,
  credit      numeric(18,2) not null default 0,
  line_order  int not null default 0,
  constraint acc_journal_lines_not_both check (not (debit > 0 and credit > 0)),
  constraint acc_journal_lines_positive check (debit >= 0 and credit >= 0)
);

create table public.acc_audit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id),
  module       text not null,       -- coa, journal, closing, payable, receivable, fixed_asset, pos, ...
  action       text not null,       -- create, update, delete, post, cancel, close, reopen
  subject_type text,
  subject_id   uuid,
  ip_address   text,
  browser      text,
  old_values   jsonb,
  new_values   jsonb,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create table public.acc_product_account_mappings (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products(id) on delete cascade,
  inventory_account_id  uuid references public.acc_accounts(id),
  sales_account_id      uuid references public.acc_accounts(id),
  cogs_account_id       uuid references public.acc_accounts(id),
  return_account_id     uuid references public.acc_accounts(id),
  discount_account_id   uuid references public.acc_accounts(id),
  unique (product_id)
);

create table public.acc_fixed_assets (
  id                 uuid primary key default gen_random_uuid(),
  asset_code         text not null unique,
  name               text not null,
  category           text,
  location           text,
  purchase_date      date not null,
  acquisition_cost   numeric(18,2) not null,
  useful_life_months int not null,
  residual_value     numeric(18,2) not null default 0,
  depreciation_method text not null default 'straight_line' check (depreciation_method in ('straight_line','declining_balance')),
  qr_code_path       text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create table public.acc_fixed_asset_depreciations (
  id                      uuid primary key default gen_random_uuid(),
  fixed_asset_id          uuid not null references public.acc_fixed_assets(id) on delete cascade,
  period_year             int not null,
  period_month            int not null,
  depreciation_amount     numeric(18,2) not null,
  accumulated_depreciation numeric(18,2) not null,
  book_value              numeric(18,2) not null,
  journal_id              uuid references public.acc_journals(id),
  created_at              timestamptz not null default now(),
  unique (fixed_asset_id, period_year, period_month)
);

create table public.acc_inventory_settings (
  id               uuid primary key default gen_random_uuid(),
  valuation_method text not null default 'average' check (valuation_method in ('average','fifo','lifo')),
  lifo_enabled     boolean not null default false
);

create table public.acc_tax_configs (
  id         uuid primary key default gen_random_uuid(),
  tax_code   text not null unique,   -- PPN, PPH, SC (service charge)
  name       text not null,
  rate       numeric(6,4) not null,  -- 0.1100 = 11%
  is_active  boolean not null default true
);

create table public.acc_payables (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references public.suppliers(id),
  invoice_number text not null,
  invoice_date   date not null,
  due_date       date not null,
  total_amount   numeric(18,2) not null,
  paid_amount    numeric(18,2) not null default 0,
  status         text not null default 'open' check (status in ('open','partial','paid','overdue')),
  created_at     timestamptz not null default now()
);

create table public.acc_payable_payments (
  id          uuid primary key default gen_random_uuid(),
  payable_id  uuid not null references public.acc_payables(id) on delete cascade,
  amount      numeric(18,2) not null,
  method      text,
  paid_at     timestamptz not null default now(),
  journal_id  uuid references public.acc_journals(id),
  created_by  uuid references public.profiles(id)
);

create table public.acc_receivables (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references public.customers(id),
  invoice_id   uuid references public.invoices(id),
  invoice_date date not null,
  due_date     date not null,
  total_amount numeric(18,2) not null,
  paid_amount  numeric(18,2) not null default 0,
  status       text not null default 'open' check (status in ('open','partial','paid','overdue')),
  created_at   timestamptz not null default now()
);

create table public.acc_receivable_payments (
  id             uuid primary key default gen_random_uuid(),
  receivable_id  uuid not null references public.acc_receivables(id) on delete cascade,
  amount         numeric(18,2) not null,
  method         text,
  paid_at        timestamptz not null default now(),
  journal_id     uuid references public.acc_journals(id),
  created_by     uuid references public.profiles(id)
);

create table public.acc_closings (
  id           uuid primary key default gen_random_uuid(),
  period_year  int not null,
  period_month int,             -- null = penutupan tahunan
  closing_type text not null check (closing_type in ('monthly','yearly')),
  status       text not null default 'closed' check (status in ('closed','reopened')),
  closed_by    uuid references public.profiles(id),
  reopened_by  uuid references public.profiles(id),
  closed_at    timestamptz not null default now(),
  reopened_at  timestamptz,
  notes        text
);

-- =====================================================================
-- INDEX PENDUKUNG
-- =====================================================================
create index idx_invoices_store on public.invoices (store_id, created_at desc);
create index idx_invoice_items_invoice on public.invoice_items (invoice_id);
create index idx_products_store on public.products (store_id, category_id);
create index idx_journal_lines_journal on public.acc_journal_lines (journal_id);
create index idx_journal_lines_account on public.acc_journal_lines (account_id);
create index idx_journals_period on public.acc_journals (period_id, status);
create index idx_cashflows_store on public.cashflows (store_id, cashflow_date desc);
create index idx_user_stores_user on public.user_stores (user_id);
create index idx_audit_logs_subject on public.acc_audit_logs (subject_type, subject_id);
