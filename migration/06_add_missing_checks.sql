-- ============================================
-- PHASE 1-B, STEP 6: ADD MISSING CHECK CONSTRAINTS
-- Adds validation constraints on monetary amounts, percentages, and dates
-- Run AFTER 05_add_missing_fks.sql
-- ============================================

-- =====================
-- QUOTES
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes' AND table_schema = 'public') THEN
    ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_discount_percent;
    ALTER TABLE quotes ADD CONSTRAINT chk_quotes_discount_percent CHECK (discount_percent BETWEEN 0 AND 100);
    ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_tax_percent;
    ALTER TABLE quotes ADD CONSTRAINT chk_quotes_tax_percent CHECK (tax_percent BETWEEN 0 AND 100);
    ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_total_positive;
    ALTER TABLE quotes ADD CONSTRAINT chk_quotes_total_positive CHECK (total >= 0);
    ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_subtotal_positive;
    ALTER TABLE quotes ADD CONSTRAINT chk_quotes_subtotal_positive CHECK (subtotal >= 0);
  ELSE
    RAISE NOTICE 'Skipping quotes checks — table does not exist';
  END IF;
END $$;

-- QUOTE_ITEMS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_items' AND table_schema = 'public') THEN
    ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS chk_quote_items_quantity;
    ALTER TABLE quote_items ADD CONSTRAINT chk_quote_items_quantity CHECK (quantity > 0);
    ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS chk_quote_items_unit_price;
    ALTER TABLE quote_items ADD CONSTRAINT chk_quote_items_unit_price CHECK (unit_price >= 0);
    ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS chk_quote_items_discount;
    ALTER TABLE quote_items ADD CONSTRAINT chk_quote_items_discount CHECK (discount_percent BETWEEN 0 AND 100);
    ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS chk_quote_items_tax;
    ALTER TABLE quote_items ADD CONSTRAINT chk_quote_items_tax CHECK (tax_percent BETWEEN 0 AND 100);
  ELSE
    RAISE NOTICE 'Skipping quote_items checks — table does not exist';
  END IF;
END $$;

-- =====================
-- TIME_ENTRIES
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries' AND table_schema = 'public') THEN
    ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS chk_time_entries_duration;
    ALTER TABLE time_entries ADD CONSTRAINT chk_time_entries_duration CHECK (duration_minutes >= 0);
    ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS chk_time_entries_hourly_rate;
    ALTER TABLE time_entries ADD CONSTRAINT chk_time_entries_hourly_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0);
    ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS chk_time_entries_total_amount;
    ALTER TABLE time_entries ADD CONSTRAINT chk_time_entries_total_amount CHECK (total_amount >= 0);
  ELSE
    RAISE NOTICE 'Skipping time_entries checks — table does not exist';
  END IF;
END $$;

-- =====================
-- PRODUCTS
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_products_unit_price;
    ALTER TABLE products ADD CONSTRAINT chk_products_unit_price CHECK (unit_price >= 0);
    ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_products_cost_price;
    ALTER TABLE products ADD CONSTRAINT chk_products_cost_price CHECK (cost_price >= 0);
    ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_products_tax_percent;
    ALTER TABLE products ADD CONSTRAINT chk_products_tax_percent CHECK (tax_percent BETWEEN 0 AND 100);
  ELSE
    RAISE NOTICE 'Skipping products checks — table does not exist';
  END IF;
END $$;

-- =====================
-- GOALS
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals' AND table_schema = 'public') THEN
    ALTER TABLE goals DROP CONSTRAINT IF EXISTS chk_goals_target_value;
    ALTER TABLE goals ADD CONSTRAINT chk_goals_target_value CHECK (target_value > 0);
    ALTER TABLE goals DROP CONSTRAINT IF EXISTS chk_goals_current_value;
    ALTER TABLE goals ADD CONSTRAINT chk_goals_current_value CHECK (current_value >= 0);
  ELSE
    RAISE NOTICE 'Skipping goals checks — table does not exist';
  END IF;
END $$;

-- =====================
-- BUDGETS
-- =====================

ALTER TABLE budgets DROP CONSTRAINT IF EXISTS chk_budgets_planned_amount;
ALTER TABLE budgets ADD CONSTRAINT chk_budgets_planned_amount 
  CHECK (planned_amount > 0);

ALTER TABLE budgets DROP CONSTRAINT IF EXISTS chk_budgets_alert_percentage;
ALTER TABLE budgets ADD CONSTRAINT chk_budgets_alert_percentage 
  CHECK (alert_percentage BETWEEN 0 AND 100);

-- =====================
-- FINANCIAL: EXPENSES & INCOMES
-- =====================

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expenses_amount;
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_amount 
  CHECK (amount > 0);

ALTER TABLE incomes DROP CONSTRAINT IF EXISTS chk_incomes_amount;
ALTER TABLE incomes ADD CONSTRAINT chk_incomes_amount 
  CHECK (amount > 0);

-- =====================
-- ACCOUNTS
-- =====================

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_accounts_initial_balance;
ALTER TABLE accounts ADD CONSTRAINT chk_accounts_initial_balance 
  CHECK (initial_balance >= 0);

-- =====================
-- TEAM_MEMBERS (if table exists)
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    ALTER TABLE team_members DROP CONSTRAINT IF EXISTS chk_team_members_hourly_rate;
    ALTER TABLE team_members ADD CONSTRAINT chk_team_members_hourly_rate 
      CHECK (hourly_rate IS NULL OR hourly_rate >= 0);

    ALTER TABLE team_members DROP CONSTRAINT IF EXISTS chk_team_members_monthly_salary;
    ALTER TABLE team_members ADD CONSTRAINT chk_team_members_monthly_salary 
      CHECK (monthly_salary IS NULL OR monthly_salary >= 0);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_member_payments') THEN
    ALTER TABLE team_member_payments DROP CONSTRAINT IF EXISTS chk_team_member_payments_amount;
    ALTER TABLE team_member_payments ADD CONSTRAINT chk_team_member_payments_amount 
      CHECK (amount > 0);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_member_hours') THEN
    ALTER TABLE team_member_hours DROP CONSTRAINT IF EXISTS chk_team_member_hours_worked;
    ALTER TABLE team_member_hours ADD CONSTRAINT chk_team_member_hours_worked 
      CHECK (hours_worked > 0);
      
    ALTER TABLE team_member_hours DROP CONSTRAINT IF EXISTS chk_team_member_hourly_rate;
    ALTER TABLE team_member_hours ADD CONSTRAINT chk_team_member_hourly_rate 
      CHECK (hourly_rate IS NULL OR hourly_rate >= 0);
  END IF;
END $$;

-- =====================
-- DEALS
-- =====================

ALTER TABLE deals DROP CONSTRAINT IF EXISTS chk_deals_value;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'value'
  ) THEN
    ALTER TABLE deals ADD CONSTRAINT chk_deals_value CHECK (value IS NULL OR value >= 0);
  END IF;
END $$;

-- =====================
-- PAYMENT_LINKS
-- =====================

ALTER TABLE payment_links DROP CONSTRAINT IF EXISTS chk_payment_links_amount;
ALTER TABLE payment_links ADD CONSTRAINT chk_payment_links_amount 
  CHECK (amount > 0);

-- =====================
-- PAYMENTS
-- =====================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_amount;
ALTER TABLE payments ADD CONSTRAINT chk_payments_amount 
  CHECK (amount > 0);

-- =====================
-- VERIFICATION
-- =====================
SELECT tc.table_name, tc.constraint_name, cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name LIKE 'chk_%'
ORDER BY tc.table_name, tc.constraint_name;

DO $$
BEGIN
  RAISE NOTICE '✅ CHECK constraints added for monetary amounts, percentages, and quantities';
END $$;

-- =====================
-- ROLLBACK
-- =====================
-- Each constraint is named with chk_ prefix for easy removal:
-- ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_discount_percent;
-- ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_tax_percent;
-- ... etc.
