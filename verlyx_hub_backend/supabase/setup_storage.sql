-- Configuración de Supabase Storage para PDFs generados
-- Ejecutar en Supabase SQL Editor

-- 1. Crear bucket para PDFs generados (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-pdfs',
  'generated-pdfs',
  true,  -- público para descargas
  10485760,  -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir subida de PDFs a usuarios autenticados
CREATE POLICY "Usuarios pueden subir PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-pdfs');

-- 3. Permitir lectura pública de PDFs
CREATE POLICY "PDFs son públicos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generated-pdfs');

-- 4. Permitir eliminar PDFs propios
CREATE POLICY "Usuarios pueden eliminar sus PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generated-pdfs');

-- Verificar bucket creado
SELECT * FROM storage.buckets WHERE id = 'generated-pdfs';
