-- =============================================
-- CREATE PDF TEMPLATES AND GENERATED PDFS TABLES
-- =============================================

-- Create pdf_templates table (sin foreign key a auth.users para desarrollo)
CREATE TABLE IF NOT EXISTS pdf_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    
    -- Template details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL DEFAULT 'contract',
    fields JSONB DEFAULT '[]',
    html_content TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create generated_pdfs table (sin foreign key a auth.users para desarrollo)
CREATE TABLE IF NOT EXISTS generated_pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    template_id UUID REFERENCES pdf_templates(id) ON DELETE SET NULL,
    
    -- PDF details
    template_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    data JSONB DEFAULT '{}',
    html_content TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pdf_templates_user_id ON pdf_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_type ON pdf_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_user_id ON generated_pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_template_id ON generated_pdfs(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_created_at ON generated_pdfs(created_at);

-- Disable RLS for development (enable in production)
ALTER TABLE pdf_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_pdfs DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON pdf_templates TO anon;
GRANT ALL ON pdf_templates TO authenticated;
GRANT ALL ON pdf_templates TO service_role;

GRANT ALL ON generated_pdfs TO anon;
GRANT ALL ON generated_pdfs TO authenticated;
GRANT ALL ON generated_pdfs TO service_role;

-- Optional: Insert default templates
-- INSERT INTO pdf_templates (user_id, name, description, template_type, fields, is_active)
-- VALUES 
--   ('your-user-id', 'Contrato de Servicios', 'Contrato estándar', 'contract', '[]', true);
