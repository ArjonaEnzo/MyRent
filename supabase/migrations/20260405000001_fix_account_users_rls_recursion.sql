-- Fix: recursive RLS policy on account_users causes "stack depth limit exceeded"
--
-- The previous policy queried account_users from within an account_users policy,
-- causing infinite recursion whenever has_account_role() was called.
-- Replace with a direct, non-recursive check.

DROP POLICY IF EXISTS "Account members can view account_users" ON account_users;

CREATE POLICY "Account members can view account_users"
  ON account_users FOR SELECT
  USING (user_id = auth.uid());
