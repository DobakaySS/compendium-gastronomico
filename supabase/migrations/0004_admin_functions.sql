create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
begin
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '')
  into v_role;

  if v_role <> 'admin' then
    raise exception 'not_authorized';
  end if;

  return query
    select
      u.id::uuid as id,
      u.email::text as email,
      coalesce(u.raw_app_meta_data ->> 'role', 'colaborador')::text as role,
      u.created_at::timestamptz as created_at
    from auth.users u
    order by u.created_at desc;
end;
$$;