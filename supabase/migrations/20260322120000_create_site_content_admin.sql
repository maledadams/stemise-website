create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.site_content_state (
  id bigint primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_allowlist enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist
    where email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

drop trigger if exists site_content_state_set_updated_at on public.site_content_state;
create trigger site_content_state_set_updated_at
before update on public.site_content_state
for each row
execute function public.set_updated_at();

alter table public.site_content_state enable row level security;

drop policy if exists "Public read site content state" on public.site_content_state;
create policy "Public read site content state"
on public.site_content_state
for select
using (true);

drop policy if exists "Authenticated manage site content state" on public.site_content_state;
drop policy if exists "Admin allowlist manage site content state" on public.site_content_state;
create policy "Admin allowlist manage site content state"
on public.site_content_state
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

insert into public.site_content_state (id, payload)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('contact', 'kit_request')),
  email text not null,
  name text not null,
  organization_name text,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.form_submissions enable row level security;

drop policy if exists "Anyone can insert form submissions" on public.form_submissions;
drop policy if exists "Authenticated can read form submissions" on public.form_submissions;
drop policy if exists "Admin allowlist can read form submissions" on public.form_submissions;
create policy "Admin allowlist can read form submissions"
on public.form_submissions
for select
using (public.current_user_is_admin());

create index if not exists form_submissions_form_type_idx
on public.form_submissions (form_type);

create index if not exists form_submissions_created_at_idx
on public.form_submissions (created_at desc);

create or replace function public.submit_public_form_submission(
  p_form_type text,
  p_email text,
  p_name text,
  p_organization_name text default null,
  p_message text default ''
)
returns public.form_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  normalized_name text := trim(coalesce(p_name, ''));
  normalized_message text := trim(coalesce(p_message, ''));
  recent_count integer;
  max_submissions integer;
  inserted_row public.form_submissions;
begin
  if p_form_type not in ('contact', 'kit_request') then
    raise exception 'Unsupported form type.';
  end if;

  if normalized_email = '' then
    raise exception 'Email is required.';
  end if;

  if normalized_name = '' then
    raise exception 'Name is required.';
  end if;

  if normalized_message = '' then
    raise exception 'Message is required.';
  end if;

  max_submissions := case
    when p_form_type = 'contact' then 3
    when p_form_type = 'kit_request' then 2
    else 0
  end;

  select count(*)
  into recent_count
  from public.form_submissions
  where form_type = p_form_type
    and lower(email) = normalized_email
    and created_at >= timezone('utc', now()) - interval '10 minutes';

  if recent_count >= max_submissions then
    raise exception 'Rate limit exceeded. Please wait before submitting again.';
  end if;

  insert into public.form_submissions (
    form_type,
    email,
    name,
    organization_name,
    message
  )
  values (
    p_form_type,
    normalized_email,
    normalized_name,
    nullif(trim(coalesce(p_organization_name, '')), ''),
    normalized_message
  )
  returning *
  into inserted_row;

  return inserted_row;
end;
$$;

revoke all on function public.submit_public_form_submission(text, text, text, text, text) from public;
grant execute on function public.submit_public_form_submission(text, text, text, text, text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public read site assets" on storage.objects;
create policy "Public read site assets"
on storage.objects
for select
using (bucket_id = 'site-assets');

drop policy if exists "Authenticated upload site assets" on storage.objects;
drop policy if exists "Admin allowlist upload site assets" on storage.objects;
create policy "Admin allowlist upload site assets"
on storage.objects
for insert
with check (
  bucket_id = 'site-assets'
  and public.current_user_is_admin()
);

drop policy if exists "Authenticated update site assets" on storage.objects;
drop policy if exists "Admin allowlist update site assets" on storage.objects;
create policy "Admin allowlist update site assets"
on storage.objects
for update
using (
  bucket_id = 'site-assets'
  and public.current_user_is_admin()
)
with check (
  bucket_id = 'site-assets'
  and public.current_user_is_admin()
);

drop policy if exists "Authenticated delete site assets" on storage.objects;
drop policy if exists "Admin allowlist delete site assets" on storage.objects;
create policy "Admin allowlist delete site assets"
on storage.objects
for delete
using (
  bucket_id = 'site-assets'
  and public.current_user_is_admin()
);
