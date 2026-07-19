-- =====================================================================
-- HAYGROUP — PEMBAYARAN HUTANG & PIUTANG USAHA (Bab 8.7, 8.8)
-- =====================================================================

create or replace function public.fn_pay_payable(
  p_payable_id uuid, p_amount numeric, p_method text, p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_payable record;
  v_payment_id uuid := gen_random_uuid();
  v_journal_id uuid;
  v_new_paid numeric(18,2);
  v_new_status text;
begin
  select * into v_payable from public.acc_payables where id = p_payable_id for update;
  if v_payable is null then raise exception 'Hutang usaha tidak ditemukan'; end if;

  v_new_paid := v_payable.paid_amount + p_amount;
  if v_new_paid > v_payable.total_amount then
    raise exception 'Nominal pembayaran melebihi sisa hutang (sisa: %)', v_payable.total_amount - v_payable.paid_amount;
  end if;

  v_new_status := case when v_new_paid >= v_payable.total_amount then 'paid'
                       when v_new_paid > 0 then 'partial' else 'open' end;

  insert into public.acc_payable_payments (id, payable_id, amount, method, paid_at, created_by)
  values (v_payment_id, p_payable_id, p_amount, p_method, now(), p_user_id);

  update public.acc_payables set paid_amount = v_new_paid, status = v_new_status where id = p_payable_id;

  v_journal_id := public.fn_create_journal(
    current_date, v_payable.invoice_number, 'Pembayaran hutang usaha ' || v_payable.invoice_number,
    'payable_payment', v_payment_id,
    jsonb_build_array(
      jsonb_build_object('account_id', public.fn_account_id('2100'), 'description', 'Pembayaran hutang ' || v_payable.invoice_number, 'debit', p_amount, 'credit', 0),
      jsonb_build_object('account_id', public.fn_account_id('1100'), 'description', 'Kas keluar pembayaran hutang', 'debit', 0, 'credit', p_amount)
    ),
    p_user_id, true
  );

  update public.acc_payable_payments set journal_id = v_journal_id where id = v_payment_id;

  return jsonb_build_object('payment_id', v_payment_id, 'journal_id', v_journal_id, 'new_status', v_new_status, 'remaining', v_payable.total_amount - v_new_paid);
end; $$;

create or replace function public.fn_pay_receivable(
  p_receivable_id uuid, p_amount numeric, p_method text, p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_receivable record;
  v_payment_id uuid := gen_random_uuid();
  v_journal_id uuid;
  v_new_paid numeric(18,2);
  v_new_status text;
begin
  select * into v_receivable from public.acc_receivables where id = p_receivable_id for update;
  if v_receivable is null then raise exception 'Piutang usaha tidak ditemukan'; end if;

  v_new_paid := v_receivable.paid_amount + p_amount;
  if v_new_paid > v_receivable.total_amount then
    raise exception 'Nominal pembayaran melebihi sisa piutang (sisa: %)', v_receivable.total_amount - v_receivable.paid_amount;
  end if;

  v_new_status := case when v_new_paid >= v_receivable.total_amount then 'paid'
                       when v_new_paid > 0 then 'partial' else 'open' end;

  insert into public.acc_receivable_payments (id, receivable_id, amount, method, paid_at, created_by)
  values (v_payment_id, p_receivable_id, p_amount, p_method, now(), p_user_id);

  update public.acc_receivables set paid_amount = v_new_paid, status = v_new_status where id = p_receivable_id;

  -- update juga invoice terkait (jika ada) agar paid_amount invoice konsisten
  if v_receivable.invoice_id is not null then
    update public.invoices set paid_amount = paid_amount + p_amount where id = v_receivable.invoice_id;
  end if;

  v_journal_id := public.fn_create_journal(
    current_date, 'RCV-' || v_receivable.id, 'Penerimaan piutang usaha',
    'receivable_payment', v_payment_id,
    jsonb_build_array(
      jsonb_build_object('account_id', public.fn_account_id('1100'), 'description', 'Kas masuk penerimaan piutang', 'debit', p_amount, 'credit', 0),
      jsonb_build_object('account_id', public.fn_account_id('1200'), 'description', 'Pengurangan piutang usaha', 'debit', 0, 'credit', p_amount)
    ),
    p_user_id, true
  );

  update public.acc_receivable_payments set journal_id = v_journal_id where id = v_payment_id;

  return jsonb_build_object('payment_id', v_payment_id, 'journal_id', v_journal_id, 'new_status', v_new_status, 'remaining', v_receivable.total_amount - v_new_paid);
end; $$;
