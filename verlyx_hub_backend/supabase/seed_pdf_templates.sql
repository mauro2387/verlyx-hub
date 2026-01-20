-- Seed de plantillas PDF predefinidas
-- Ejecutar en Supabase SQL Editor

-- Plantilla de Factura
INSERT INTO pdf_templates (name, template_type, template_data, description, is_active) VALUES
('Factura Estándar', 'invoice', '{
  "fields": [
    {"name": "invoice_number", "label": "Número de Factura", "type": "text", "required": true},
    {"name": "invoice_date", "label": "Fecha", "type": "date", "required": true},
    {"name": "client_name", "label": "Cliente", "type": "text", "required": true},
    {"name": "client_email", "label": "Email Cliente", "type": "email", "required": false},
    {"name": "client_address", "label": "Dirección Cliente", "type": "textarea", "required": false},
    {"name": "items", "label": "Productos/Servicios", "type": "list", "required": true, "fields": [
      {"name": "description", "label": "Descripción", "type": "text"},
      {"name": "quantity", "label": "Cantidad", "type": "number"},
      {"name": "price", "label": "Precio Unitario", "type": "number"},
      {"name": "total", "label": "Total", "type": "number", "calculated": true}
    ]},
    {"name": "subtotal", "label": "Subtotal", "type": "number", "calculated": true},
    {"name": "tax", "label": "IVA (%)", "type": "number", "required": true, "default": 21},
    {"name": "total", "label": "Total", "type": "number", "calculated": true},
    {"name": "notes", "label": "Notas", "type": "textarea", "required": false}
  ]
}', 'Plantilla de factura estándar con IVA', true);

-- Plantilla de Recibo
INSERT INTO pdf_templates (name, template_type, template_data, description, is_active) VALUES
('Recibo de Pago', 'receipt', '{
  "fields": [
    {"name": "receipt_number", "label": "Número de Recibo", "type": "text", "required": true},
    {"name": "receipt_date", "label": "Fecha", "type": "date", "required": true},
    {"name": "received_from", "label": "Recibí de", "type": "text", "required": true},
    {"name": "amount", "label": "Cantidad", "type": "number", "required": true},
    {"name": "payment_method", "label": "Método de Pago", "type": "select", "required": true, "options": ["Efectivo", "Transferencia", "Tarjeta", "Cheque"]},
    {"name": "concept", "label": "Concepto", "type": "textarea", "required": true},
    {"name": "notes", "label": "Observaciones", "type": "textarea", "required": false}
  ]
}', 'Recibo simple de pago', true);

-- Plantilla de Contrato
INSERT INTO pdf_templates (name, template_type, template_data, description, is_active) VALUES
('Contrato de Servicios', 'contract', '{
  "fields": [
    {"name": "contract_number", "label": "Número de Contrato", "type": "text", "required": true},
    {"name": "contract_date", "label": "Fecha", "type": "date", "required": true},
    {"name": "party_a_name", "label": "Parte A (Prestador)", "type": "text", "required": true},
    {"name": "party_a_id", "label": "DNI/CIF Parte A", "type": "text", "required": true},
    {"name": "party_b_name", "label": "Parte B (Cliente)", "type": "text", "required": true},
    {"name": "party_b_id", "label": "DNI/CIF Parte B", "type": "text", "required": true},
    {"name": "service_description", "label": "Descripción del Servicio", "type": "textarea", "required": true},
    {"name": "duration", "label": "Duración", "type": "text", "required": true},
    {"name": "start_date", "label": "Fecha de Inicio", "type": "date", "required": true},
    {"name": "end_date", "label": "Fecha de Fin", "type": "date", "required": false},
    {"name": "payment_amount", "label": "Importe", "type": "number", "required": true},
    {"name": "payment_terms", "label": "Condiciones de Pago", "type": "textarea", "required": true},
    {"name": "clauses", "label": "Cláusulas Adicionales", "type": "textarea", "required": false}
  ]
}', 'Contrato estándar de prestación de servicios', true);

-- Plantilla de Presupuesto
INSERT INTO pdf_templates (name, template_type, template_data, description, is_active) VALUES
('Presupuesto', 'quote', '{
  "fields": [
    {"name": "quote_number", "label": "Número de Presupuesto", "type": "text", "required": true},
    {"name": "quote_date", "label": "Fecha", "type": "date", "required": true},
    {"name": "valid_until", "label": "Válido hasta", "type": "date", "required": true},
    {"name": "client_name", "label": "Cliente", "type": "text", "required": true},
    {"name": "client_email", "label": "Email Cliente", "type": "email", "required": false},
    {"name": "project_name", "label": "Nombre del Proyecto", "type": "text", "required": true},
    {"name": "items", "label": "Conceptos", "type": "list", "required": true, "fields": [
      {"name": "description", "label": "Descripción", "type": "text"},
      {"name": "quantity", "label": "Cantidad", "type": "number"},
      {"name": "price", "label": "Precio Unitario", "type": "number"},
      {"name": "total", "label": "Total", "type": "number", "calculated": true}
    ]},
    {"name": "subtotal", "label": "Subtotal", "type": "number", "calculated": true},
    {"name": "discount", "label": "Descuento (%)", "type": "number", "required": false, "default": 0},
    {"name": "tax", "label": "IVA (%)", "type": "number", "required": true, "default": 21},
    {"name": "total", "label": "Total", "type": "number", "calculated": true},
    {"name": "notes", "label": "Notas", "type": "textarea", "required": false}
  ]
}', 'Presupuesto detallado con descuentos', true);

-- Plantilla de Informe
INSERT INTO pdf_templates (name, template_type, template_data, description, is_active) VALUES
('Informe General', 'report', '{
  "fields": [
    {"name": "report_title", "label": "Título del Informe", "type": "text", "required": true},
    {"name": "report_date", "label": "Fecha", "type": "date", "required": true},
    {"name": "prepared_by", "label": "Preparado por", "type": "text", "required": true},
    {"name": "executive_summary", "label": "Resumen Ejecutivo", "type": "textarea", "required": true},
    {"name": "sections", "label": "Secciones", "type": "list", "required": true, "fields": [
      {"name": "title", "label": "Título de Sección", "type": "text"},
      {"name": "content", "label": "Contenido", "type": "textarea"}
    ]},
    {"name": "conclusions", "label": "Conclusiones", "type": "textarea", "required": true},
    {"name": "recommendations", "label": "Recomendaciones", "type": "textarea", "required": false}
  ]
}', 'Informe general con secciones personalizables', true);
