-- =====================================================================
-- HAYGROUP — SEED DATA (Bab 13)
-- Jalankan SETELAH migrations. Password awal semua akun: Haygroup#2026
-- Catatan: insert ke auth.users ini cocok untuk Supabase LOCAL DEV
-- (supabase start / supabase db reset). Untuk PROJECT PRODUCTION,
-- buat user lewat Supabase Auth Admin API / Dashboard, lalu jalankan
-- bagian "DATA NON-AUTH" saja (lihat catatan di bawah).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. STORES (3 unit usaha)
-- ---------------------------------------------------------------------
insert into public.stores (id, name, slug, code, status) values
  ('11111111-1111-1111-1111-111111111111', 'Haybike',    'haybike',    'HAYBIKE',    'active'),
  ('22222222-2222-2222-2222-222222222222', 'Haypop',     'haypop',     'HAYPOP',     'active'),
  ('33333333-3333-3333-3333-333333333333', 'Hay Motret', 'hay-motret', 'HAYMOTRET',  'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 1. ROLES (Bab 4.2)
-- ---------------------------------------------------------------------
insert into public.roles (id, name, description) values
  ('a0000000-0000-0000-0000-000000000001', 'SuperAdmin',          'Akses semua permission (akun Master)'),
  ('a0000000-0000-0000-0000-000000000002', 'Administrator',       'Akses semua kecuali penghapusan permanen sistem'),
  ('a0000000-0000-0000-0000-000000000003', 'Manajer Keuangan',    'Modul Keuangan & Akuntansi penuh, tanpa akses POS'),
  ('a0000000-0000-0000-0000-000000000004', 'Accounting',          'Input jurnal, COA, buku besar, tanpa closing/hapus'),
  ('a0000000-0000-0000-0000-000000000005', 'Auditor',             'Read-only seluruh modul keuangan + audit log'),
  ('a0000000-0000-0000-0000-000000000006', 'Kasir',               'Menu Kasir (POS), Meja, Reservasi, Dapur sesuai unit'),
  ('a0000000-0000-0000-0000-000000000007', 'Store Manager',       'Kasir + kelola produk/stok/laporan unitnya'),
  ('a0000000-0000-0000-0000-000000000008', 'Dapur',               'Layar dapur (khusus Haypop)')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. PERMISSIONS (Bab 4.3) — 24 menu inti
-- ---------------------------------------------------------------------
insert into public.permissions (name, group_name)
select m, 'menu' from unnest(array[
  'Menu Kasir','Menu Meja','Menu Reservasi','Menu Dapur','Menu Pesanan','Menu Produk',
  'Menu Kategori Produk','Menu Stok Produk','Menu Laporan','Menu Keuangan','Menu Akuntansi',
  'Menu Toko','Menu Transaksi','Menu Karyawan','Menu Customer','Menu Supplier','Menu Halaman',
  'Menu Pengguna','Menu Role','Menu Artikel','Menu Pengiklanan','Menu Pesan','Menu Pelangganan',
  'Menu Program Diskon','Menu Database','QR Scan'
]) as m
on conflict (name) do nothing;

-- SuperAdmin: semua permission, semua akses (Lihat/Tambah/Ubah/Hapus)
insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_update, can_delete)
select 'a0000000-0000-0000-0000-000000000001', id, true, true, true, true from public.permissions
on conflict (role_id, permission_id) do nothing;

-- Kasir: hanya menu operasional kasir
insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_update, can_delete)
select 'a0000000-0000-0000-0000-000000000006', id, true, true, false, false
from public.permissions
where name in ('Menu Kasir','Menu Meja','Menu Reservasi','Menu Dapur','Menu Pesanan','Menu Laporan','QR Scan')
on conflict (role_id, permission_id) do nothing;

-- Manajer Keuangan / Accounting / Auditor: menu keuangan & akuntansi
insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_update, can_delete)
select 'a0000000-0000-0000-0000-000000000003', id, true, true, true, true
from public.permissions where name in ('Menu Keuangan','Menu Akuntansi','Menu Laporan','Menu Transaksi')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_update, can_delete)
select 'a0000000-0000-0000-0000-000000000004', id, true, true, true, false
from public.permissions where name in ('Menu Keuangan','Menu Akuntansi','Menu Laporan')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_update, can_delete)
select 'a0000000-0000-0000-0000-000000000005', id, true, false, false, false
from public.permissions where name in ('Menu Keuangan','Menu Akuntansi','Menu Laporan')
on conflict (role_id, permission_id) do nothing;

-- ---------------------------------------------------------------------
-- 3. AKUN (auth.users) — 4 akun wajib (Bab 4.1)
--    Password: Haygroup#2026  (WAJIB ganti di login pertama -> must_change_password)
-- ---------------------------------------------------------------------
do $$
declare
  v_password text := crypt('Haygroup#2026', gen_salt('bf'));
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
  v_users jsonb := '[
    {"id":"b0000000-0000-0000-0000-000000000001","email":"master@haygroup.id","name":"Master HayGroup"},
    {"id":"b0000000-0000-0000-0000-000000000002","email":"kasir.haybike@haygroup.id","name":"Kasir Haybike"},
    {"id":"b0000000-0000-0000-0000-000000000003","email":"kasir.haypop@haygroup.id","name":"Kasir Haypop"},
    {"id":"b0000000-0000-0000-0000-000000000004","email":"kasir.haymotret@haygroup.id","name":"Kasir Hay Motret"}
  ]'::jsonb;
  u jsonb;
begin
  for u in select * from jsonb_array_elements(v_users) loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) values (
      v_instance, (u->>'id')::uuid, 'authenticated', 'authenticated', u->>'email', v_password,
      now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('name', u->>'name'),
      now(), now(), '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), (u->>'id'), (u->>'id')::uuid,
      jsonb_build_object('sub', u->>'id', 'email', u->>'email'),
      'email', now(), now(), now()
    ) on conflict do nothing;

    insert into public.profiles (id, name, email, status, must_change_password)
    values ((u->>'id')::uuid, u->>'name', u->>'email', 'active', true)
    on conflict (id) do nothing;
  end loop;
end $$;

-- Assign role
insert into public.user_roles (user_id, role_id) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'), -- master -> SuperAdmin
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006'), -- kasir haybike -> Kasir
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006'), -- kasir haypop -> Kasir
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006')  -- kasir hay motret -> Kasir
on conflict do nothing;

-- Assign store (Master = semua store, kasir = store masing-masing)
insert into public.user_stores (user_id, store_id) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222'),
  ('b0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333'),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111'),
  ('b0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222'),
  ('b0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4. KATEGORI PRODUK — 4 kategori wajib untuk Haypop (Bab 13.1)
-- ---------------------------------------------------------------------
insert into public.product_categories (store_id, name, slug, sort_order) values
  ('22222222-2222-2222-2222-222222222222', 'Minuman Kopi',     'minuman-kopi', 1),
  ('22222222-2222-2222-2222-222222222222', 'Minuman Non-Kopi', 'minuman-non-kopi', 2),
  ('22222222-2222-2222-2222-222222222222', 'Minuman Sehat',    'minuman-sehat', 3),
  ('22222222-2222-2222-2222-222222222222', 'Es Krim',          'es-krim', 4)
on conflict (store_id, slug) do nothing;

-- Kategori dasar Haybike & Hay Motret (contoh, bisa diubah Master)
insert into public.product_categories (store_id, name, slug, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Sepeda',       'sepeda', 1),
  ('11111111-1111-1111-1111-111111111111', 'Sparepart',    'sparepart', 2),
  ('11111111-1111-1111-1111-111111111111', 'Aksesori',     'aksesori', 3),
  ('11111111-1111-1111-1111-111111111111', 'Jasa Servis',  'jasa-servis', 4),
  ('33333333-3333-3333-3333-333333333333', 'Paket Studio',  'paket-studio', 1),
  ('33333333-3333-3333-3333-333333333333', 'Sesi Outdoor',  'sesi-outdoor', 2),
  ('33333333-3333-3333-3333-333333333333', 'Cetak Foto',    'cetak-foto', 3),
  ('33333333-3333-3333-3333-333333333333', 'Sewa Alat',     'sewa-alat', 4),
  ('33333333-3333-3333-3333-333333333333', 'Tambahan',      'tambahan', 5)
on conflict (store_id, slug) do nothing;

-- ---------------------------------------------------------------------
-- 5. CHART OF ACCOUNTS — COA Standar HayGroup (Bab 13.2)
-- ---------------------------------------------------------------------
insert into public.acc_accounts (code, name, account_type, normal_balance, level) values
  ('1000','ASET','asset','debit',1),
  ('1100','Kas','asset','debit',2),
  ('1110','Bank','asset','debit',2),
  ('1120','Kas Kecil','asset','debit',2),
  ('1130','Persediaan Barang','asset','debit',2),
  ('1200','Piutang Usaha','asset','debit',2),
  ('1500','Aset Tetap','asset','debit',2),
  ('1600','Akumulasi Penyusutan','asset','credit',2),
  ('2000','LIABILITAS','liability','credit',1),
  ('2100','Hutang Usaha','liability','credit',2),
  ('2200','Hutang Pajak (PPN/PPh)','liability','credit',2),
  ('2300','Pendapatan Diterima di Muka (DP)','liability','credit',2),
  ('3000','EKUITAS','equity','credit',1),
  ('3100','Modal Pemilik','equity','credit',2),
  ('3200','Laba Ditahan','equity','credit',2),
  ('3300','Prive','equity','debit',2),
  ('4000','PENDAPATAN','revenue','credit',1),
  ('4100','Pendapatan Umum','revenue','credit',2),
  ('4110','Pendapatan Penjualan','revenue','credit',2),
  ('4111','Penjualan Haybike','revenue','credit',3),
  ('4112','Penjualan Haypop','revenue','credit',3),
  ('4120','Pendapatan Lain Penjualan','revenue','credit',2),
  ('4130','Pendapatan Jasa (Servis & Foto)','revenue','credit',2),
  ('4131','Jasa Servis Haybike','revenue','credit',3),
  ('4132','Jasa Foto Hay Motret','revenue','credit',3),
  ('5000','BEBAN','expense','debit',1),
  ('5100','Beban Produksi','expense','debit',2),
  ('5110','Harga Pokok Penjualan (HPP)','expense','debit',2),
  ('5200','Beban Kelengkapan','expense','debit',2),
  ('5300','Beban Operasional','expense','debit',2),
  ('5310','Beban Gaji','expense','debit',3),
  ('5320','Beban Sewa','expense','debit',3),
  ('5330','Beban Listrik/Air/Internet','expense','debit',3),
  ('5400','Beban Lainnya','expense','debit',2),
  ('5500','Beban Penyusutan','expense','debit',2)
on conflict (code) do nothing;

-- hierarki parent-child berdasarkan kode
update public.acc_accounts a set parent_id = p.id
from public.acc_accounts p
where p.code = '1000' and a.code in ('1100','1110','1120','1130','1200','1500','1600');
update public.acc_accounts a set parent_id = p.id from public.acc_accounts p where p.code = '2000' and a.code in ('2100','2200','2300');
update public.acc_accounts a set parent_id = p.id from public.acc_accounts p where p.code = '3000' and a.code in ('3100','3200','3300');
update public.acc_accounts a set parent_id = p.id from public.acc_accounts p where p.code = '4000' and a.code in ('4100','4110','4120','4130');
update public.acc_accounts a set parent_id = p.id from public.acc_accounts p where p.code = '4110' and a.code in ('4111','4112');
update public.acc_accounts a set parent_id = p.id from public.acc_accounts p where p.code = '4130' and a.code in ('4131','4132');
update public.acc_accounts a set parent_id = p.id from public.acc_accounts p where p.code = '5000' and a.code in ('5100','5110','5200','5300','5400','5500');
update public.acc_accounts a set parent_id = p.id from public.acc_accounts p where p.code = '5300' and a.code in ('5310','5320','5330');

-- ---------------------------------------------------------------------
-- 6. PAJAK & PERSEDIAAN (Bab 13.3)
-- ---------------------------------------------------------------------
insert into public.acc_tax_configs (tax_code, name, rate, is_active) values
  ('PPN', 'Pajak Pertambahan Nilai', 0.11, true)
on conflict (tax_code) do nothing;

insert into public.acc_inventory_settings (valuation_method, lifo_enabled) values ('average', false)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 7. PENGATURAN SITUS DASAR (page_settings) — boleh diedit Master
-- ---------------------------------------------------------------------
insert into public.page_settings (parameter, group_name, value) values
  ('app_name', 'identity', 'HayGroup'),
  ('tagline', 'identity', 'Satu Grup, Tiga Karya'),
  ('theme_color', 'identity', '#0f172a'),
  ('seo_title', 'seo', 'HayGroup - Haybike, Haypop, Hay Motret'),
  ('seo_description', 'seo', 'Aplikasi manajemen bisnis terpadu HayGroup'),
  ('contact_address', 'contact', ''),
  ('contact_phone', 'contact', ''),
  ('contact_email', 'contact', 'info@haygroup.id'),
  ('social_instagram', 'social-media', ''),
  ('social_tiktok', 'social-media', ''),
  ('social_whatsapp', 'social-media', ''),
  ('privacy_policy', 'policy', ''),
  ('term_of_service', 'policy', '')
on conflict (parameter) do nothing;

-- ---------------------------------------------------------------------
-- 8. POS SETTINGS DASAR per store
-- ---------------------------------------------------------------------
insert into public.pos_settings (store_id, parameter, value)
select s.id, x.parameter, x.value
from public.stores s
cross join (values ('tax_rate','0.11'), ('service_charge_rate','0'), ('currency','IDR')) as x(parameter, value)
on conflict (store_id, parameter) do nothing;

-- CATATAN PRODUCTION:
-- Bagian "3. AKUN (auth.users)" di atas hanya untuk Supabase LOCAL DEV.
-- Untuk project production, buat 4 akun via:
--   supabase.auth.admin.createUser({ email, password, email_confirm: true })
-- (lihat supabase/functions/_shared/create-seed-users.ts) lalu jalankan
-- ulang bagian role/store assignment dengan id user yang dihasilkan.
