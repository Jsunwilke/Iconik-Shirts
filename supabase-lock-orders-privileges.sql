-- Locks public.orders down to exactly what this app uses.
-- Applied live 2026-10-06 (Supabase migration "lock_orders_privileges").
--
-- Why: the database ("Iconik Schools", shared with iconikschools.com, Photo
-- Grade and Atlas) handed every new table ALL privileges to anon and
-- authenticated, including TRUNCATE -- which ignores RLS and would empty the
-- table in one statement. The same hole was closed on public.customer_codes
-- on 2026-10-02.
--
-- What this app really uses (src/lib/supabase.js, anon key only, no sign-in):
--   anon  INSERT          order form (submitOrder)
--   anon  SELECT          admin panel lists
--   anon  UPDATE          mark completed / archive / restore
--   anon  DELETE          delete order(s)
--   anon  sequence USAGE  the insert's id default (nextval)
-- Nothing runs as authenticated, so it keeps nothing.

revoke truncate, references, trigger on table public.orders from anon;
revoke all on table public.orders from authenticated;

revoke all on sequence public.orders_id_seq from anon, authenticated;
grant usage on sequence public.orders_id_seq to anon;

-- Verify: anon should hold exactly DELETE, INSERT, SELECT, UPDATE; authenticated nothing
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'orders'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
