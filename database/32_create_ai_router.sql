-- ============================================================
-- PHASE 1: AI ROUTER INFRASTRUCTURE
-- Verlyx Hub Enterprise Architecture Redesign
-- ============================================================
-- Tables for AI request logging, cost tracking, and model
-- routing configuration. Supports the internal AI Router
-- that dynamically selects OpenAI models.
-- ============================================================

-- 1. AI Model registry
DO $$ BEGIN
  CREATE TYPE ai_model_tier AS ENUM ('fast', 'balanced', 'powerful');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_task_type AS ENUM (
    'classify',        -- classify leads, tags, categories
    'generate_email',  -- email copy generation
    'generate_whatsapp', -- WhatsApp message generation
    'interpret_tags',  -- convert natural language to OSM tags
    'score_lead',      -- lead scoring / prospect scoring
    'summarize',       -- summarize conversations, notes
    'extract',         -- extract structured data from text
    'chat',            -- general conversation
    'analyze'          -- data analysis, reports
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL UNIQUE,   -- e.g. 'gpt-4.1-mini'
  provider VARCHAR(50) NOT NULL DEFAULT 'openai',
  tier ai_model_tier NOT NULL,
  max_tokens INTEGER DEFAULT 4096,
  cost_per_1k_input DECIMAL(10,6) DEFAULT 0,
  cost_per_1k_output DECIMAL(10,6) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  capabilities TEXT[] DEFAULT '{}',            -- e.g. {'json_mode', 'function_calling', 'vision'}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default models
INSERT INTO ai_models (model_name, provider, tier, max_tokens, cost_per_1k_input, cost_per_1k_output, capabilities) VALUES
  ('gpt-4.1-mini', 'openai', 'fast', 16384, 0.000400, 0.001600, ARRAY['json_mode', 'function_calling']),
  ('gpt-4o-mini', 'openai', 'fast', 16384, 0.000150, 0.000600, ARRAY['json_mode', 'function_calling', 'vision']),
  ('gpt-4.1', 'openai', 'powerful', 32768, 0.002000, 0.008000, ARRAY['json_mode', 'function_calling', 'vision']),
  ('gpt-4o', 'openai', 'balanced', 16384, 0.002500, 0.010000, ARRAY['json_mode', 'function_calling', 'vision'])
ON CONFLICT (model_name) DO NOTHING;

-- 2. Task → Model routing rules
CREATE TABLE IF NOT EXISTS ai_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type ai_task_type NOT NULL,
  model_id UUID NOT NULL REFERENCES ai_models(id),
  priority INTEGER DEFAULT 1,                -- 1 = primary, 2 = fallback
  max_retries INTEGER DEFAULT 2,
  timeout_ms INTEGER DEFAULT 30000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_type, priority)
);

-- Seed default routing rules
INSERT INTO ai_routing_rules (task_type, model_id, priority, max_retries, timeout_ms) VALUES
  -- Fast tasks → gpt-4.1-mini / gpt-4o-mini
  ('classify',          (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1-mini'), 1, 2, 10000),
  ('classify',          (SELECT id FROM ai_models WHERE model_name = 'gpt-4o-mini'), 2, 1, 15000),
  ('interpret_tags',    (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1-mini'), 1, 2, 10000),
  ('interpret_tags',    (SELECT id FROM ai_models WHERE model_name = 'gpt-4o-mini'), 2, 1, 15000),
  ('score_lead',        (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1-mini'), 1, 2, 10000),
  ('score_lead',        (SELECT id FROM ai_models WHERE model_name = 'gpt-4o-mini'), 2, 1, 15000),
  -- Powerful tasks → gpt-4.1 / gpt-4o
  ('generate_email',    (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1'), 1, 2, 30000),
  ('generate_email',    (SELECT id FROM ai_models WHERE model_name = 'gpt-4o'), 2, 1, 30000),
  ('generate_whatsapp', (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1'), 1, 2, 20000),
  ('generate_whatsapp', (SELECT id FROM ai_models WHERE model_name = 'gpt-4o'), 2, 1, 20000),
  ('summarize',         (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1'), 1, 2, 30000),
  ('summarize',         (SELECT id FROM ai_models WHERE model_name = 'gpt-4o'), 2, 1, 30000),
  ('extract',           (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1'), 1, 2, 20000),
  ('extract',           (SELECT id FROM ai_models WHERE model_name = 'gpt-4o'), 2, 1, 20000),
  -- Chat → gpt-4.1 (needs deep context)
  ('chat',              (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1'), 1, 2, 60000),
  ('chat',              (SELECT id FROM ai_models WHERE model_name = 'gpt-4o'), 2, 1, 60000),
  -- Analysis → gpt-4.1 (complex reasoning)
  ('analyze',           (SELECT id FROM ai_models WHERE model_name = 'gpt-4.1'), 1, 2, 60000),
  ('analyze',           (SELECT id FROM ai_models WHERE model_name = 'gpt-4o'), 2, 1, 60000)
ON CONFLICT (task_type, priority) DO NOTHING;

-- 3. AI request log (cost tracking, debugging, analytics)
CREATE TABLE IF NOT EXISTS ai_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID REFERENCES my_companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Request details
  task_type ai_task_type NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Cost tracking (USD)
  estimated_cost_usd DECIMAL(10,6) DEFAULT 0,
  
  -- Performance
  latency_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'retry')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Context
  request_summary TEXT,          -- brief desc of what was asked (no PII)
  response_summary TEXT,         -- brief desc of result
  metadata JSONB DEFAULT '{}',   -- additional context
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_ai_logs_company ON ai_request_logs(my_company_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_task ON ai_request_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_model ON ai_request_logs(model_used);
CREATE INDEX IF NOT EXISTS idx_ai_logs_date ON ai_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON ai_request_logs(status) WHERE status != 'success';

-- 4. AI usage summary (materialized, refreshed periodically)
CREATE TABLE IF NOT EXISTS ai_usage_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  total_requests INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,4) DEFAULT 0,
  
  requests_by_task JSONB DEFAULT '{}',        -- {"classify": 42, "generate_email": 15}
  tokens_by_model JSONB DEFAULT '{}',         -- {"gpt-4.1-mini": 12000, "gpt-4.1": 5000}
  cost_by_model JSONB DEFAULT '{}',           -- {"gpt-4.1-mini": 0.05, "gpt-4.1": 0.12}
  
  error_rate DECIMAL(5,2) DEFAULT 0,
  avg_latency_ms INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(my_company_id, period_start, period_end)
);

-- 5. RLS on AI tables
ALTER TABLE ai_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_logs_select ON ai_request_logs FOR SELECT
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ai_logs_insert ON ai_request_logs FOR INSERT
  WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ai_usage_select ON ai_usage_summary FOR SELECT
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- 6. Function to get routing config for a task
CREATE OR REPLACE FUNCTION get_ai_route(p_task_type TEXT)
RETURNS TABLE (
  model_name VARCHAR,
  provider VARCHAR,
  max_tokens INTEGER,
  max_retries INTEGER,
  timeout_ms INTEGER,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.model_name,
    m.provider,
    m.max_tokens,
    r.max_retries,
    r.timeout_ms,
    r.priority
  FROM ai_routing_rules r
  JOIN ai_models m ON m.id = r.model_id
  WHERE r.task_type = p_task_type::ai_task_type
    AND r.is_active = TRUE
    AND m.is_active = TRUE
  ORDER BY r.priority ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to log AI request
CREATE OR REPLACE FUNCTION log_ai_request(
  p_my_company_id UUID,
  p_user_id UUID,
  p_task_type TEXT,
  p_model_used TEXT,
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER,
  p_latency_ms INTEGER,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_retry_count INTEGER DEFAULT 0,
  p_request_summary TEXT DEFAULT NULL,
  p_response_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_cost DECIMAL(10,6);
  v_model ai_models%ROWTYPE;
  v_log_id UUID;
BEGIN
  -- Get model cost rates
  SELECT * INTO v_model FROM ai_models WHERE model_name = p_model_used;
  
  IF v_model IS NOT NULL THEN
    v_cost := (p_prompt_tokens * v_model.cost_per_1k_input / 1000.0) 
            + (p_completion_tokens * v_model.cost_per_1k_output / 1000.0);
  ELSE
    v_cost := 0;
  END IF;
  
  INSERT INTO ai_request_logs (
    my_company_id, user_id, task_type, model_used,
    prompt_tokens, completion_tokens, total_tokens,
    estimated_cost_usd, latency_ms, status, error_message,
    retry_count, request_summary, response_summary
  ) VALUES (
    p_my_company_id, p_user_id, p_task_type::ai_task_type, p_model_used,
    p_prompt_tokens, p_completion_tokens, p_prompt_tokens + p_completion_tokens,
    v_cost, p_latency_ms, p_status, p_error_message,
    p_retry_count, p_request_summary, p_response_summary
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
