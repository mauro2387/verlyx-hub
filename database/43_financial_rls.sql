-- ============================================
-- Migration 43: Financial RLS policies
-- ============================================
-- Problem: Financial tables have zero RLS policies.
-- Any authenticated user can see any company's financial data.
--
-- Tables covered:
--   accounts, expenses, incomes, transactions, budgets, categories
--   (all scoped by my_company_id via company_users membership)
--
--   quotes, products, time_entries
--   (scoped by user_id directly)
-- ============================================

-- Uses the SECURITY DEFINER helper from migration 39
-- In case migration 39 hasn't been run, create the helper:

CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  UNION
  SELECT id FROM public.my_companies WHERE user_id = auth.uid();
$$;


-- =============================================
-- STEP 1: Enable RLS on all financial tables
-- =============================================

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- These may already have RLS from migration 38, but ENABLE is idempotent
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;


-- =============================================
-- STEP 2: Drop any existing policies (safe re-run)
-- =============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
            'accounts', 'expenses', 'incomes', 'transactions',
            'budgets', 'categories',
            'quotes', 'products', 'time_entries'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
    RAISE NOTICE 'Dropped all existing policies on financial tables';
END $$;


-- =============================================
-- STEP 3: Company-scoped policies (my_company_id tables)
-- Uses get_user_company_ids() to avoid infinite recursion
-- =============================================

-- accounts
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT
    WITH CHECK (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "accounts_delete" ON public.accounts FOR DELETE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));

-- expenses
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT
    WITH CHECK (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));

-- incomes
CREATE POLICY "incomes_select" ON public.incomes FOR SELECT
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "incomes_insert" ON public.incomes FOR INSERT
    WITH CHECK (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "incomes_update" ON public.incomes FOR UPDATE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "incomes_delete" ON public.incomes FOR DELETE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));

-- transactions
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT
    WITH CHECK (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));

-- budgets
CREATE POLICY "budgets_select" ON public.budgets FOR SELECT
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT
    WITH CHECK (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));

-- categories
CREATE POLICY "categories_select" ON public.categories FOR SELECT
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "categories_insert" ON public.categories FOR INSERT
    WITH CHECK (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "categories_update" ON public.categories FOR UPDATE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));
CREATE POLICY "categories_delete" ON public.categories FOR DELETE
    USING (my_company_id IN (SELECT public.get_user_company_ids()));


-- =============================================
-- STEP 4: User-scoped policies (user_id tables)
-- =============================================

-- quotes
CREATE POLICY "quotes_user_select" ON public.quotes FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "quotes_user_insert" ON public.quotes FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_user_update" ON public.quotes FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "quotes_user_delete" ON public.quotes FOR DELETE
    USING (auth.uid() = user_id);

-- products
CREATE POLICY "products_user_select" ON public.products FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "products_user_insert" ON public.products FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_user_update" ON public.products FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "products_user_delete" ON public.products FOR DELETE
    USING (auth.uid() = user_id);

-- time_entries
CREATE POLICY "time_entries_user_select" ON public.time_entries FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "time_entries_user_insert" ON public.time_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "time_entries_user_update" ON public.time_entries FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "time_entries_user_delete" ON public.time_entries FOR DELETE
    USING (auth.uid() = user_id);


-- =============================================
-- VERIFY
-- =============================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'accounts', 'expenses', 'incomes', 'transactions',
        'budgets', 'categories',
        'quotes', 'products', 'time_entries'
      );

    RAISE NOTICE '✅ Financial RLS policies created: % total', policy_count;

    IF policy_count >= 36 THEN
        RAISE NOTICE '✅ All 9 financial tables have full CRUD policies';
    ELSE
        RAISE WARNING '⚠️ Expected 36 policies (9 tables × 4), got %', policy_count;
    END IF;
END $$;
