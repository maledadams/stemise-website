create temp table tmp_normalized_admin_allowlist on commit drop as
select
  lower(trim(email)) as email,
  min(created_at) as created_at
from public.admin_allowlist
where nullif(trim(email), '') is not null
group by lower(trim(email));

delete from public.admin_allowlist;

insert into public.admin_allowlist (email, created_at)
select email, created_at
from tmp_normalized_admin_allowlist
on conflict (email) do update
set created_at = least(public.admin_allowlist.created_at, excluded.created_at);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  with current_email as (
    select lower(
      trim(
        coalesce(
          nullif(auth.jwt() ->> 'email', ''),
          (select email from auth.users where id = auth.uid()),
          ''
        )
      )
    ) as email
  )
  select exists (
    select 1
    from public.admin_allowlist
    where lower(trim(email)) = (select email from current_email)
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;
