-- =============================================================
-- Fix: admin_create_user falhava com "INSERT has more target
-- columns than expressions" (400 no RPC).
-- A versão anterior listava 19 colunas em auth.users mas só
-- enviava 18 valores (6 strings vazias em vez de 7).
-- =============================================================
create or replace function public.admin_create_user(
  p_email text,
  p_password text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
  v_uid uuid;
begin
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '')
  into v_role;

  if v_role <> 'admin' then
    raise exception 'not_authorized';
  end if;

  v_uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token,
    created_at, updated_at, last_sign_in_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_uid,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'role', 'colaborador'
    ),
    jsonb_build_object('email', lower(p_email), 'email_verified', true),
    '', '', '', '', '', '', '',
    now(), now(), now()
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, id, updated_at
  ) values (
    v_uid::text,
    v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', lower(p_email)),
    'email',
    now(), now(), v_uid, now()
  );

  return v_uid;
end;
$$;
