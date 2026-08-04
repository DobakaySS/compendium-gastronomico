-- Grants padrão do Supabase (tabelas criadas via SQL precisam delas)
grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;