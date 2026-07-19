# HayGroup — Rewrite (Vanilla JS + Supabase)

Aplikasi manajemen bisnis terpadu untuk 3 unit usaha HayGroup (**Haybike**,
**Haypop**, **Hay Motret**): POS, dapur realtime, manajemen produk/stok, dan
modul Akuntansi SAK EMKM lengkap (COA, jurnal, buku besar, laporan keuangan,
aset tetap, hutang/piutang, tutup buku).

Dibangun ulang total dari **Laravel + MySQL** menjadi **Vanilla JS (ES Modules)
+ Supabase (Postgres, Auth, Realtime, Edge Functions, Storage)** — **tanpa
migrasi data lama**. Semua data dimulai dari nol lewat `supabase/seed.sql`.

---

## 1. Struktur Folder

```
haygroup/
├─ supabase/
│  ├─ migrations/          -> jalankan berurutan (0001 s.d. 0004)
│  ├─ seed.sql              -> data awal (3 store, 4 akun, COA, dst)
│  ├─ config.toml           -> konfigurasi Supabase CLI lokal
│  └─ functions/             -> Edge Functions (Deno)
│     ├─ auth-token-hook/    -> sisipkan role/permission/store_ids ke JWT
│     ├─ pos-checkout/       -> transaksi kasir (atomik)
│     ├─ auto-journal/       -> sinkronkan jurnal yang tertinggal
│     ├─ create-journal/     -> jurnal manual (draft)
│     ├─ post-journal/       -> posting jurnal draft -> posted
│     ├─ cancel-journal/     -> batalkan jurnal (+ jurnal pembalik)
│     ├─ generate-depreciation/ -> hitung & jurnal penyusutan aset tetap
│     ├─ close-period/       -> tutup buku bulanan
│     ├─ reopen-period/      -> buka kembali periode (SuperAdmin)
│     ├─ financial-reports/  -> Neraca, Laba Rugi, Neraca Saldo, Arus Kas, Perub. Ekuitas
│     ├─ payment-xendit/     -> integrasi pembayaran QRIS/VA via Xendit
│     └─ _shared/            -> helper (cors, klien Supabase)
└─ src/
   ├─ config.js              -> ISI SUPABASE_URL & ANON KEY DI SINI
   ├─ lib/                   -> supabase client, auth, rbac, realtime, utils
   ├─ components/            -> sidebar navigasi (role-aware)
   ├─ styles/main.css        -> CSS vanilla (bukan framework)
   └─ pages/
      ├─ auth/login/         -> login + paksa ganti password pertama
      ├─ dashboard/          -> ringkasan
      ├─ pos/                -> Kasir (POS) — 3 unit usaha
      ├─ kitchen/            -> Layar Dapur realtime (khusus Haypop)
      ├─ master/             -> stores, products, categories, users*, page-settings*
      └─ finance/            -> coa, journals, trial-balance, reports, ledger*, payables*,
                                 receivables*, fixed-assets*, closing*
                                 (* = halaman placeholder, lihat status di bawah)
```

---

## 2. Langkah Deploy ke Supabase (Project baru, tanpa data lama)

1. **Buat project baru** di https://supabase.com/dashboard.
2. Install Supabase CLI, lalu login & hubungkan project:
   ```bash
   supabase login
   supabase link --project-ref <project-ref-anda>
   ```
3. **Jalankan migrasi** (urut, membuat semua tabel, RLS, function, RPC):
   ```bash
   supabase db push
   ```
   (mendorong semua file di `supabase/migrations/*.sql` sesuai urutan nama file)
4. **Seed data awal**:
   - Untuk **local dev** (`supabase start`), seed otomatis jalan lewat `supabase db reset`
     (bagian insert `auth.users` di `seed.sql` didesain untuk local).
   - Untuk **project production**, JANGAN insert langsung ke `auth.users` via SQL.
     Buat 4 akun lewat Supabase Dashboard (Authentication -> Users -> Add User)
     atau Admin API (`supabase.auth.admin.createUser`), lalu jalankan ulang bagian
     "role & store assignment" dari `seed.sql` dengan UUID user yang sesungguhnya.
     Jalankan juga seluruh bagian non-auth (stores, roles, permissions, COA, dll).
5. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy auth-token-hook
   supabase functions deploy pos-checkout
   supabase functions deploy auto-journal
   supabase functions deploy create-journal
   supabase functions deploy post-journal
   supabase functions deploy cancel-journal
   supabase functions deploy generate-depreciation
   supabase functions deploy close-period
   supabase functions deploy reopen-period
   supabase functions deploy financial-reports
   supabase functions deploy payment-xendit
   ```
6. **Aktifkan Custom Access Token Hook**: Dashboard -> Authentication -> Hooks ->
   pilih Edge Function `auth-token-hook`. Ini WAJIB, karena semua RLS bergantung
   pada klaim `app_roles` / `app_permissions` / `store_ids` di JWT.
7. **Set environment variable Edge Function** (Dashboard -> Edge Functions -> Secrets):
   - `XENDIT_SECRET_KEY` (dari dashboard Xendit Anda)
   - `XENDIT_CALLBACK_TOKEN` (token verifikasi webhook, diatur juga di Xendit dashboard)
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` biasanya sudah otomatis tersedia
     di environment Edge Function Supabase.
8. Daftarkan URL webhook Xendit: `https://<project-ref>.supabase.co/functions/v1/payment-xendit/webhook`

### Menjalankan Frontend
Frontend adalah file statis (HTML/JS ES Modules), tidak butuh build step.
1. Isi `src/config.js` dengan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` project Anda.
2. Serve folder ini dengan static server apa pun, misalnya:
   ```bash
   npx serve .
   # atau
   python3 -m http.server 5173
   ```
3. Buka `/src/pages/auth/login/index.html`.

---

## 3. Akun Awal (dari seed.sql)

| Email | Role | Password Awal |
|---|---|---|
| master@haygroup.id | SuperAdmin (akses semua unit) | `Haygroup#2026` |
| kasir.haybike@haygroup.id | Kasir (Haybike) | `Haygroup#2026` |
| kasir.haypop@haygroup.id | Kasir (Haypop) | `Haygroup#2026` |
| kasir.haymotret@haygroup.id | Kasir (Hay Motret) | `Haygroup#2026` |

Semua akun **wajib ganti password** di login pertama (`must_change_password`).

---

## 4. Status Pengerjaan (per milestone spesifikasi)

✅ **Selesai / berfungsi penuh:**
- Skema database lengkap (semua tabel di spesifikasi), RLS default-deny + kebijakan per peran/unit usaha
- RBAC: roles, permissions, role_permissions, auth-token-hook (JWT claims)
- POS Checkout atomik (RPC `fn_pos_checkout`) + pengurangan stok otomatis + auto-journal
- Modul Akuntansi inti: COA, jurnal (create/post/cancel + jurnal pembalik), periode & tutup buku,
  penyusutan aset tetap otomatis, 5 laporan keuangan (Neraca, Laba Rugi, Neraca Saldo, Arus Kas, Perub. Ekuitas)
- Integrasi Xendit (create invoice + webhook) — kerangka fungsional, perlu API key asli untuk diuji end-to-end
- Realtime Kitchen Display (Haypop) via `postgres_changes`
- UI: Login, ganti password paksa, Dashboard, POS, Dapur, Produk, Kategori, Unit Usaha, COA, Jurnal Umum, Neraca Saldo, Laporan Keuangan

🚧 **Fondasi backend sudah ada (tabel, RLS, RPC terkait), UI belum dibuat:**
- Pengguna & Peran (kelola user/role/store lewat UI — saat ini via Table Editor)
- Pengaturan Situs (page_settings)
- Buku Besar per akun (drill-down dari Neraca Saldo)
- Hutang Usaha & Piutang Usaha (tabel `acc_payables`/`acc_receivables` sudah ada, RPC pembayaran belum)
- Aset Tetap (CRUD aset — `generate-depreciation` sudah jalan begitu data aset ada)
- Tutup Buku (Edge Function `close-period`/`reopen-period` sudah jalan, tinggal UI tombolnya)
- Halaman publik (marketplace/homepage, artikel, dsb) — tabel sudah ada (`articles`, `products` visibility public, dll)

Beri tahu saya modul mana yang ingin dilanjutkan lebih dulu — karena skema,
RLS, dan Edge Function pendukungnya sudah siap, menambahkan UI untuk modul di
atas relatif cepat.

---

## 5. Catatan Keamanan
- `service_role` key **tidak pernah** dikirim ke browser — hanya dipakai di Edge Function.
- Semua tabel mengaktifkan RLS dengan prinsip **default deny**.
- Peran `Auditor` hanya bisa membaca modul keuangan/akuntansi, tidak bisa menulis.
- Peran `Accounting` bisa input jurnal tapi **tidak bisa** posting-cancel-closing berperan ganda; pembatalan jurnal & tutup buku dibatasi ke `SuperAdmin`/`Manajer Keuangan`.
- Password bawaan wajib diganti di login pertama (`must_change_password`).
