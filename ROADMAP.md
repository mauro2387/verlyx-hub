# VERLYX HUB - ROADMAP DE IMPLEMENTACIÓN

## FASE 1: FUNDAMENTOS MULTI-TENANCY Y SEGURIDAD

### 1.1 Multi-tenancy Real con RLS
- [ ] Crear políticas RLS en Supabase para tabla `my_companies`
- [ ] Crear políticas RLS para tabla `companies` (clients)
- [ ] Crear políticas RLS para tabla `projects`
- [ ] Verificar que cada usuario solo vea sus propias empresas
- [ ] Probar aislamiento de datos entre usuarios diferentes

### 1.2 Sistema de Roles y Permisos
- [ ] Crear tabla `company_users` (relación user-company-role)
- [ ] Definir enum de roles: OWNER, ADMIN, MANAGER, OPERATIVE, FINANCE, MARKETING, GUEST
- [ ] Crear tabla `permissions` para permisos granulares
- [ ] Backend: Middleware de verificación de permisos por empresa
- [ ] Flutter: Sistema de guards para rutas según rol
- [ ] UI: Ocultar/mostrar funciones según permisos del usuario

### 1.3 Invitaciones y Equipos
- [ ] Crear tabla `invitations` (email, company_id, role, token, expires_at)
- [ ] Backend: Endpoint para enviar invitaciones
- [ ] Backend: Endpoint para aceptar invitación y unirse a empresa
- [ ] Flutter: Pantalla para gestionar equipo (invitar, ver miembros, cambiar roles)
- [ ] Email: Template de invitación
- [ ] UI: Lista de miembros del equipo por empresa

### 1.4 Auditoría y Logs
- [ ] Crear tabla `audit_logs` (user_id, company_id, entity_type, entity_id, action, changes, ip, user_agent)
- [ ] Backend: Interceptor para registrar todas las operaciones importantes
- [ ] Backend: Endpoint para consultar audit logs
- [ ] Flutter: Pantalla de historial de actividad por empresa
- [ ] Flutter: Vista de cambios por entidad (proyecto, cliente, etc)

---

## FASE 2: CLIENT ORGANIZATIONS Y CRM BASE

### 2.1 Client Organizations (Edificios/Comercios)
- [ ] Crear tabla `client_organizations` (company_id, name, type, address, city, country, notes, custom_fields)
- [ ] Backend: CRUD completo de ClientOrganizations
- [ ] Actualizar tabla `companies` (clients) para agregar `client_organization_id`
- [ ] Flutter: Módulo de Organizations con CRUD
- [ ] Flutter: Al crear cliente, permitir asociarlo a una organización
- [ ] UI: Vista jerárquica (Organización → Contactos)

### 2.2 Sistema de Deals (Pipeline CRM)
- [ ] Crear tabla `deals` (company_id, client_id, client_organization_id, title, stage, value, probability, source, assigned_to)
- [ ] Definir stages: lead, contacted, proposal, negotiation, closed_won, closed_lost
- [ ] Backend: CRUD de deals con filtros y búsqueda
- [ ] Flutter: Modelo y repositorio de Deals
- [ ] Flutter: Vista Kanban de pipeline (columnas por stage)
- [ ] Flutter: Drag & drop para mover deals entre stages
- [ ] Flutter: Formulario crear/editar deal
- [ ] Flutter: Vista detalle de deal con toda la info

### 2.3 Vinculaciones CRM-Proyectos
- [ ] Actualizar tabla `projects` para agregar `deal_id`
- [ ] Backend: Al cerrar deal ganado, opción de crear proyecto automáticamente
- [ ] Flutter: Desde deal, botón "Crear Proyecto"
- [ ] Flutter: En proyecto, mostrar deal vinculado si existe

---

## FASE 3: TAREAS Y PRODUCTIVIDAD

### 3.1 Sistema de Tareas
- [ ] Crear tabla `tasks` (company_id, project_id, deal_id, client_id, title, description, status, priority, due_date, assigned_to)
- [ ] Backend: CRUD completo de tasks con filtros
- [ ] Backend: Endpoint para cambiar estado de tarea
- [ ] Flutter: Modelo y repositorio de Tasks
- [ ] Flutter: Vista "Mis Tareas" (filtradas por usuario actual)
- [ ] Flutter: Vista de tareas por proyecto
- [ ] Flutter: Vista de tareas por cliente/deal
- [ ] Flutter: Crear tarea desde múltiples contextos

### 3.2 Subtareas y Dependencias
- [ ] Agregar columna `parent_task_id` a tabla tasks
- [ ] Backend: Lógica de subtareas (no marcar padre como done hasta que hijos estén done)
- [ ] Flutter: UI de subtareas con indentación
- [ ] Flutter: Crear subtarea desde tarea padre

### 3.3 Comentarios en Tareas
- [ ] Crear tabla `task_comments` (task_id, user_id, content, created_at)
- [ ] Backend: CRUD de comentarios
- [ ] Flutter: Lista de comentarios en detalle de tarea
- [ ] Flutter: Agregar comentario con @ mentions

---

## FASE 4: DOCUMENTOS INTELIGENTES

### 4.1 Sistema Base de Documentos
- [ ] Crear tabla `documents` (company_id, project_id, client_id, client_organization_id, deal_id, type, title, file_path, tags, version)
- [ ] Configurar Supabase Storage para archivos
- [ ] Backend: Upload de documentos con generación de URLs firmadas
- [ ] Backend: CRUD de metadatos de documentos
- [ ] Flutter: Módulo de Documents con lista
- [ ] Flutter: Upload de archivos (PDF, imágenes, DOCX)
- [ ] Flutter: Viewer de documentos (previsualización)

### 4.2 Organización y Búsqueda
- [ ] Crear tabla `document_folders` para estructura de carpetas
- [ ] Backend: Sistema de tags para documentos
- [ ] Flutter: Vista de árbol de carpetas
- [ ] Flutter: Mover documentos entre carpetas
- [ ] Flutter: Búsqueda por nombre, tags, tipo

### 4.3 Versionado de Documentos
- [ ] Agregar columna `previous_version_id` a documents
- [ ] Backend: Al subir documento con mismo nombre, crear nueva versión
- [ ] Flutter: Ver historial de versiones
- [ ] Flutter: Descargar versión específica
- [ ] Flutter: Comparar versiones (mostrar metadatos)

### 4.4 Documentos con IA
- [ ] Backend: Endpoint para generar resumen de documento con IA
- [ ] Backend: Extraer texto de PDFs/imágenes (OCR)
- [ ] Backend: Búsqueda semántica en documentos (embeddings)
- [ ] Flutter: Botón "Resumir con IA"
- [ ] Flutter: Botón "Extraer datos" (parsear facturas, contratos)

---

## FASE 5: WORKSPACE ESTILO NOTION

### 5.1 Páginas y Estructura
- [ ] Crear tabla `workspace_pages` (company_id, title, parent_page_id, is_template, icon, cover_image)
- [ ] Crear tabla `workspace_blocks` (page_id, order_index, type, content)
- [ ] Backend: CRUD de páginas con jerarquía
- [ ] Backend: CRUD de bloques con ordenamiento
- [ ] Flutter: Vista de árbol de páginas (sidebar)
- [ ] Flutter: Editor de página (lista de bloques)

### 5.2 Tipos de Bloques
- [ ] Implementar bloque: Text (párrafo simple)
- [ ] Implementar bloque: Heading (h1, h2, h3)
- [ ] Implementar bloque: Checklist
- [ ] Implementar bloque: Bulleted List
- [ ] Implementar bloque: Numbered List
- [ ] Implementar bloque: Table
- [ ] Implementar bloque: Image
- [ ] Implementar bloque: Embed (URL)

### 5.3 Bloques de Relación
- [ ] Implementar bloque: Tabla de Clientes (query filtrable)
- [ ] Implementar bloque: Tabla de Proyectos
- [ ] Implementar bloque: Tabla de Tareas
- [ ] Implementar bloque: Tabla de Deals
- [ ] Flutter: Hacer clic en item de tabla → ir a detalle

### 5.4 Plantillas y IA
- [ ] Sistema de plantillas predefinidas (Brief, Reunión, Estrategia)
- [ ] Backend: Endpoint para generar contenido con IA
- [ ] Flutter: Botón "Escribir con IA" en editor
- [ ] Flutter: Comando "/ai" para invocar IA en contexto

---

## FASE 6: FINANZAS Y FACTURACIÓN

### 6.1 Sistema de Facturas
- [ ] Crear tabla `invoices` (company_id, client_id, client_organization_id, project_id, amount_total, currency, issue_date, due_date, status)
- [ ] Crear tabla `invoice_items` (invoice_id, description, quantity, unit_price, total)
- [ ] Backend: CRUD de facturas
- [ ] Backend: Calcular totales automáticamente
- [ ] Flutter: Formulario crear factura
- [ ] Flutter: Agregar items dinámicamente

### 6.2 Generación de PDFs
- [ ] Backend: Template de factura en HTML
- [ ] Backend: Convertir HTML a PDF (librería)
- [ ] Backend: Guardar PDF en Supabase Storage
- [ ] Flutter: Previsualizar factura antes de generar
- [ ] Flutter: Descargar/compartir PDF generado

### 6.3 Control de Pagos
- [ ] Crear tabla `payments` (company_id, invoice_id, amount, status, method, external_payment_id)
- [ ] Backend: Registrar pagos manualmente
- [ ] Backend: Marcar factura como pagada/vencida
- [ ] Flutter: Vista de pagos pendientes
- [ ] Flutter: Registrar pago recibido

### 6.4 Reportes Financieros
- [ ] Backend: Endpoint para estadísticas financieras por empresa
- [ ] Backend: Ingresos por mes/cliente/proyecto
- [ ] Flutter: Dashboard financiero con gráficos
- [ ] Flutter: Exportar reporte a Excel/PDF

---

## FASE 7: PAGOS Y SUSCRIPCIONES

### 7.1 Integración MercadoPago
- [ ] Backend: Configurar credenciales de MercadoPago
- [ ] Backend: Endpoint para crear link de pago
- [ ] Backend: Webhook para recibir notificaciones de pago
- [ ] Backend: Actualizar estado de payment al recibir webhook
- [ ] Flutter: Botón "Generar link de pago" en factura
- [ ] Flutter: Copiar link y compartir por WhatsApp/Email

### 7.2 Suscripciones Recurrentes
- [ ] Crear tabla `subscriptions` (company_id, client_id, plan_name, amount, billing_interval, next_billing_date, status)
- [ ] Backend: Crear preapproval en MercadoPago
- [ ] Backend: Webhook para cobros automáticos
- [ ] Backend: Cancelar suscripción
- [ ] Flutter: CRUD de suscripciones
- [ ] Flutter: Vista de ingresos recurrentes proyectados

### 7.3 Reconciliación Automática
- [ ] Backend: Al recibir pago, buscar factura pendiente automáticamente
- [ ] Backend: Sugerir asignación si no hay match exacto
- [ ] Flutter: Vista de pagos sin asignar
- [ ] Flutter: Asignar manualmente pago a factura

---

## FASE 8: AUTOMATIZACIONES Y WORKFLOWS

### 8.1 Sistema Base de Automatizaciones
- [ ] Crear tabla `automations` (company_id, name, is_active, trigger_type, conditions, actions)
- [ ] Crear tabla `automation_executions` (automation_id, trigger_data, status, error_message, executed_at)
- [ ] Backend: Motor de ejecución de workflows
- [ ] Backend: Sistema de evaluación de condiciones (JSON rules)

### 8.2 Triggers
- [ ] Implementar trigger: new_client
- [ ] Implementar trigger: deal_created
- [ ] Implementar trigger: deal_stage_changed
- [ ] Implementar trigger: project_created
- [ ] Implementar trigger: task_overdue
- [ ] Implementar trigger: document_uploaded
- [ ] Implementar trigger: payment_success
- [ ] Implementar trigger: payment_failed
- [ ] Implementar trigger: time_based (cron)

### 8.3 Acciones
- [ ] Implementar acción: create_task
- [ ] Implementar acción: send_email
- [ ] Implementar acción: send_notification
- [ ] Implementar acción: change_deal_stage
- [ ] Implementar acción: generate_document
- [ ] Implementar acción: call_ai (generar texto)
- [ ] Implementar acción: webhook (llamar URL externa)

### 8.4 UI de Automatizaciones
- [ ] Flutter: Lista de automatizaciones
- [ ] Flutter: Editor visual de workflow (formulario simple)
- [ ] Flutter: Activar/desactivar automatización
- [ ] Flutter: Ver historial de ejecuciones
- [ ] Flutter: Logs de errores

---

## FASE 9: IA ACCIONABLE Y CONTEXTUAL

### 9.1 Sistema de Contexto IA
- [ ] Crear tabla `ai_conversations` (company_id, user_id, context_type, context_id, title)
- [ ] Crear tabla `ai_messages` (conversation_id, role, content, created_at)
- [ ] Backend: Endpoint de chat con contexto de empresa
- [ ] Backend: Inyectar datos relevantes según contexto (cliente, proyecto, deal)
- [ ] Backend: Sistema de embeddings para memoria a largo plazo

### 9.2 IA por Contexto
- [ ] Flutter: Chat IA en detalle de Cliente (con datos del cliente)
- [ ] Flutter: Chat IA en detalle de Proyecto (con datos del proyecto)
- [ ] Flutter: Chat IA en detalle de Deal (con datos del deal)
- [ ] Flutter: Chat IA global (sin contexto específico)

### 9.3 Acciones IA
- [ ] Backend: IA puede crear tareas (parse de respuesta)
- [ ] Backend: IA puede crear proyectos
- [ ] Backend: IA puede actualizar campos de CRM
- [ ] Backend: IA puede generar documentos
- [ ] Backend: IA puede proponer automatizaciones
- [ ] Flutter: Confirmación antes de ejecutar acciones IA

### 9.4 Análisis IA
- [ ] Backend: Análisis de sentimiento en conversaciones de cliente
- [ ] Backend: Predicción de probabilidad de cierre de deal
- [ ] Backend: Sugerencias de próxima acción en deal
- [ ] Backend: Detección de proyectos en riesgo
- [ ] Flutter: Mostrar insights de IA en dashboards

---

## FASE 10: NOTIFICACIONES Y COMUNICACIÓN

### 10.1 Sistema de Notificaciones Internas
- [ ] Crear tabla `notifications` (user_id, company_id, type, title, message, entity_type, entity_id, is_read)
- [ ] Backend: Servicio para crear notificaciones
- [ ] Backend: Endpoint para marcar como leída
- [ ] Backend: Endpoint para listar notificaciones del usuario
- [ ] Flutter: Badge con contador en AppBar
- [ ] Flutter: Panel de notificaciones
- [ ] Flutter: Navegar a entidad al hacer clic

### 10.2 Push Notifications (Móvil)
- [ ] Configurar Firebase Cloud Messaging
- [ ] Backend: Guardar FCM tokens de usuarios
- [ ] Backend: Enviar push al crear notificación importante
- [ ] Flutter: Solicitar permisos de notificaciones
- [ ] Flutter: Manejar notificación en foreground/background
- [ ] Flutter: Deep linking desde notificación

### 10.3 Emails Transaccionales
- [ ] Configurar servicio de email (SendGrid/Resend)
- [ ] Backend: Templates HTML de emails
- [ ] Backend: Enviar email al invitar usuario
- [ ] Backend: Enviar email al asignar tarea
- [ ] Backend: Enviar email al vencer factura
- [ ] Backend: Resumen diario de actividad

### 10.4 Notificaciones Desktop
- [ ] Flutter Desktop: Sistema de notificaciones nativas
- [ ] Flutter Desktop: Mostrar toast en esquina
- [ ] Flutter Desktop: Sonido de notificación (opcional)

---

## FASE 11: BÚSQUEDA GLOBAL Y NAVEGACIÓN

### 11.1 Búsqueda Unificada
- [ ] Backend: Endpoint de búsqueda global con paginación
- [ ] Backend: Buscar en: clients, organizations, deals, projects, tasks, documents, pages
- [ ] Backend: Ranking por relevancia
- [ ] Flutter: Barra de búsqueda global (Ctrl+K en desktop)
- [ ] Flutter: Resultados agrupados por tipo
- [ ] Flutter: Navegar a resultado al hacer clic

### 11.2 Búsqueda Semántica (IA)
- [ ] Backend: Generar embeddings de entidades principales
- [ ] Backend: Almacenar embeddings en tabla dedicada o vector DB
- [ ] Backend: Búsqueda por similitud semántica
- [ ] Flutter: Toggle entre búsqueda exacta y semántica

### 11.3 Filtros Avanzados
- [ ] Flutter: Filtros por empresa
- [ ] Flutter: Filtros por fecha (rango)
- [ ] Flutter: Filtros por estado/etapa
- [ ] Flutter: Filtros por usuario asignado
- [ ] Flutter: Guardar filtros favoritos

---

## FASE 12: DASHBOARDS PERSONALIZABLES

### 12.1 Dashboard por Empresa
- [ ] Backend: Endpoint para KPIs por empresa
- [ ] Backend: Leads nuevos, deals ganados, ingresos del mes
- [ ] Backend: Tareas atrasadas, proyectos en riesgo
- [ ] Flutter: Dashboard inicial al entrar a empresa
- [ ] Flutter: Widgets de resumen numérico

### 12.2 Gráficos y Visualizaciones
- [ ] Flutter: Gráfico de ingresos por mes (línea)
- [ ] Flutter: Gráfico de deals por etapa (barras)
- [ ] Flutter: Gráfico de proyectos por estado (pie)
- [ ] Flutter: Gráfico de tareas por prioridad
- [ ] Usar librería de charts (fl_chart o syncfusion_flutter_charts)

### 12.3 Widgets Personalizables
- [ ] Backend: Guardar configuración de dashboard por usuario
- [ ] Flutter: Drag & drop para reordenar widgets
- [ ] Flutter: Mostrar/ocultar widgets
- [ ] Flutter: Configurar tamaño de widgets

### 12.4 Insights IA en Dashboard
- [ ] Backend: Generar insights diarios con IA
- [ ] Backend: Alertas de anomalías (bajón de ventas, proyectos atrasados)
- [ ] Flutter: Widget de "Insights del día"
- [ ] Flutter: Sugerencias accionables

---

## FASE 13: IMPORT/EXPORT Y MIGRACIONES

### 13.1 Import de Datos
- [ ] Backend: Parser de CSV para clientes
- [ ] Backend: Parser de CSV para proyectos
- [ ] Backend: Parser de Excel para deals
- [ ] Backend: Validación y preview antes de importar
- [ ] Flutter: Pantalla de import con mapeo de columnas
- [ ] Flutter: Mostrar errores de validación

### 13.2 Export de Datos
- [ ] Backend: Exportar clientes a CSV
- [ ] Backend: Exportar proyectos a Excel
- [ ] Backend: Exportar facturas a PDF (por lote)
- [ ] Backend: Exportar reportes completos
- [ ] Flutter: Botones de export en cada módulo
- [ ] Flutter: Descargar archivo generado

### 13.3 Backup y Restauración
- [ ] Backend: Script de backup completo de empresa
- [ ] Backend: Restaurar desde backup
- [ ] Backend: Exportar toda la empresa (JSON)
- [ ] Flutter: Opción de backup en configuración
- [ ] Backups automáticos programados

---

## FASE 14: UI DESKTOP AVANZADA

### 14.1 Layout Multi-Columna
- [ ] Flutter: Sidebar fijo en desktop
- [ ] Flutter: Área de contenido principal más ancha
- [ ] Flutter: Panel lateral opcional (detalle rápido)
- [ ] Flutter: Usar LayoutBuilder para adaptación

### 14.2 Tablas Avanzadas
- [ ] Flutter: DataTable con columnas sortables
- [ ] Flutter: Paginación de tablas
- [ ] Flutter: Selección múltiple con checkboxes
- [ ] Flutter: Acciones por lote (ej: borrar varios)
- [ ] Flutter: Filtros en columnas

### 14.3 Atajos de Teclado
- [ ] Flutter: Ctrl+K para búsqueda
- [ ] Flutter: Ctrl+N para nuevo (según contexto)
- [ ] Flutter: Esc para cerrar modales
- [ ] Flutter: Tab para navegación entre campos
- [ ] Flutter: Mostrar atajos disponibles (?)

### 14.4 Ventanas Modales vs Pantallas
- [ ] Flutter: Abrir detalle de cliente en modal (desktop)
- [ ] Flutter: Abrir formularios en modal (desktop)
- [ ] Flutter: En móvil, usar pantalla completa
- [ ] Flutter: Drag para redimensionar modales

---

## FASE 15: INTEGRACIONES EXTERNAS

### 15.1 WhatsApp Business API
- [ ] Backend: Integrar con API de WhatsApp Business
- [ ] Backend: Enviar mensaje desde la app
- [ ] Backend: Recibir mensajes (webhook)
- [ ] Flutter: Chat con cliente por WhatsApp
- [ ] Flutter: Guardar conversaciones como notas

### 15.2 Email (SMTP/IMAP)
- [ ] Backend: Conectar cuenta de email
- [ ] Backend: Enviar emails desde la app
- [ ] Backend: Sincronizar emails recibidos
- [ ] Flutter: Cliente de email integrado
- [ ] Flutter: Vincular emails a clientes/deals

### 15.3 Calendario (Google/Outlook)
- [ ] Backend: OAuth con Google Calendar
- [ ] Backend: OAuth con Microsoft Outlook
- [ ] Backend: Crear eventos desde tareas
- [ ] Backend: Sincronizar eventos bidireccional
- [ ] Flutter: Vista de calendario integrada

### 15.4 Almacenamiento en la Nube
- [ ] Backend: Integrar con Google Drive
- [ ] Backend: Integrar con Dropbox
- [ ] Backend: Importar documentos desde nube
- [ ] Backend: Exportar documentos a nube
- [ ] Flutter: Selector de origen al subir archivo

### 15.5 Otras Integraciones
- [ ] Backend: Slack (notificaciones)
- [ ] Backend: Zapier (webhook genérico)
- [ ] Backend: API REST pública para terceros
- [ ] Backend: Documentación de API (Swagger)
- [ ] Flutter: Marketplace de integraciones

---

## RESUMEN DE PRIORIDADES

### 🔴 CRÍTICO (Hacer primero)
1. Multi-tenancy real (RLS)
2. Roles y permisos
3. Tareas vinculadas a proyectos

### 🟠 IMPORTANTE (Hacer pronto)
4. Client Organizations
5. Sistema de Deals (CRM)
6. Documentos básicos
7. Auditoría

### 🟡 DESEABLE (Hacer después)
8. Workspace/Notion
9. Facturación
10. Automatizaciones
11. IA accionable

### 🟢 AVANZADO (Último)
12. Pagos/Suscripciones
13. Dashboard personalizable
14. UI Desktop avanzada
15. Integraciones externas

---

## MÉTRICAS DE ÉXITO

Al completar todas las fases, el sistema debe:
- ✅ Permitir gestionar múltiples empresas con datos aislados
- ✅ Tener CRM completo con pipeline visual
- ✅ Gestionar proyectos con tareas y documentos
- ✅ Generar facturas y controlar pagos
- ✅ Ejecutar automatizaciones
- ✅ IA que lee, entiende y actúa en el sistema
- ✅ UI adaptada a móvil Y escritorio
- ✅ Integraciones con herramientas externas
