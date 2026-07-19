-- =====================================================================
-- HAYGROUP — HELPER FUNCTIONS (dibaca dari JWT claim) + FUNGSI TRANSAKSI
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper baca klaim JWT (diisi oleh auth-token-hook, Bab 4.4 & 9.3)
--    JWT diharapkan punya custom claim: app_roles (text[]), app_permissions (text[]), store_ids (uuid[])
-- ---------------------------------------------------------------------
create or replace function public.auth_has_role(p_role text)
returns boolean
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_roles') ?  p_role
    or (auth.jwt() -> 'app_metadata' -> 'app_roles') ? p_role,
    false
  );
$$;

create or replace function public.auth_has_permission(p_permission text)
returns boolean
language sql stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_permissions') ? p_permission
    or (auth.jwt() -> 'app_metadata' -> 'app_permissions') ? p_permission,
    false
  );
$$;

create or replace function public.auth_store_ids()
returns uuid[]
language sql stable
as $$
  select coalesce(
    array(select jsonb_array_elements_text(
      coalesce(auth.jwt() -> 'store_ids', auth.jwt() -> 'app_metadata' -> 'store_ids', '[]'::jsonb)
    )::uuid),
    array[]::uuid[]
  );
$$;

create or replace function public.auth_is_finance_role()
returns boolean
language sql stable
as $$
  select public.auth_has_role('SuperAdmin')
      or public.auth_has_role('Manajer Keuangan')
      or public.auth_has_role('Accounting');
$$;

create or replace function public.auth_is_auditor_or_finance()
returns boolean
language sql stable
as $$
  select public.auth_is_finance_role() or public.auth_has_role('Auditor');
$$;

-- ---------------------------------------------------------------------
-- 2. updated_at trigger generik
-- ---------------------------------------------------------------------
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'profiles','roles','stores','page_settings','pos_settings','product_categories',
      'products','invoices','articles','acc_accounts','acc_journals'
    ])
  loop
    execute format('create trigger trg_set_updated_at before update on public.%I
                     for each row execute function public.fn_set_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Penomoran otomatis: invoice per store, jurnal per bulan (Bab 12.1)
-- ---------------------------------------------------------------------
create table public._number_counters (
  scope       text not null,     -- 'invoice:<store_id>:YYYYMMDD' atau 'journal:YYYYMM'
  last_value  int not null default 0,
  primary key (scope)
);

create or replace function public.fn_next_invoice_number(p_store_code text, p_date date default current_date)
returns text
language plpgsql
as $$
declare
  v_scope text := 'invoice:' || p_store_code || ':' || to_char(p_date, 'YYYYMMDD');
  v_next  int;
begin
  insert into public._number_counters(scope, last_value) values (v_scope, 1)
    on conflict (scope) do update set last_value = public._number_counters.last_value + 1
    returning last_value into v_next;
  return 'INV-' || upper(p_store_code) || '-' || to_char(p_date,'YYYYMMDD') || '-' || lpad(v_next::text, 4, '0');
end; $$;

create or replace function public.fn_next_journal_number(p_date date default current_date)
returns text
language plpgsql
as $$
declare
  v_scope text := 'journal:' || to_char(p_date, 'YYYYMM');
  v_next  int;
begin
  insert into public._number_counters(scope, last_value) values (v_scope, 1)
    on conflict (scope) do update set last_value = public._number_counters.last_value + 1
    returning last_value into v_next;
  return 'JRN-' || to_char(p_date,'YYYYMM') || '-' || lpad(v_next::text, 5, '0');
end; $$;

-- ---------------------------------------------------------------------
-- 4. Pastikan periode akuntansi ada & 'open' untuk suatu tanggal (Bab 8.2)
-- ---------------------------------------------------------------------
create or replace function public.fn_ensure_period(p_date date)
returns uuid
language plpgsql
security definer
as $$
declare
  v_period_id uuid;
  v_year int := extract(year from p_date);
  v_month int := extract(month from p_date);
begin
  select id into v_period_id from public.acc_periods
    where period_year = v_year and period_month = v_month;

  if v_period_id is null then
    insert into public.acc_periods (period_year, period_month, start_date, end_date, status)
    values (v_year, v_month, date_trunc('month', p_date)::date,
            (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date, 'open')
    returning id into v_period_id;
  end if;

  return v_period_id;
end; $$;

-- ---------------------------------------------------------------------
-- 5. create_journal / post_journal / cancel_journal (Bab 8.3)
--    SECURITY DEFINER: dipanggil lewat Edge Function memakai service_role,
--    permission-check dilakukan di Edge Function SEBELUM memanggil RPC ini.
-- ---------------------------------------------------------------------

-- p_lines: jsonb array of {account_id, description, debit, credit}
create or replace function public.fn_create_journal(
  p_journal_date date,
  p_reference text,
  p_description text,
  p_source_type text,
  p_source_id uuid,
  p_lines jsonb,
  p_created_by uuid,
  p_auto_post boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_journal_id uuid;
  v_period_id uuid;
  v_total_debit numeric(18,2) := 0;
  v_total_credit numeric(18,2) := 0;
  v_line jsonb;
  v_line_count int := 0;
  v_existing uuid;
begin
  -- idempoten: jangan jurnal ganda dari sumber yang sama
  if p_source_id is not null then
    select id into v_existing from public.acc_journals
      where source_type = p_source_type and source_id = p_source_id and status <> 'canceled';
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  v_period_id := public.fn_ensure_period(p_journal_date);

  if (select status from public.acc_periods where id = v_period_id) = 'closed' then
    raise exception 'Periode % sudah ditutup, tidak bisa membuat jurnal baru', p_journal_date;
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_line_count := v_line_count + 1;
    v_total_debit := v_total_debit + coalesce((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + coalesce((v_line->>'credit')::numeric, 0);
    if coalesce((v_line->>'debit')::numeric,0) > 0 and coalesce((v_line->>'credit')::numeric,0) > 0 then
      raise exception 'Satu baris jurnal tidak boleh berisi debit dan kredit sekaligus';
    end if;
  end loop;

  if v_line_count < 2 then
    raise exception 'Jurnal minimal harus punya 2 baris';
  end if;

  if v_total_debit <> v_total_credit then
    raise exception 'Jurnal tidak seimbang: debit % <> kredit %', v_total_debit, v_total_credit;
  end if;

  if v_total_debit <= 0 then
    raise exception 'Total nominal jurnal harus lebih besar dari 0';
  end if;

  insert into public.acc_journals (
    journal_number, journal_date, reference, description, status,
    source_type, source_id, period_id, created_by, updated_by
  ) values (
    public.fn_next_journal_number(p_journal_date), p_journal_date, p_reference, p_description, 'draft',
    p_source_type, p_source_id, v_period_id, p_created_by, p_created_by
  ) returning id into v_journal_id;

  insert into public.acc_journal_lines (journal_id, account_id, description, debit, credit, line_order)
  select v_journal_id,
         (v_line->>'account_id')::uuid,
         v_line->>'description',
         coalesce((v_line->>'debit')::numeric, 0),
         coalesce((v_line->>'credit')::numeric, 0),
         ord
  from jsonb_array_elements(p_lines) with ordinality as t(v_line, ord);

  insert into public.acc_audit_logs (user_id, module, action, subject_type, subject_id, new_values)
  values (p_created_by, 'journal', 'create', 'acc_journals', v_journal_id, jsonb_build_object('lines', p_lines));

  if p_auto_post then
    perform public.fn_post_journal(v_journal_id, p_created_by);
  end if;

  return v_journal_id;
end; $$;

create or replace function public.fn_post_journal(p_journal_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_status text;
  v_period_id uuid;
  v_period_status text;
begin
  select status, period_id into v_status, v_period_id from public.acc_journals where id = p_journal_id;

  if v_status is null then
    raise exception 'Jurnal tidak ditemukan';
  end if;
  if v_status <> 'draft' then
    raise exception 'Hanya jurnal berstatus draft yang bisa diposting (status saat ini: %)', v_status;
  end if;

  select status into v_period_status from public.acc_periods where id = v_period_id;
  if v_period_status = 'closed' then
    raise exception 'Periode sudah ditutup, tidak bisa posting jurnal';
  end if;

  update public.acc_journals
    set status = 'posted', posted_by = p_user_id, posted_at = now(), updated_by = p_user_id, updated_at = now()
    where id = p_journal_id;

  insert into public.acc_audit_logs (user_id, module, action, subject_type, subject_id)
  values (p_user_id, 'journal', 'post', 'acc_journals', p_journal_id);
end; $$;

create or replace function public.fn_cancel_journal(p_journal_id uuid, p_user_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
as $$
declare
  v_status text;
  v_reversal_id uuid;
  v_lines jsonb;
  v_journal record;
begin
  select * into v_journal from public.acc_journals where id = p_journal_id;
  if v_journal is null then
    raise exception 'Jurnal tidak ditemukan';
  end if;
  if v_journal.status = 'canceled' then
    raise exception 'Jurnal sudah dibatalkan sebelumnya';
  end if;

  if v_journal.status = 'draft' then
    update public.acc_journals set status = 'canceled', canceled_by = p_user_id, canceled_at = now()
      where id = p_journal_id;
  else
    -- posted: buat jurnal pembalik (reversal), jurnal asli tetap ada untuk jejak audit
    select jsonb_agg(jsonb_build_object(
      'account_id', account_id, 'description', description,
      'debit', credit, 'credit', debit   -- dibalik
    ) order by line_order) into v_lines
    from public.acc_journal_lines where journal_id = p_journal_id;

    v_reversal_id := public.fn_create_journal(
      current_date, v_journal.journal_number, 'Pembalik jurnal ' || v_journal.journal_number || coalesce(': '||p_reason,''),
      'journal_reversal', p_journal_id, v_lines, p_user_id, true
    );

    update public.acc_journals set status = 'canceled', canceled_by = p_user_id, canceled_at = now()
      where id = p_journal_id;
  end if;

  insert into public.acc_audit_logs (user_id, module, action, subject_type, subject_id, metadata)
  values (p_user_id, 'journal', 'cancel', 'acc_journals', p_journal_id, jsonb_build_object('reason', p_reason, 'reversal_journal_id', v_reversal_id));

  return coalesce(v_reversal_id, p_journal_id);
end; $$;

-- ---------------------------------------------------------------------
-- 6. Tutup / buka periode (Bab 8.11)
-- ---------------------------------------------------------------------
create or replace function public.fn_close_period(p_year int, p_month int, p_user_id uuid, p_notes text default null)
returns uuid
language plpgsql
security definer
as $$
declare
  v_period_id uuid;
  v_closing_id uuid;
begin
  select id into v_period_id from public.acc_periods where period_year = p_year and period_month = p_month;
  if v_period_id is null then
    raise exception 'Periode %-% belum memiliki data jurnal', p_year, p_month;
  end if;

  update public.acc_periods set status = 'closed', closed_by = p_user_id, closed_at = now() where id = v_period_id;

  insert into public.acc_closings (period_year, period_month, closing_type, status, closed_by, notes)
  values (p_year, p_month, 'monthly', 'closed', p_user_id, p_notes)
  returning id into v_closing_id;

  insert into public.acc_audit_logs (user_id, module, action, subject_type, subject_id)
  values (p_user_id, 'closing', 'close', 'acc_periods', v_period_id);

  return v_closing_id;
end; $$;

create or replace function public.fn_reopen_period(p_year int, p_month int, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare v_period_id uuid;
begin
  if not public.auth_has_role('SuperAdmin') then
    raise exception 'Hanya SuperAdmin yang boleh membuka kembali periode';
  end if;

  select id into v_period_id from public.acc_periods where period_year = p_year and period_month = p_month;
  update public.acc_periods set status = 'open' where id = v_period_id;
  update public.acc_closings set status = 'reopened', reopened_by = p_user_id, reopened_at = now()
    where period_year = p_year and coalesce(period_month,-1) = coalesce(p_month,-1) and status = 'closed';

  insert into public.acc_audit_logs (user_id, module, action, subject_type, subject_id)
  values (p_user_id, 'closing', 'reopen', 'acc_periods', v_period_id);
end; $$;
