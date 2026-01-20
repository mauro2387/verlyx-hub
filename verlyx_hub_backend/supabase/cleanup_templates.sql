-- Limpieza de plantillas PDF de prueba
-- Ejecutar en Supabase SQL Editor

-- Eliminar plantillas vacías de prueba (sin campos o con nombres de prueba)
DELETE FROM pdf_templates 
WHERE 
  -- Plantillas con nombres de prueba
  name IN ('ky', 'kg', 'b', 'hgk', 'pulo', 'test', 'prueba')
  OR
  -- Plantillas sin campos configurados
  (template_data->>'fields' = '[]' OR template_data->'fields' IS NULL);

-- Verificar plantillas restantes
SELECT 
  id,
  name,
  template_type,
  jsonb_array_length(template_data->'fields') as num_fields,
  description,
  created_at
FROM pdf_templates
ORDER BY template_type, name;
