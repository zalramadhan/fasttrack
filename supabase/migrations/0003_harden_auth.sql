-- Role escalation hardening.
-- user_metadata is controlled by the client, so it must never decide admin role.
-- Only admin-only app_metadata (set through the service role) can grant admin.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, whatsapp, role, created_at, email_verified_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
    coalesce(new.raw_app_meta_data ->> 'role', 'user'),
    (extract(epoch from clock_timestamp()) * 1000)::bigint,
    case when new.email_confirmed_at is not null then (extract(epoch from clock_timestamp()) * 1000)::bigint else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Demote any profile whose auth user does not carry app_metadata.role = admin.
-- Run `npm run promote:admin -- <email>` first for the real admin account.
update public.profiles p
set role = 'user'
where p.role = 'admin'
  and not exists (
    select 1
    from auth.users u
    where u.id = p.id
      and coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin'
  );
