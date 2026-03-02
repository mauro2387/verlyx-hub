# PHASE 1: STRUCTURAL DATA INTEGRITY AUDIT

## Verlyx Hub — Enterprise Architecture Report

**Date:** 2025-01-XX  
**Scope:** All 39+ SQL schema files, all frontend TypeScript types/stores/helpers  
**Verdict:** 🔴 CRITICAL — System cannot operate reliably without corrections

---

## EXECUTIVE SUMMARY

Verlyx Hub has **two competing database schemas** that were never reconciled:

| Schema | Source | Convention | Status |
|--------|--------|-----------|--------|
| **Schema A** | `supabase-setup.sql` | lowercase CHECK constraints (`pending`, `won`, `low`) | Likely deployed (original setup) |
| **Schema B** | `database/10_create_deals.sql`, `12_create_tasks.sql` | UPPERCASE ENUMs (`TODO`, `CLOSED_WON`, `LOW`) | Migration files (may or may not be deployed) |
| **Schema C** | `fix_projects_status_constraint.sql` | Mixed lowercase (`backlog`, `in_progress`, `done`) | Patch (replaces Schema A project statuses) |

The frontend attempts to bridge both with **dual-case union types** (e.g., `'TODO' | 'pending'`), but the two schemas have **different value names** (not just different casing), making the bridge incomplete.

### Impact Counts

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — INSERT will crash** | 13 | Values sent to DB violate CHECK/ENUM constraints |
| **P0 — Trigger runtime failure** | 3 | Triggers reference wrong columns/values |
| **P1 — Duplicate table definitions** | 8 | Same table defined in multiple files with conflicts |
| **P1 — Missing FK constraints** | 37 | Cross-table references without referential integrity |
| **P1 — RLS disabled** | 12 | Tables accessible without row-level security |
| **P2 — Silent data loss** | 4 | Views/functions query wrong status values |
| **P2 — Security hole** | 2 | `GRANT ALL` to anon role on pdf_templates/generated_pdfs |
| **P3 — Missing validation** | 10 | INSERT/UPDATE accepts any string for typed fields |
| **P3 — Missing CHECK constraints** | 26 | No validation on monetary amounts, percentages, dates |

---

## 1. SCHEMA CORRECTION PLAN

### 1.1 Decision: Consolidate on Schema A (lowercase + CHECK constraints)

**Rationale:**
- `supabase-setup.sql` was the original deployed schema
- Schema A uses VARCHAR + CHECK (more flexible, easier to migrate)
- Schema B ENUMs require `ALTER TYPE ... ADD VALUE` which can't run in transactions
- Frontend `utils.ts` color maps already have lowercase entries for projects
- Multiple stores already cast to lowercase values

**Canonical Values (post-correction):**

```
task_status:    'todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled'
deal_stage:     'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
priority:       'low', 'medium', 'high', 'urgent'
project_status: 'backlog', 'planning', 'in_progress', 'on_hold', 'review', 'done', 'cancelled'
contact_type:   'lead', 'client', 'partner', 'supplier', 'merchant'
contact_status: 'new', 'contacted', 'qualified', 'negotiation', 'won', 'lost', 'inactive'
```

### 1.2 Tables With Duplicate/Conflicting Definitions (8 tables)

| Table | File A | File B | Conflict |
|-------|--------|--------|----------|
| `deals` | `supabase-setup.sql` L115 | `database/10_create_deals.sql` | CHECK vs ENUM for stage; different column names |
| `tasks` | `supabase-setup.sql` L175 | `database/12_create_tasks.sql` | CHECK vs ENUM for status/priority; different columns |
| `payment_links` | `supabase-setup.sql` L204 | `database/22_create_verlyx_payments.sql` | Different column sets |
| `payments` | `supabase-setup.sql` L257 | `database/22_create_verlyx_payments.sql` | Different column sets |
| `subscriptions` | `supabase-setup.sql` L230 | `database/21_create_mercadopago_subscriptions.sql` | Different column sets |
| `documents` | `supabase-setup.sql` L319 | `database/16_create_documents.sql` | Extra columns (project_id, contact_id, tags) |
| `notifications` | `supabase-setup.sql` L343 | `database/24_enterprise_modules.sql` | Completely different structure |
| `company_users` | `database/05_create_company_users.sql` | `database/20_create_financial_system.sql` | Different column names (company_id vs my_company_id) |

**Resolution:** Create a single canonical `000_canonical_schema.sql` that is the source of truth. All numbered migration files become supplementary (additive only).

### 1.3 Missing Foreign Key Constraints (37 total)

**Critical (data orphan risk):**

| Table | Column | Should Reference | Risk |
|-------|--------|-----------------|------|
| `quotes` | `user_id` | `auth.users(id)` | Orphaned quotes |
| `quotes` | `contact_id` | `contacts(id)` | Quote→contact broken |
| `quotes` | `deal_id` | `deals(id)` | Quote→deal broken |
| `quote_items` | `product_id` | `products(id)` | Invalid product ref |
| `time_entries` | `user_id` | `auth.users(id)` | Ghost time entries |
| `time_entries` | `project_id` | `projects(id)` | Time→project broken |
| `time_entries` | `task_id` | `tasks(id)` | Time→task broken |
| `products` | `user_id` | `auth.users(id)` | Orphaned products |
| `goals` | `user_id` | `auth.users(id)` | Orphaned goals |
| `automations` | `created_by` | `auth.users(id)` | Orphaned automations |
| `automation_steps` | `parent_step_id` | `automation_steps(id)` | Self-ref broken |
| `documents` | `project_id` | `projects(id)` | Doc→project broken |
| `documents` | `contact_id` | `contacts(id)` | Doc→contact broken |
| `team_members` | `my_company_id` | `my_companies(id)` | Team→company broken |
| `team_member_hours` | `team_member_id` | `team_members(id)` | Hours→member broken |
| `team_member_payments` | `team_member_id` | `team_members(id)` | Payment→member broken |
| `team_member_documents` | `team_member_id` | `team_members(id)` | Doc→member broken |
| `contact_activities` | `deal_id` | `deals(id)` | Activity→deal broken |
| `contact_activities` | `project_id` | `projects(id)` | Activity→project broken |
| `contact_activities` | `task_id` | `tasks(id)` | Activity→task broken |
| `client_lead_scores` | `contact_id` | `contacts(id)` | Score→contact broken |
| `lead_score_history` | `rule_id` | `lead_scoring_rules(id)` | History→rule broken |
| `lead_score_history` | `activity_id` | `contact_activities(id)` | History→activity broken |
| `contact_segment_members` | `segment_id` | `client_segments(id)` | Member→segment broken |
| `contact_segment_members` | `contact_id` | `contacts(id)` | Member→contact broken |
| `scheduled_communications` | `contact_id` | `contacts(id)` | Comm→contact broken |
| `scheduled_communications` | `segment_id` | `client_segments(id)` | Comm→segment broken |
| `notifications` (Schema B) | `user_id` | `auth.users(id)` | Notification→user broken |
| `calendar_events` | `created_by` | `auth.users(id)` | Event→user broken |
| `workspace_pages` | `parent_id` | `workspace_pages(id)` | Self-ref broken |

### 1.4 Tables With RLS Disabled (12 tables)

| Table | File | Risk |
|-------|------|------|
| `payment_links` | `supabase-setup.sql` | Any authenticated user can see all payment links |
| `payments` | `supabase-setup.sql` | Any authenticated user can see all payments |
| `refunds` | `database/22_create_verlyx_payments.sql` | Refund data exposed |
| `documents` (Schema A) | `supabase-setup.sql` | All documents readable |
| `pdf_templates` | `database/17_create_pdf_templates.sql` | **GRANT ALL to anon** |
| `generated_pdfs` | `database/17_create_pdf_templates.sql` | **GRANT ALL to anon** |
| `workspace_pages` | `database/14_workspace_pages.sql` | Multi-tenant data leak |
| `page_blocks` | `database/14_workspace_pages.sql` | Multi-tenant data leak |
| `page_comments` | `database/14_workspace_pages.sql` | Multi-tenant data leak |
| `page_permissions` | `database/14_workspace_pages.sql` | Multi-tenant data leak |
| `calendar_events` | `database/15_create_calendar_events.sql` | Calendar exposed |
| `active_timers` | `database/24_enterprise_modules.sql` | Timer data exposed |

### 1.5 Broken Triggers (3 critical runtime failures)

**1. `log_page_changes()` — Will crash on every page update:**
```sql
-- WRONG: Inserts 'INSERT' which is NOT in audit_action enum ('create','update','delete','login','logout','export','import')
INSERT INTO audit_logs (company_id, ..., action, ...)
VALUES (NEW.my_company_id, ..., 'INSERT', ...);
-- Also: company_id column doesn't exist (should be my_company_id)
-- Also: NEW.id is UUID but user_id expects auth.uid()
```

**2. `create_income_from_verlyx_payment()` — Will crash on payment approval:**
```sql
-- WRONG column names:
INSERT INTO incomes (company_id, concept, income_date, ...)
-- CORRECT:
INSERT INTO incomes (my_company_id, description, payment_date, ...)
```

**3. RLS policies in `20_create_financial_system.sql` — Will deny all access:**
```sql
-- WRONG: References company_users.my_company_id (column doesn't exist)
WHERE my_company_id IN (SELECT my_company_id FROM company_users WHERE user_id = auth.uid())
-- CORRECT: column is company_id in company_users
WHERE my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
```

### 1.6 Missing CHECK Constraints (26+)

| Table | Column | Missing Constraint |
|-------|--------|--------------------|
| All financial tables | `amount`, `total`, `unit_price` | `CHECK (amount >= 0)` |
| `quote_items` | `quantity` | `CHECK (quantity > 0)` |
| `quote_items` | `discount_percent` | `CHECK (discount_percent BETWEEN 0 AND 100)` |
| `quotes` | `discount_percent` | `CHECK (discount_percent BETWEEN 0 AND 100)` |
| `quotes` | `tax_percent` | `CHECK (tax_percent BETWEEN 0 AND 100)` |
| `time_entries` | `duration_minutes` | `CHECK (duration_minutes > 0)` |
| `time_entries` | `hourly_rate` | `CHECK (hourly_rate >= 0)` |
| `goals` | `target_value` | `CHECK (target_value > 0)` |
| `goals` | `current_value` | `CHECK (current_value >= 0)` |
| `budgets` | `planned_amount` | `CHECK (planned_amount > 0)` |
| `budgets` | `alert_percentage` | `CHECK (alert_percentage BETWEEN 0 AND 100)` |
| `team_members` | `hourly_rate` | `CHECK (hourly_rate >= 0)` |
| `team_members` | `monthly_salary` | `CHECK (monthly_salary >= 0)` |
| `team_member_payments` | `amount` | `CHECK (amount > 0)` |
| `team_member_hours` | `hours_worked` | `CHECK (hours_worked > 0)` |

---

## 2. FRONTEND CORRECTION PLAN

### 2.1 Type System Consolidation

**Current (broken):**
```typescript
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'DONE' | 'CANCELLED' 
                        | 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
```

**Corrected (canonical lowercase):**
```typescript
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled';
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'backlog' | 'planning' | 'in_progress' | 'on_hold' | 'review' | 'done' | 'cancelled';
export type ContactType = 'lead' | 'client' | 'partner' | 'supplier' | 'merchant';
export type ContactStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost' | 'inactive';
```

### 2.2 Store Fixes Required

| Store | Issue | Fix |
|-------|-------|-----|
| `useDealsStore.fetchDeals` | Hardcodes `priority: 'medium' as const` | Read from DB or default to `'medium'` (lowercase valid) |
| `useDealsStore.getStageStats` | Uses UPPERCASE stages only | Change to lowercase `['lead', 'qualified', ...]` |
| `useClientsStore.fetchClients` | Casts type as `'individual' \| 'company'` | Cast as `ContactType` |
| `useClientsStore.addClient` | Sends `type: 'individual'` | Send `type: 'lead'` (DB default) |
| `useClientsStore` | Uses `isActive: c.status === 'active'` | `contacts` has no 'active' in status CHECK |
| `useProjectsStore.fetchProjects` | Casts `'active' \| 'completed'` | Cast as `ProjectStatus` |
| `useTasksStore.addTask` | Passes `status` unvalidated | Validate against `TaskStatus` |
| `useTasksStore.updateTask` | Checks `status === 'DONE'` for completed_at | Change to `status === 'done'` |

### 2.3 Color/Label Map Corrections

| Map | Issue | Fix |
|-----|-------|-----|
| `taskStatusColors` | Only UPPERCASE keys | Add lowercase keys OR consolidate to lowercase only |
| `dealStageColors` | Only UPPERCASE keys | Consolidate to lowercase |
| `priorityColors` | Has both cases + `CRITICAL` | Remove `CRITICAL`/`URGENT`, keep `urgent` only |
| `projectStatusColors` | Already lowercase ✓ | No change needed |

### 2.4 Page-Level Fixes

| Page | Issue |
|------|-------|
| `tasks/page.tsx` | Kanban columns use `TODO`, `IN_PROGRESS`, etc. → change to lowercase |
| `tasks/page.tsx` | Priority filter includes `CRITICAL` → remove |
| `deals/page.tsx` | Pipeline columns use UPPERCASE stages → change to lowercase |
| `clients/page.tsx` | Type filter shows `individual`/`company` → change to `lead`/`client`/`partner`/`supplier`/`merchant` |
| `projects/new/page.tsx` | Priority select may include `critical` → change to `urgent` |
| `organizations/page.tsx` | Types `DEPARTMENT`/`SUBSIDIARY` → not in DB |
| `notifications/page.tsx` | Uses 10 types different from DB → align to canonical set |
| `payments/page.tsx` | Status `pending`/`failed`/`error` → not in payment_links CHECK |
| `dashboard/page.tsx` | Status checks use both `'TODO' \|\| 'pending'` workaround → simplify |

### 2.5 Column Name Mismatches

| Frontend sends | DB column | Table | Impact |
|----------------|-----------|-------|--------|
| `type` | `product_type` | `products` | INSERT will fail or store in wrong column |
| `clientId` | `contact_id` | `projects`, `deals` | Works via store mapping ✓ |
| `company_id` | `my_company_id` | Financial tables | RLS policies broken |

---

## 3. MIGRATION SEQUENCE (Safe Execution Order)

### Pre-Flight Checks
```sql
-- 1. Verify which schema is currently deployed
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND table_schema = 'public';

-- 2. Check if ENUMs exist
SELECT typname FROM pg_type WHERE typname LIKE '%task%' OR typname LIKE '%deal%' OR typname LIKE '%priority%';

-- 3. Count existing data to assess risk
SELECT 
  (SELECT COUNT(*) FROM tasks) as tasks,
  (SELECT COUNT(*) FROM deals) as deals,
  (SELECT COUNT(*) FROM projects) as projects,
  (SELECT COUNT(*) FROM contacts) as contacts;
```

### Phase 1-A: Fix Broken Triggers (IMMEDIATE — prevents runtime crashes)
```
Order  File                               Action
─────  ────                               ──────
1      migration/01_fix_triggers.sql       Fix log_page_changes(), create_income_from_verlyx_payment()
2      migration/02_fix_rls_policies.sql   Fix company_users column refs in all RLS policies
```

### Phase 1-B: Consolidate Constraints (requires data migration)
```
Order  File                                   Action
─────  ────                                   ──────
3      migration/03_normalize_values.sql       UPDATE existing rows: UPPERCASE → lowercase
4      migration/04_consolidate_checks.sql     DROP old CHECK/ENUM, ADD new CHECK constraints
5      migration/05_add_missing_fks.sql        ADD FOREIGN KEY constraints (37 total)
6      migration/06_add_missing_checks.sql     ADD CHECK constraints for amounts, percentages
```

### Phase 1-C: Enable Security (must come AFTER data is clean)
```
Order  File                                   Action
─────  ────                                   ──────
7      migration/07_enable_rls.sql             ALTER TABLE ... ENABLE ROW LEVEL SECURITY (12 tables)
8      migration/08_create_rls_policies.sql    CREATE POLICY for all 12 tables
9      migration/09_revoke_anon_access.sql     REVOKE ALL FROM anon on pdf_templates, generated_pdfs
```

### Phase 1-D: Frontend Deploy (after DB migrations)
```
Order  File                                   Action
─────  ────                                   ──────
10     types.ts                                Consolidate to canonical lowercase types
11     utils.ts                                Consolidate color maps to lowercase keys
12     store.ts                                Fix all hardcoded values, remove UPPERCASE refs
13     Page files                              Update all status/type constants
14     enterprise-helpers.ts                   Add type guards on INSERT operations
```

---

## 4. BREAKING CHANGE IMPACT MAP

### Database Breaking Changes

| Change | Tables Affected | Risk | Mitigation |
|--------|----------------|------|------------|
| UPPERCASE → lowercase values | tasks, deals | **HIGH** — existing data must be migrated | UPDATE before DROP constraint |
| Remove `active`/`completed` from projects | projects | **MEDIUM** — existing projects need re-mapping | `UPDATE projects SET status = 'in_progress' WHERE status = 'active'` |
| Add FK constraints | 16 tables | **HIGH** — orphaned rows will block `ALTER TABLE` | DELETE orphans first, or use `NOT VALID` + `VALIDATE CONSTRAINT` |
| Enable RLS on 12 tables | 12 tables | **CRITICAL** — existing queries will return empty | Must create policies BEFORE enabling RLS |
| Fix `company_users.company_id` refs | All financial RLS | **CRITICAL** — RLS policies currently broken | Fix policies atomically |

### Frontend Breaking Changes

| Change | Files Affected | Risk | Mitigation |
|--------|---------------|------|------------|
| `TaskStatus` → lowercase only | 8+ files | **HIGH** — kanban, filters, dashboard | Search-replace `TODO` → `todo`, etc. |
| `DealStage` → lowercase only | 5+ files | **HIGH** — pipeline view, stats | Search-replace `CLOSED_WON` → `won` |
| Remove `CRITICAL` priority | 3+ files | **LOW** — replace with `urgent` |  |
| `Client.type` remove `individual`/`company` | 4+ files | **MEDIUM** — client forms, filters | Add `supplier` to valid types |
| `products.type` → `products.product_type` | 2 files | **HIGH** — INSERT will fail | Fix column name in supabase.ts |

### API Contract Changes

| Endpoint Pattern | Change | Impact |
|-----------------|--------|--------|
| All Supabase `.insert()` | Value constraints tightened | Invalid inserts will fail with constraint violation |
| All Supabase `.select()` with RLS | RLS enabled | Queries without proper auth context return empty |
| Financial tables | RLS policy column fixed | Previously broken queries will now work |

---

## 5. ROLLBACK STRATEGY

### Database Rollback

Each migration script must include a reverse section. Key rollbacks:

```sql
-- Rollback 03_normalize_values.sql
UPDATE tasks SET status = UPPER(status), priority = UPPER(priority) WHERE status = LOWER(status);
UPDATE deals SET stage = CASE stage WHEN 'won' THEN 'CLOSED_WON' WHEN 'lost' THEN 'CLOSED_LOST' ELSE UPPER(stage) END;

-- Rollback 04_consolidate_checks.sql
-- Re-add old CHECK constraints (store old definitions before DROP)

-- Rollback 05_add_missing_fks.sql
-- Each FK added with a named constraint for easy DROP:
-- ALTER TABLE quotes DROP CONSTRAINT IF EXISTS fk_quotes_user;

-- Rollback 07_enable_rls.sql
ALTER TABLE payment_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
-- ... (12 tables)

-- Rollback 09_revoke_anon_access.sql
GRANT ALL ON pdf_templates TO anon;
GRANT ALL ON generated_pdfs TO anon;
```

### Frontend Rollback

- Git revert the types.ts/store.ts/utils.ts commit
- Frontend can temporarily use dual-case types as compatibility bridge
- Deploy frontend rollback BEFORE database rollback (order matters)

### Rollback Decision Points

| Condition | Action |
|-----------|--------|
| Migration 03 fails on UPDATE | Check for NULL values; fix data manually |
| Migration 05 fails on FK | Orphaned rows exist; run cleanup query first |
| Migration 07 breaks queries | Emergency: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` |
| Frontend deploy shows blank pages | Revert frontend git commit; DB can stay migrated |

---

## 6. ADDITIONAL FINDINGS

### 6.1 Duplicate `update_updated_at` Triggers (7 copies)

Files `05`, `06`, `07`, `09`, `10`, `12`, `15` each define the same trigger function. Consolidate to one in the canonical schema using `CREATE OR REPLACE`.

### 6.2 Unused ENUM Types (3)

- `event_type` — defined but `calendar_events` uses VARCHAR
- `event_status` — same
- `event_priority` — same

### 6.3 Views With Wrong Values

| View/Function | File | Wrong Value | Correct Value |
|--------------|------|-------------|---------------|
| `dashboard_metrics` | `supabase-setup.sql` L438 | `status = 'active'` | `status = 'in_progress'` |
| `dashboard_metrics` | `supabase-setup.sql` L439 | `status = 'pending'` | `status = 'todo'` |
| `dashboard_metrics` | `supabase-setup.sql` L441 | `stage = 'won'` | `stage = 'won'` ✓ (if lowercase) |
| `calculate_project_progress` | `supabase-setup.sql` L459 | `status = 'completed'` | `status = 'done'` |

### 6.4 `ON DELETE` Action Gaps

~25 `created_by` columns reference `auth.users(id)` with implicit `RESTRICT`. Deleting any user will be blocked. Recommendation: Use `ON DELETE SET NULL` for `created_by` columns, `ON DELETE CASCADE` for child records (quote_items, automation_steps, etc.).

### 6.5 Legacy Type Conflicts

`types.ts` has a legacy `LeadScore` type with `temperature: 'cold' | 'warm' | 'hot'` (missing `very_hot`), while the main `LeadTemperature` type correctly includes `very_hot`. The legacy type should be removed or updated.

---

## 7. IMMEDIATE ACTION ITEMS

### Must Fix Before Any Feature Work

1. **Fix triggers** — `log_page_changes()` and `create_income_from_verlyx_payment()` will crash at runtime
2. **Fix RLS column references** — Financial table policies reference wrong column
3. **Revoke anon access** — `pdf_templates` and `generated_pdfs` are publicly accessible
4. **Fix products column** — Frontend sends `type` but DB column is `product_type`
5. **Decide canonical schema** — Cannot proceed with any module work until UPPERCASE vs lowercase is resolved

### Can Fix During Normal Development

6. Add FK constraints (with `NOT VALID` initially for zero-downtime)
7. Enable RLS on remaining 12 tables
8. Add CHECK constraints on monetary fields
9. Consolidate duplicate trigger functions
10. Clean up unused ENUMs

---

## PHASE 1 STATUS: AUDIT COMPLETE ✅

**Next Phase:** Phase 2 — Lifecycle Coherence (CRM → Project → Finance flow integrity)

**Recommendation:** Execute migration scripts 01-09 in Supabase SQL editor, then deploy frontend fixes. Total estimated effort: 4-6 hours of careful sequential execution with verification at each step.
