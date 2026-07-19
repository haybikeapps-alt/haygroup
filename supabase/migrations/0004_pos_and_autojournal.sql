-- =====================================================================
-- HAYGROUP — POS CHECKOUT (atomik) & AUTO-JOURNAL (Bab 7, 8.6)
-- =====================================================================

-- Kode akun tetap sesuai Bab 13.2 / 8.6, dicari via acc_accounts.code
-- 1100 Kas | 1130 Persediaan | 1200 Piutang Usaha | 5110 HPP
-- 4111 Penjualan Haybike | 4112 Penjualan Haypop | 4131 Jasa Servis Haybike | 4132 Jasa Foto Hay Motret

create or replace function public.fn_account_id(p_code text)
returns uuid language sql stable as $$
  select id from public.acc_accounts where code = p_code;
$$;

-- ---------------------------------------------------------------------
-- AUTO-JOURNAL dari sebuah invoice yang sudah completed (Bab 8.6)
-- ---------------------------------------------------------------------
create or replace function public.fn_auto_journal_invoice(p_invoice_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invoice record;
  v_store_code text;
  v_goods_subtotal numeric(18,2) := 0;
  v_service_subtotal numeric(18,2) := 0;
  v_hpp_total numeric(18,2) := 0;
  v_lines jsonb := '[]'::jsonb;
  v_journal_id uuid;
  v_receivable_amount numeric(18,2);
begin
  select i.*, s.code as store_code into v_invoice
  from public.invoices i join public.stores s on s.id = i.store_id
  where i.id = p_invoice_id;

  if v_invoice is null then
    raise exception 'Invoice tidak ditemukan';
  end if;
  if v_invoice.status <> 'completed' then
    raise exception 'Invoice belum berstatus completed, tidak boleh dijurnal';
  end if;

  v_store_code := v_invoice.store_code;

  -- pisahkan subtotal barang vs jasa + hitung HPP barang
  select
    coalesce(sum(case when p.product_type = 'goods' then ii.subtotal else 0 end), 0),
    coalesce(sum(case when p.product_type = 'service' then ii.subtotal else 0 end), 0),
    coalesce(sum(case when p.product_type = 'goods' and p.is_stock_tracked then ii.qty * p.cost_price else 0 end), 0)
  into v_goods_subtotal, v_service_subtotal, v_hpp_total
  from public.invoice_items ii
  left join public.products p on p.id = ii.product_id
  where ii.invoice_id = p_invoice_id;

  -- fallback bila tidak ada relasi produk (mis. jasa custom Hay Motret tanpa product_id)
  if v_goods_subtotal + v_service_subtotal = 0 then
    if v_store_code = 'HAYMOTRET' then
      v_service_subtotal := v_invoice.total;
    else
      v_goods_subtotal := v_invoice.total;
    end if;
  end if;

  -- baris Kas/Bank & Piutang (bagian belum terbayar, mis. DP Hay Motret)
  v_receivable_amount := greatest(v_invoice.total - v_invoice.paid_amount, 0);

  if v_invoice.paid_amount > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'account_id', public.fn_account_id('1100'), 'description', 'Penerimaan kas invoice ' || v_invoice.invoice_number,
      'debit', v_invoice.paid_amount, 'credit', 0));
  end if;

  if v_receivable_amount > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'account_id', public.fn_account_id('1200'), 'description', 'Piutang usaha invoice ' || v_invoice.invoice_number,
      'debit', v_receivable_amount, 'credit', 0));
  end if;

  -- baris Pendapatan (kredit) sesuai unit usaha
  if v_goods_subtotal > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'account_id', public.fn_account_id(case when v_store_code = 'HAYBIKE' then '4111' else '4112' end),
      'description', 'Penjualan barang ' || v_invoice.invoice_number, 'debit', 0, 'credit', v_goods_subtotal));
  end if;

  if v_service_subtotal > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'account_id', public.fn_account_id(case when v_store_code = 'HAYBIKE' then '4131' else '4132' end),
      'description', 'Pendapatan jasa ' || v_invoice.invoice_number, 'debit', 0, 'credit', v_service_subtotal));
  end if;

  v_journal_id := public.fn_create_journal(
    coalesce(v_invoice.completed_at::date, current_date), v_invoice.invoice_number,
    'Auto-journal penjualan ' || v_invoice.invoice_number, 'invoice', p_invoice_id,
    v_lines, p_user_id, true
  );

  -- baris HPP (jurnal kedua, terpisah agar tetap rapi debit=kredit per jurnal)
  if v_hpp_total > 0 then
    perform public.fn_create_journal(
      coalesce(v_invoice.completed_at::date, current_date), v_invoice.invoice_number,
      'Auto-journal HPP ' || v_invoice.invoice_number, 'invoice_hpp', p_invoice_id,
      jsonb_build_array(
        jsonb_build_object('account_id', public.fn_account_id('5110'), 'description', 'HPP ' || v_invoice.invoice_number, 'debit', v_hpp_total, 'credit', 0),
        jsonb_build_object('account_id', public.fn_account_id('1130'), 'description', 'Pengurangan persediaan ' || v_invoice.invoice_number, 'debit', 0, 'credit', v_hpp_total)
      ),
      p_user_id, true
    );
  end if;

  return v_journal_id;
end; $$;

-- ---------------------------------------------------------------------
-- AUTO-JOURNAL dari cashflow (Bab 8.6, kode DBP/DBE/DBO/DBA/CRG/CRS/CRP)
-- ---------------------------------------------------------------------
create or replace function public.fn_auto_journal_cashflow(p_cashflow_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_cf record;
  v_counter_account_id uuid;
  v_cash_account_id uuid := public.fn_account_id('1100');
  v_journal_id uuid;
  v_lines jsonb;
  v_is_expense boolean;
begin
  select * into v_cf from public.cashflows where id = p_cashflow_id;
  if v_cf is null then raise exception 'Cashflow tidak ditemukan'; end if;

  v_counter_account_id := case v_cf.code
    when 'DBP' then public.fn_account_id('5100')
    when 'DBE' then public.fn_account_id('5200')
    when 'DBO' then public.fn_account_id('5300')
    when 'DBA' then public.fn_account_id('5400')
    when 'CRG' then public.fn_account_id('4100')
    when 'CRS' then public.fn_account_id('4110')
    when 'CRP' then public.fn_account_id('4120')
    else v_cf.account_id
  end;

  v_is_expense := v_cf.type = 'out';

  if v_is_expense then
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_counter_account_id, 'description', v_cf.description, 'debit', v_cf.amount, 'credit', 0),
      jsonb_build_object('account_id', v_cash_account_id, 'description', v_cf.description, 'debit', 0, 'credit', v_cf.amount)
    );
  else
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_cash_account_id, 'description', v_cf.description, 'debit', v_cf.amount, 'credit', 0),
      jsonb_build_object('account_id', v_counter_account_id, 'description', v_cf.description, 'debit', 0, 'credit', v_cf.amount)
    );
  end if;

  v_journal_id := public.fn_create_journal(
    v_cf.cashflow_date, 'CF-' || v_cf.id, v_cf.description, 'cashflow', p_cashflow_id, v_lines, p_user_id, true
  );

  update public.cashflows set journal_id = v_journal_id, account_id = coalesce(account_id, v_counter_account_id)
    where id = p_cashflow_id;

  return v_journal_id;
end; $$;

-- ---------------------------------------------------------------------
-- POS CHECKOUT ATOMIK (Bab 7.1, 10.2)
-- p_payload jsonb contoh:
-- {
--   "store_id": "...", "user_id":"...", "table_id":null, "customer_id":null,
--   "order_type":"takeaway", "discount":0, "tax":0, "service_charge":0,
--   "items":[{"product_id":"...","variant_id":null,"name":"Kopi Susu","category":"Minuman Kopi",
--             "qty":2,"price":20000,"discount":0,"note":null,
--             "addons":[{"addon_id":"...","name":"Extra Shot","price":5000}]}],
--   "payments":[{"method":"cash","amount":45000}]
-- }
-- ---------------------------------------------------------------------
create or replace function public.fn_pos_checkout(p_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_store_id uuid := (p_payload->>'store_id')::uuid;
  v_store_code text;
  v_user_id uuid := (p_payload->>'user_id')::uuid;
  v_invoice_id uuid := gen_random_uuid();
  v_item jsonb;
  v_addon jsonb;
  v_item_id uuid;
  v_subtotal numeric(18,2) := 0;
  v_discount numeric(18,2) := coalesce((p_payload->>'discount')::numeric, 0);
  v_tax numeric(18,2) := coalesce((p_payload->>'tax')::numeric, 0);
  v_service_charge numeric(18,2) := coalesce((p_payload->>'service_charge')::numeric, 0);
  v_total numeric(18,2);
  v_paid_amount numeric(18,2) := 0;
  v_payment jsonb;
  v_invoice_number text;
  v_product record;
  v_line_subtotal numeric(18,2);
  v_journal_id uuid;
begin
  select code into v_store_code from public.stores where id = v_store_id;
  if v_store_code is null then raise exception 'Store tidak ditemukan'; end if;

  v_invoice_number := public.fn_next_invoice_number(v_store_code);

  -- hitung subtotal dari items
  for v_item in select * from jsonb_array_elements(p_payload->'items') loop
    v_line_subtotal := (v_item->>'qty')::numeric * (v_item->>'price')::numeric - coalesce((v_item->>'discount')::numeric,0);
    for v_addon in select * from jsonb_array_elements(coalesce(v_item->'addons','[]'::jsonb)) loop
      v_line_subtotal := v_line_subtotal + coalesce((v_addon->>'price')::numeric,0) * (v_item->>'qty')::numeric;
    end loop;
    v_subtotal := v_subtotal + v_line_subtotal;
  end loop;

  v_total := v_subtotal - v_discount + v_tax + v_service_charge;

  insert into public.invoices (
    id, invoice_number, store_id, user_id, table_id, customer_id, reservation_id, order_type,
    status, subtotal, discount, tax, service_charge, total, is_draft
  ) values (
    v_invoice_id, v_invoice_number, v_store_id, v_user_id,
    nullif(p_payload->>'table_id','')::uuid, nullif(p_payload->>'customer_id','')::uuid,
    nullif(p_payload->>'reservation_id','')::uuid,
    coalesce(p_payload->>'order_type','takeaway'), 'pending', v_subtotal, v_discount, v_tax, v_service_charge, v_total, false
  );

  for v_item in select * from jsonb_array_elements(p_payload->'items') loop
    v_line_subtotal := (v_item->>'qty')::numeric * (v_item->>'price')::numeric - coalesce((v_item->>'discount')::numeric,0);

    insert into public.invoice_items (
      id, invoice_id, product_id, variant_id, name_snapshot, category_snapshot, qty, price, cost_price, discount, subtotal, note
    ) values (
      gen_random_uuid(), v_invoice_id, nullif(v_item->>'product_id','')::uuid, nullif(v_item->>'variant_id','')::uuid,
      v_item->>'name', v_item->>'category', (v_item->>'qty')::numeric, (v_item->>'price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0), coalesce((v_item->>'discount')::numeric,0), v_line_subtotal, v_item->>'note'
    ) returning id into v_item_id;

    for v_addon in select * from jsonb_array_elements(coalesce(v_item->'addons','[]'::jsonb)) loop
      insert into public.invoice_item_addons (id, invoice_item_id, addon_id, name_snapshot, price)
      values (gen_random_uuid(), v_item_id, nullif(v_addon->>'addon_id','')::uuid, v_addon->>'name', coalesce((v_addon->>'price')::numeric,0));
    end loop;

    -- kurangi stok otomatis untuk produk barang yang dilacak stoknya
    if nullif(v_item->>'product_id','') is not null then
      select * into v_product from public.products where id = (v_item->>'product_id')::uuid;
      if v_product.is_stock_tracked and v_product.product_type = 'goods' then
        insert into public.product_stocks (product_id, type, qty, source, note, created_by)
        values (v_product.id, 'out', (v_item->>'qty')::numeric, 'pos_sale', 'Invoice ' || v_invoice_number, v_user_id);
        update public.products set stock_qty = stock_qty - (v_item->>'qty')::numeric where id = v_product.id;
      end if;
    end if;
  end loop;

  -- catat pembayaran
  for v_payment in select * from jsonb_array_elements(coalesce(p_payload->'payments','[]'::jsonb)) loop
    insert into public.payments (invoice_id, method, amount, status, reference, paid_at)
    values (v_invoice_id, v_payment->>'method', (v_payment->>'amount')::numeric,
            case when v_payment->>'method' = 'xendit' then 'pending' else 'paid' end,
            v_payment->>'reference', case when v_payment->>'method' = 'xendit' then null else now() end);
    if v_payment->>'method' <> 'xendit' then
      v_paid_amount := v_paid_amount + (v_payment->>'amount')::numeric;
    end if;
  end loop;

  update public.invoices set
    paid_amount = v_paid_amount,
    change_amount = greatest(v_paid_amount - v_total, 0),
    status = case when v_paid_amount >= v_total or v_paid_amount > 0 then 'completed' else 'pending' end,
    completed_at = case when v_paid_amount > 0 then now() else null end
  where id = v_invoice_id;

  -- buat piutang jika ada sisa belum terbayar (mis. DP Hay Motret)
  if v_total > v_paid_amount and v_paid_amount > 0 then
    insert into public.acc_receivables (customer_id, invoice_id, invoice_date, due_date, total_amount, paid_amount, status)
    values (nullif(p_payload->>'customer_id','')::uuid, v_invoice_id, current_date, current_date + interval '14 days',
            v_total - v_paid_amount + v_paid_amount, v_paid_amount,
            'partial');
    -- catatan: total_amount = total invoice (piutang dicatat penuh, paid_amount = bagian sudah dibayar / DP)
    update public.acc_receivables set total_amount = v_total where invoice_id = v_invoice_id;
  end if;

  -- auto-journal jika sudah ada pembayaran (bukan xendit-pending-murni)
  if v_paid_amount > 0 then
    v_journal_id := public.fn_auto_journal_invoice(v_invoice_id, v_user_id);
  end if;

  return jsonb_build_object(
    'invoice_id', v_invoice_id, 'invoice_number', v_invoice_number,
    'total', v_total, 'paid_amount', v_paid_amount, 'status',
    (select status from public.invoices where id = v_invoice_id),
    'journal_id', v_journal_id
  );
end; $$;
