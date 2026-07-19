-- Allows the admin panel to UPDATE rows in public.orders.
--
-- Why this is needed: the orders table has SELECT / INSERT / DELETE policies for
-- the anon role but no UPDATE policy. Postgres RLS silently affects 0 rows when
-- no UPDATE policy matches -- no error is raised. That broke two things:
--   1. markOrdersCompleted() never moved orders out of "pending", so the
--      Order History tab was always empty.
--   2. Archiving orders (also an UPDATE) would appear to work but do nothing.
--
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/uaerxeuiabbhyredunql/sql/new

create policy "Allow anon to update orders"
on public.orders
for update
to anon
using (true)
with check (true);

-- Verify: should list a policy named "Allow anon to update orders" with cmd = UPDATE
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'orders'
order by cmd;
