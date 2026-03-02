V E R L Y X   H U B
SISTEMA OPERATIVO EMPRESARIAL DE CLASE MUNDIAL
La envidia de cualquier empresa del mundo
────────────────────────────────────────
ESPECIFICACION TECNICA COMPLETA
Diagnostico Total  |  Correcciones Criticas  |  Arquitectura Multi-empresa
30+ Modulos Enterprise  |  IA Operativa Real  |  Portal del Cliente
Cobros Automatizados  |  Consolidacion Holding  |  Roadmap 20 Semanas
VERSION 3.0  —  USO INTERNO Y CONFIDENCIAL
Maldonado, Uruguay — 2026


SECCION 1 — VISION Y RESUMEN EJECUTIVO

1. Vision Estrategica del Producto

Verlyx Hub es hoy un sistema de gestion empresarial con cimientos solidos pero con una vision que supera lo que actualmente tiene construido. La base tecnica es correcta: Next.js 16 con App Router, React 19, Supabase con Row Level Security, Zustand para estado global, arquitectura de stores bien separados, soporte de PDF con jsPDF, y un modelo de datos rico en tipos TypeScript. Sin embargo, en su estado actual el sistema opera como una herramienta personal con multiples empresas, cuando la ambicion real exige que funcione como el sistema nervioso central de un grupo corporativo en expansion.

Este documento es la especificacion tecnica mas completa que puede existir para transformar Verlyx Hub. No es una lista de deseos. Es un blueprint ejecutable, modulo por modulo, que cuando este implementado producira un software que ninguna empresa latinoamericana de servicios y tecnologia tendra igual: un sistema que unifica CRM, operaciones, finanzas, recursos humanos, inteligencia artificial, cobros, contratos, portal del cliente, y consolidacion corporativa en una sola herramienta coherente, rapida, y automatizada.

La Promesa del Producto
Verlyx Hub debe ser la unica pantalla que el CEO de un grupo empresarial necesita abrir para saber: cuanto dinero tiene el grupo hoy, que oportunidades existen, que riesgos hay, que necesita atencion inmediata, y que puede delegar. No un CRM. No una app de tareas. El sistema operativo del negocio.

1.1 El Gap: Lo que es hoy vs. lo que debe ser

ESTADO ACTUAL
•CRM con proyectos y tareas basicos
•Finanzas por empresa sin consolidacion
•Pipeline sin automatizacion de extremo a extremo
•AI con respuestas hardcodeadas — completamente inutil
•Automatizaciones sin motor de ejecucion real
•Status duplicados que rompen filtros silenciosamente
•Sin roles granulares ni permisos por modulo
•Sin realtime — datos estaticos para el equipo
•PulsarMoon y Verlyx Ecosystem con datos demo
•Portal del cliente: inexistente
•Conciliacion bancaria: inexistente
•Facturacion automatica: inexistente
•Consolidacion del grupo: imposible
•Sin audit trail ni trazabilidad de cambios	VISION TARGET
•Sistema operativo del holding corporativo completo
•Consolidacion financiera multi-empresa en tiempo real
•Pipeline automatizado: lead -> cobro sin friccion
•IA con acceso total a datos reales y capacidad de ejecutar acciones
•Motor de automatizaciones que ejecuta en ms via Edge Functions
•Status unificados, filtros 100% confiables
•Roles granulares por empresa, modulo y umbral de valor
•Realtime en colaboracion — equipo sincronizado
•Modulos reales conectados a Supabase para cada negocio
•Portal del cliente con cobro integrado
•Conciliacion bancaria con AI matching
•Facturacion electronica con DGI Uruguay
•P&L consolidado del grupo con eliminacion intercompany
•Audit log inmutable de cada operacion



SECCION 2 — DIAGNOSTICO QUIRURGICO DEL ESTADO ACTUAL

2. Diagnostico del Estado Actual

El siguiente diagnostico es el resultado de analizar en profundidad cada archivo del repositorio: types.ts, store.ts, supabase.ts, todos los page.tsx de cada modulo, las Edge Functions, los schemas SQL, y la estructura de la base de datos. Cada problema esta categorizado por severidad y viene con solucion propuesta.

2.1 Bugs Criticos que Corrompen Datos en Produccion

ALERTA CRITICA
Los siguientes problemas causan que el sistema falle silenciosamente, mostrando datos incorrectos o perdiendo informacion sin que el usuario lo sepa. Deben corregirse antes de cualquier feature nuevo.

2.1.1 Duplicacion Catastrofica de Enums en types.ts
El archivo types.ts define TaskStatus con 11 valores para representar 6 estados reales. Tiene tanto 'TODO' (del modelo Flutter heredado) como 'pending' (que usa Supabase), tanto 'DONE' como 'completed'. Esto hace que comparaciones como task.status === 'done' fallen cuando el valor real es 'DONE'. El Kanban filtra mal. Las alertas de tareas vencidas no aparecen. El dashboard cuenta mal.

Valores duplicados identificados en types.ts
TaskStatus: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'DONE' | 'CANCELLED' | 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'
DealStage: 'CLOSED_WON' | 'CLOSED_LOST' | 'won' | 'lost'  —  el mismo estado con dos nombres distintos
Priority: 'CRITICAL' | 'critical'  —  identico pero causa renders incorrectos en badges de prioridad
Solucion: Unificar a lowercase snake_case en todo el sistema, migration SQL para datos existentes

2.1.2 La 'IA' que Devuelve Mentiras
La pagina /ai es la feature mas estrategicamente importante del sistema y actualmente es un dano activo. El codigo (confirmado en ai/page.tsx) selecciona aleatoriamente una respuesta de un array de 6 strings hardcodeados completamente desconectados de la realidad. El asistente puede decirte 'tienes 4 oportunidades activas por $220,000 USD' cuando en realidad tienes 0 deals o tienes 47. Si un usuario toma decisiones de negocio basado en esta pantalla, tomara decisiones incorrectas.

•NO hay ninguna llamada a Claude API ni a ningun modelo de AI
•Las respuestas son strings estaticos en un array de JavaScript
•No hay acceso a ningun dato de Supabase en esta pagina
•El riesgo es alto: usuario puede interpretar los datos falsos como reales
•Solucion: Implementar Claude API con claude-sonnet-4-6, tool use, y contexto dinamico de Supabase

2.1.3 Automatizaciones que No Ejecutan — Promesa Rota
El modulo de automatizaciones tiene una UI completa y funcional para crear workflows. El problema es que absolutamente nada los ejecuta. Supabase no tiene ninguna Edge Function configurada para procesar triggers. No existe ningun cron job. No hay ningun Database Webhook activo. El usuario puede crear 'Cuando se gana un deal, crear tarea de onboarding', guardarlo exitosamente, ganar un deal, y esperar para siempre.

•La tabla automations existe y guarda datos correctamente
•Nadie lee esa tabla para ejecutar nada en ningun momento
•automation_executions: tabla vacia, nunca se uso
•El 100% de las automatizaciones creadas son decorativas
•Solucion: Supabase Edge Functions como motor + Database Webhooks como triggers

2.1.4 Deal Cerrado = Dinero Fantasma
Cuando un deal pasa a CLOSED_WON o 'won', el modulo financiero no sabe. El CRM y las finanzas son dos islas sin puente. El usuario tiene que abrir /incomes manualmente, crear el registro, buscar al cliente, ingresar el monto que ya existe en el deal, y recordar hacerlo. En una empresa con 10 deals activos esto genera inconsistencias entre el pipeline del CRM y los registros financieros, haciendo que los reportes sean poco confiables.

2.1.5 Sin Realtime — Equipo Trabajando Sobre Datos Viejos
Supabase tiene Realtime incluido en todos sus planes y el sistema no lo usa en ninguna parte. Si dos personas del equipo trabajan simultaneamente en el Kanban, uno puede mover una tarea y el otro seguira viendo la posicion anterior hasta que recargue manualmente. En deals, esto puede causar que dos personas trabajen el mismo lead creyendo que el otro no lo ha contactado.

2.2 Problemas Arquitecturales que Limitan el Crecimiento

2.2.1 Modelo de Usuario Unico — Imposible Escalar
El schema de Supabase tiene user_id en practicamente todas las tablas. Todo pertenece a una sola persona. Aunque hay una tabla profiles con roles 'owner | admin | staff | readonly', estos roles se aplican globalmente a todo el sistema. No es posible tener a alguien que sea admin de PulsarMoon pero readonly en Zora, o que solo pueda ver el modulo financiero de una empresa especifica.

•Sin company_memberships: no se puede asignar roles por empresa
•Sin permission_rules: no existe control granular por modulo
•Sin approval_workflows: no hay forma de requerir aprobaciones
•Consecuencia: no se puede contratar equipo que use el sistema con confianza

2.2.2 Empresas Como Islas Financieras — Sin Vision de Grupo
Cada empresa del grupo tiene sus ingresos, gastos, cuentas, y presupuestos completamente aislados. El CEO no puede responder 'cuanto gano el grupo este mes' sin abrir cada empresa por separado y sumar manualmente en una hoja de calculo. No existe consolidacion, no existe eliminacion de transacciones intercompany, no existe vision de holding. Con 3 empresas es manejable. Con 5 es un infierno. Con 10 es imposible.

2.2.3 PulsarMoon y Verlyx Ecosystem con Datos Demo Hardcodeados
Los modulos especializados de PulsarMoon (agencia web) y Verlyx Ecosystem (propiedades y comercios) tienen una UI excelente pero usan arrays de demoProjects y demoBuildings hardcodeados en el codigo. No hay ninguna conexion a Supabase. Cualquier dato que el usuario ingrese en estas pantallas se pierde al recargar. Son modulos completamente inutilizables para trabajo real.

2.2.4 Pipeline Transaccional Desconectado
El ciclo de vida real de un negocio es: Lead -> Calificar -> Cotizar -> Negociar -> Ganar -> Firmar contrato -> Crear proyecto -> Ejecutar -> Facturar -> Cobrar -> Conciliar. En el sistema actual, cada uno de esos pasos existe como un modulo separado pero son completamente manuales e independientes. No hay ningun evento que, al actualizarse un estado, genere consecuencias automaticas en el siguiente paso.

2.2.5 PDF Generator con Campos Manuales — Sin Datos Reales
El generador de PDFs tiene 5 templates de calidad profesional (contrato, factura, cotizacion, recibo, reporte). El problema es que todos los campos se llenan a mano. No puede precargar datos desde un deal, cliente, o cotizacion existentes. El usuario tiene que copiar y pegar informacion que ya existe en el sistema, con alto riesgo de errores y desincronizacion.

2.3 Inventario de Features Incompletas

Modulo	Estado Actual	Problema Concreto	Impacto	Urgencia
AI Asistente	Simulado	Respuestas hardcodeadas, 0% util	Critico	CRITICA
Automatizaciones	UI lista, motor ausente	Ninguna se ejecuta jamas	Critico	CRITICA
PulsarMoon	Demo data	No conecta a Supabase real	Critico	CRITICA
Verlyx Ecosystem	Demo data	Buildings y Merchants demo	Critico	CRITICA
Consolidacion Grupo	No existe	Sin vision de holding	Critico	CRITICA
Portal del Cliente	No existe	Sin acceso externo al proyecto	Alto	ALTA
Facturacion Auto	No existe	Deal ganado no genera factura	Alto	ALTA
Conciliacion Bancaria	No existe	Manual y propenso a errores	Alto	ALTA
Realtime	No existe	Equipo trabaja sobre datos viejos	Alto	ALTA
Quotes -> Proyecto	Desconectado	Cotizacion aceptada sin efecto	Alto	ALTA
Time Tracking -> Rentabilidad	Parcial	Horas no calculan margen	Alto	ALTA
Goals Auto-Update	Roto	currentValue no actualiza solo	Medio	MEDIA
Calendar Sync	Parcial	No sincroniza deals ni facturas	Medio	MEDIA
Documents Preview	Basico	Sin preview ni versionado	Medio	MEDIA
Permisos Granulares	Inexistente	4 roles globales insuficientes	Alto	ALTA
Approval Workflows	Inexistente	Cualquiera puede hacer cualquier cosa	Alto	ALTA
Audit Trail	Inexistente	Sin trazabilidad de cambios	Medio	MEDIA
Multi-Moneda	Basico	Sin conversion automatica	Medio	MEDIA
Push Notifications	No existe	Solo in-app, sin email ni push	Medio	MEDIA



SECCION 3 — CORRECCIONES CRITICAS: IMPLEMENTAR PRIMERO

3. Correcciones Criticas — Sprint 1

Estas correcciones no son opcionales. Son la diferencia entre un sistema confiable y uno que miente. Se implementan antes de cualquier feature nuevo, sin excepcion.

3.1 Unificacion de Status: Convenciones Definitivas

Proceso de migracion en 4 pasos, ejecutar en orden estricto:

1.Definir los valores canonicos en lowercase snake_case para todos los enums
2.Crear migration SQL que actualice todos los registros existentes en Supabase
3.Actualizar types.ts eliminando todos los duplicados, un solo valor por estado
4.Actualizar stores, componentes UI, filtros, badges, y sidebar

Enum	Valor Canonico Definitivo	Eliminar
TaskStatus	todo | in_progress | review | blocked | done | cancelled	TODO, IN_PROGRESS, DONE, CANCELLED, pending, completed
DealStage	lead | qualified | proposal | negotiation | won | lost	LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST
Priority	low | medium | high | critical	LOW, MEDIUM, HIGH, CRITICAL (mayusculas)
ProjectStatus	backlog | planning | active | on_hold | review | done | cancelled	in_progress, completed (alias)
IncomeStatus	pending | received | cancelled | overdue	Mantener, ya esta bien
ExpenseStatus	paid | pending | cancelled	Mantener, ya esta bien

3.2 Conectar AI con Claude API y Datos Reales

La implementacion correcta del asistente de AI es el cambio de mayor impacto inmediato para el valor del sistema. El asistente debe poder responder cualquier pregunta sobre el negocio y ejecutar acciones.

Arquitectura del Asistente
•Crear /api/ai/chat como Route Handler de Next.js
•El handler recibe { message, conversationHistory } del cliente
•Consulta Supabase para construir el contexto: deals activos, tareas pendientes, ingresos del mes, balances, proyectos
•Construye un system prompt dinamico: 'Eres el asistente operativo de [empresa]. HOY: $X en cuentas, Y deals activos por $Z, W tareas pendientes...'
•Llama a Claude API con model: 'claude-sonnet-4-6', tools habilitados, y el historial de conversacion
•Los tools permiten ejecutar: create_task, mark_income_received, move_deal, create_event, generate_report
•Response hace streaming para UX fluida en el chat

Tools que el AI puede ejecutar
Tool	Descripcion	Parametros Clave
get_financial_summary	Obtiene P&L del mes actual y balances	company_id, month, year
get_pending_items	Lista facturas vencidas, tareas urgentes, follow-ups	company_id, urgency_filter
create_task	Crea tarea con todos los atributos	title, project_id, assignee, due_date, priority
move_deal_stage	Mueve deal a una etapa del pipeline	deal_id, new_stage, reason
mark_income_received	Marca ingreso como cobrado	income_id, received_date, account_id
create_contact_activity	Registra interaccion con un contacto	contact_id, type, subject, notes
generate_invoice	Genera factura desde deal o cotizacion	source_id, source_type, due_date
send_payment_reminder	Envia recordatorio de cobro al cliente	income_id, message_override
create_calendar_event	Crea evento con link de reunion	title, date, type, attendees
get_project_status	Obtiene estado detallado de un proyecto	project_id
update_project_progress	Actualiza % de avance	project_id, percentage, notes
generate_report	Genera reporte financiero en PDF	report_type, period, company_ids

3.3 Motor de Automatizaciones con Edge Functions

El motor de automatizaciones transforma el sistema de reactivo a proactivo. Se implementa como Supabase Edge Function que escucha cambios en la base de datos via Database Webhooks.

Arquitectura del Motor
5.Crear Edge Function 'automation-engine' en Supabase (Deno/TypeScript)
6.Configurar Database Webhooks en Supabase para las tablas: deals, tasks, incomes, projects, contacts
7.Cuando ocurre INSERT o UPDATE, el webhook llama al automation-engine
8.La Edge Function consulta la tabla automations buscando reglas con el trigger_type que coincide
9.Para cada automatizacion activa que matchea, ejecuta los steps en orden con delay si esta configurado
10.Cada ejecucion se registra en automation_executions con status, timestamps, y errores
11.Implementar retry con backoff exponencial (1s, 2s, 4s, 8s) para steps que fallan

Triggers Disponibles
•deal_created, deal_stage_changed: deal_won, deal_lost
•contact_created, contact_updated, contact_tag_added
•project_created, project_status_changed, project_completed, project_overdue
•task_created, task_completed, task_overdue, task_blocked
•income_received, income_overdue, expense_created
•scheduled: cron expression configurable (diario, semanal, mensual)
•recurring: basado en frecuencia configurada por el usuario

Acciones Disponibles
•send_notification: notificacion in-app + email opcional
•send_whatsapp: mensaje via WhatsApp Business API
•create_task: con todos los atributos configurables
•create_income: genera ingreso pendiente automaticamente
•update_field: actualiza cualquier campo de cualquier entidad
•move_deal_stage: mover deal a etapa especifica
•add_tag: agregar tag a contacto o deal
•assign_user: cambiar responsable
•create_activity: registrar interaccion en historial del contacto
•create_project: desde template predefinido
•send_email: template de email con variables dinamicas
•webhook: llamar URL externa con payload configurable
•delay: esperar X minutos antes del siguiente step
•condition: bifurcar el flujo segun condicion

3.4 Pipeline Transaccional Automatizado

Cuando un deal pasa a 'won', el sistema debe disparar una cadena de consecuencias automaticas que hoy son 100% manuales. Esta es la conexion mas importante entre el CRM y las operaciones.

12.Income auto-generado: crear registro en incomes con status 'pending', monto del deal, cliente, y fecha de vencimiento calculada segun terminos del deal
13.Proyecto auto-creado: si el deal tiene tipo 'proyecto', crear el proyecto con el mismo nombre, cliente, presupuesto, y fechas del deal
14.Cotizacion vinculada: si el deal tenia una cotizacion aceptada, usarla como base del income y del scope del proyecto
15.Tarea de onboarding: crear tarea 'Enviar contrato a [cliente]' asignada al responsable del deal con vencimiento en 24 horas
16.Actividad de CRM: registrar 'Deal ganado' en el historial del contacto con fecha, monto, y responsable
17.Lead score actualizado: cambiar temperatura del contacto a 'cliente activo'
18.Segmento actualizado: mover al contacto del segmento 'Prospects' a 'Clientes'
19.Notificacion al equipo: alerta in-app y email a los miembros relevantes
20.Meta de revenue: actualizar el currentValue de los Goals de tipo revenue_won



SECCION 4 — NUEVOS MODULOS: EL SALTO A ENTERPRISE

4. Modulos Nuevos — La Diferencia Entre una App y un Sistema

Estos modulos no existen en el sistema actual y son los que definen la diferencia entre una herramienta de productividad y un sistema operativo corporativo. Cada modulo esta especificado con el nivel de detalle necesario para que pueda implementarse sin ambiguedad.

4.1 Holding Dashboard — Consolidacion Financiera del Grupo

Por que este modulo es el mas importante
Un CEO con 3 empresas que no puede ver el estado financiero consolidado en 30 segundos esta gestionando a ciegas. Este modulo es la diferencia entre administrar y liderar.

Vista Principal del Holding
•KPIs consolidados en tiempo real: ingresos del grupo este mes, gastos totales, margen neto del grupo, pipeline total en todos los negocios
•Balance total del grupo: suma de todas las cuentas de todas las empresas convertida a moneda base del holding
•Breakdown por empresa: que porcentaje del revenue y los gastos corresponde a cada empresa del grupo
•Comparativa temporal: vs mes anterior, vs mismo mes del ano pasado, vs presupuesto del grupo
•Top 5 clientes del grupo: los mayores generadores de revenue considerando todas las empresas
•Pipeline consolidado: valor total de deals activos en todo el grupo por etapa
•Forecast a 90 dias: proyeccion de revenue basada en deals activos x probabilidad de cierre

Consolidacion con Eliminacion Intercompany
•Deteccion automatica de transacciones entre empresas del mismo grupo (intercompany)
•Cuando PulsarMoon factura a Verlyx Ecosystem: ambas transacciones se eliminan del consolidado
•P&L consolidado muestra solo revenue y gastos externos al grupo (third-party)
•Reporte de deudas intercompany: que empresa le debe a cual dentro del grupo y por que concepto
•Conciliacion intercompany: validar que la factura de una empresa coincide con el gasto de la otra

Multi-Moneda con Conversion Automatica
•Integracion con ExchangeRate-API para tipos de cambio actualizados cada hora
•Conversion automatica de UYU, USD, ARS, BRL, EUR a la moneda base del holding
•Historico de tipos de cambio para reportes de periodos pasados sin distorsion
•Ganancia o perdida por diferencia de cambio calculada automaticamente en cada transaccion
•Configuracion de moneda de reporte separada de moneda de operacion por empresa

4.2 Portal del Cliente — El Fin de los Whatsapps de Actualizacion

El portal del cliente es una interfaz web segura y personalizada donde los clientes acceden al estado de sus proyectos, aprueban entregables, descargan documentos, y pagan facturas. Elimina el 90% del overhead de actualizaciones manuales.

Acceso y Seguridad
•Link unico por cliente generado desde el sistema con un click, sin registro externo requerido
•Autenticacion por magic link enviado al email del cliente: seguro y sin friccion
•Sesion con tiempo de expiracion configurable: 7 dias, 30 dias, o permanente
•Vista completamente personalizada con logo, colores primarios y secundarios de la empresa proveedora
•Aislamiento de datos: el cliente ve SOLO sus proyectos, facturas, y documentos
•Log de acceso: el sistema registra cuando el cliente abre el portal, que ve y cuanto tiempo pasa

Funcionalidades del Portal
•Vista de estado del proyecto con progreso visual, etapa actual, y descripcion de actividades
•Timeline de hitos: completados con fecha real, proximos con fecha estimada
•Aprobacion de entregables: el cliente puede aprobar o pedir revision con comentarios
•Firma de documentos: aceptacion de contratos con timestamp e IP registrados
•Pago de facturas: boton de pago integrado con dLocal Go desde la misma pantalla
•Historial de pagos: todas las facturas con estado, fecha, y comprobante descargable
•Mensajeria: el cliente puede enviar mensajes al equipo directamente, sin WhatsApp
•Solicitud de cambios: formulario estructurado para pedir cambios de alcance con impacto estimado

Automatizaciones del Portal
•Email automatico al cliente cuando el proyecto avanza de etapa
•Email con link al entregable cuando hay algo para aprobar, con deadline de aprobacion
•Recordatorio automatico 7 dias y 1 dia antes del vencimiento de una factura
•Resumen semanal del progreso del proyecto los lunes a las 9am
•Alerta al equipo cuando el cliente no ha aprobado un entregable en X dias

4.3 Facturacion Electronica y Ciclo de Cobro Automatizado

El objetivo es que desde que se gana un deal hasta que el dinero este en la cuenta, la intervencion humana sea minima y el riesgo de olvido sea cero.

Generacion de Facturas
•Desde deal ganado: factura generada automaticamente con items de la cotizacion, datos del cliente, y vencimiento calculado
•Desde cotizacion aceptada: misma logica, sin necesidad de haber creado un deal
•Desde proyecto con hitos: una factura por hito cuando el hito se marca como completado
•Facturacion recurrente: para clientes con retainer mensual, la factura se genera el dia configurado automaticamente
•Numeracion automatica: formato configurable por empresa, ej: PM-2026-0042 para PulsarMoon
•Soporte fiscal: IVA, IVA incluido, retenciones de IRPF, configurables por tipo de cliente y empresa

Cobro con dLocal Go
•Payment link generado desde cualquier factura con un click, sin salir de Verlyx Hub
•Soporte para tarjeta credito/debito, transferencia bancaria, y efectivo via cobrador
•Webhook de confirmacion: cuando el pago confirma en dLocal, el income se marca como 'received' automaticamente
•Comprobante de pago enviado al cliente automaticamente con datos del pago
•Pago en cuotas: configurar cantidad de cuotas y sistema las distribuye como incomes individuales
•Pago parcial: registrar abono con saldo pendiente visible

Seguimiento de Cobros y Aging
•Vista de 'Por Cobrar' con aging automatico: 0-30 dias (verde), 31-60 dias (amarillo), 61-90 dias (naranja), +90 dias (rojo)
•Recordatorios automaticos configurables: 3 dias antes del vencimiento, el dia del vencimiento, 7 dias despues, 14 dias despues
•Escalacion configurable: si no paga en X dias, crear tarea de 'Llamada de cobro' asignada al responsable
•Historial de contacto de cobro por cliente: todas las interacciones registradas
•DSO dashboard: Days Sales Outstanding promedio por empresa, por cliente, y tendencia mensual
•Proyeccion de caja: cuando se espera cobrar cada factura pendiente basado en historial del cliente

4.4 Sistema de Contratos y Gestion Legal

Library de Templates Inteligentes
•Templates predefinidos: contrato de servicios web, contrato de mantenimiento, contrato de consultoria, NDA, acuerdo de confidencialidad, contrato de licencia de software
•Variables dinamicas: [[CLIENT_NAME]], [[PROJECT_VALUE]], [[START_DATE]], [[DELIVERABLES]], [[PAYMENT_TERMS]] se autocompletan desde el deal o cotizacion
•Editor de templates con formato rico: negrita, cursiva, tablas, listas numeradas
•Versionado de templates: cada modificacion guarda una version anterior con fecha y autor del cambio
•Templates por empresa: PulsarMoon tiene sus contratos, Verlyx Ecosystem los suyos, con datos legales distintos
•Preview del contrato con los datos reales antes de enviarlo

Ciclo de Vida del Contrato
•Generacion automatica: deal ganado dispara la generacion del contrato con template predefinido para ese tipo de negocio
•Revision interna: flujo de aprobacion antes de enviar — el contrato pasa por el dueno u otro revisor configurado
•Envio al cliente: email con link al contrato en el portal del cliente para lectura y firma
•Firma electronica: el cliente acepta los terminos, el sistema registra IP, timestamp, y user agent
•Almacenamiento inmutable: el contrato firmado no puede modificarse, solo archivarse
•Alertas de vencimiento: 30, 15, y 7 dias antes del fin del contrato con opcion de iniciar renovacion
•Renovacion facilitada: un click para generar nuevo contrato con mismos terminos y nuevas fechas

4.5 Gestion de Equipo, Capacidad y Rentabilidad

Perfiles del Equipo
•Datos basicos: nombre completo, email, foto, rol en la empresa, skills y tecnologias
•Tarifas: costo hora interno (para calculo de rentabilidad), tarifa hora billable (para cotizaciones)
•Disponibilidad: horas semanales configuradas, dias laborales, vacaciones programadas en calendario
•Historial: todos los proyectos y tareas completadas con metricas de desempeno

Vista de Capacidad
•Heatmap semanal de capacidad del equipo: verde (disponible), amarillo (80-95%), rojo (sobrecargado)
•Cuando se asigna una tarea: verificar si la persona tiene capacidad en el periodo de la tarea
•Si el responsable esta sobrecargado: alerta con sugerencia de reasignacion
•Proyeccion de carga: si se gana X deal nuevo, como impacta la capacidad del equipo las proximas 8 semanas
•Vista de quien esta libre para nuevos proyectos y desde cuando

Rentabilidad Real por Proyecto
•Calculo automatico: ingresos del deal - (horas equipo x costo interno) - gastos directos del proyecto
•Margen planeado vs margen real: desviacion en porcentaje con alerta si supera el umbral
•Breakdown por miembro del equipo: cuanto aportaron al ingreso y cuanto costaron
•Comparativa de rentabilidad entre proyectos similares: tendencias de estimacion

4.6 Gestion Financiera Avanzada

Conciliacion Bancaria con IA
•Importacion de extractos bancarios: soporte para formatos CSV (BROU, Itau, Santander), OFX, y MT940
•Matching automatico con IA: el sistema busca el ingreso o gasto registrado que coincide con cada movimiento bancario por monto, fecha, y descripcion
•Sugerencias para movimientos no matcheados: 'Este credito de $15,000 podria ser el pago de Empresa X del proyecto Y'
•Match manual con un click para confirmar sugerencias de la IA
•Movimientos no identificados: crear ingreso o gasto directamente desde el extracto
•Vista de diferencias: saldo contable de Verlyx vs saldo real del banco con explicacion de cada diferencia
•Informe de conciliacion exportable en PDF y Excel para el contador

Presupuestos y Control de Gastos
•Presupuesto anual/mensual/trimestral por categoria de gasto y por empresa
•Alertas en tiempo real cuando se alcanza el 80% del presupuesto de una categoria
•Alerta critica al 100% con bloqueo opcional de nuevos gastos en esa categoria
•Comparativa presupuesto vs real con variacion absoluta y porcentual
•Gastos recurrentes: identificacion automatica de patrones y registro inteligente
•Proyeccion de gastos: basada en compromisos existentes + patrones historicos

Reportes Financieros Completos
•P&L (Estado de Resultados): ingresos, costo de ventas, gastos operativos, EBITDA, resultado neto por empresa y consolidado
•Balance Sheet simplificado: activos corrientes (caja + por cobrar), activos no corrientes, pasivos, patrimonio
•Cashflow Statement: flujos de operacion, inversion, y financiamiento
•Todos los reportes disponibles mensual, trimestral, semestral, y anual
•Exportacion en PDF con branding de la empresa y en Excel para analisis adicional
•Drill-down: desde el P&L se puede hacer click en cualquier linea y ver las transacciones individuales

4.7 Business Intelligence y Analytics

Dashboard Ejecutivo con KPIs en Tiempo Real
•Revenue MTD (Month-to-Date) con comparativa vs mismo periodo mes anterior
•Gastos MTD con breakdown por categoria top 5
•Margen bruto y neto del mes con tendencia de los ultimos 12 meses en grafico de linea
•Pipeline activo: valor total, numero de deals por etapa, deals en riesgo
•Forecast del mes: proyeccion de cierre basada en pipeline ponderado por probabilidades
•Health Score del negocio: indice 0-100 calculado de maquinas de: cobranza, pipeline, capacidad equipo, clientes activos
•Top 3 acciones urgentes que el sistema recomienda para hoy

Reportes Comerciales
•Funnel de conversion: Lead -> Qualified -> Proposal -> Negotiation -> Won con tasa de conversion por etapa
•Tiempo promedio en cada etapa del pipeline y tendencia mes a mes
•Win rate por tipo de servicio, por industry del cliente, por responsable de ventas
•Revenue por fuente de lead: referido, sitio web, redes sociales, outbound, eventos
•Lifetime Value por cliente y por segmento de cliente
•Churn analysis: clientes sin actividad en 6+ meses con alerta proactiva
•Average Deal Value y tendencia de ticket promedio

Reportes Operacionales
•Utilizacion del equipo: porcentaje de horas billables vs horas disponibles totales por semana y mes
•On-time delivery rate: proyectos entregados en fecha vs retrasados, con promedio de dias de retraso
•Rentabilidad por proyecto: margen real vs margen cotizado con variacion
•Velocidad promedio de tareas por tipo y prioridad
•Customer satisfaction score calculado de aprobaciones en portal y tiempo de respuesta



SECCION 5 — INTELIGENCIA ARTIFICIAL OPERATIVA

5. Capa de Inteligencia Artificial

La IA no es una feature. Es la diferencia entre un sistema que almacena datos y uno que los entiende. Verlyx Hub debe tener una IA que observe el negocio continuamente, detecte patrones, anticipe problemas, y actue proactivamente para que el CEO siempre este un paso adelante.

5.1 Asistente Conversacional con Acceso Total y Tool Use

Contexto Dinamico del System Prompt
Cada request al asistente construye dinamicamente un system prompt con datos reales de Supabase:
•Identidad: nombre del usuario, empresa activa, rol, y timezone
•Estado financiero del dia: balance total de cuentas, ingresos del mes, gastos del mes, margen
•CRM: X deals activos por $Y total, los 3 deals mas urgentes con etapa y siguiente accion
•Operaciones: Z proyectos activos, los 3 con deadline mas proximo, proyectos retrasados
•Tareas: W tareas pendientes, las 5 con mayor prioridad y vencimiento, tareas bloqueadas
•Alertas: facturas vencidas, presupuestos superados, clientes sin actividad, equipo sobrecargado
•Contexto del grupo: si tiene vision de holding, estado de todas las empresas

Capacidades de Conversacion
•Responder preguntas sobre cualquier entidad del sistema con datos reales
•Comparar periodos: '¿Como fue el Q1 de este ano vs el Q1 del ano pasado?'
•Analizar tendencias: '¿Cuales son mis clientes con mayor potencial de crecimiento?'
•Detectar problemas: '¿Que proyectos estan en riesgo de no entregarse a tiempo?'
•Sintetizar: 'Dame un briefing de lo mas importante de esta semana en 5 puntos'
•Sugerir acciones: '¿Que deberia hacer hoy para maximizar el revenue del mes?'

Acciones que puede Ejecutar
•Crear, asignar, y priorizar tareas por lenguaje natural: 'Crea tarea urgente para llamar a Empresa X hoy'
•Mover deals: 'Pasa el deal de Empresa Y a propuesta enviada'
•Registrar pagos: 'Marco el cobro de Empresa Z por $5,000 como recibido'
•Enviar recordatorios: 'Mandame un recordatorio en 3 dias de hacer follow-up con este lead'
•Generar reportes: 'Genera el P&L de PulsarMoon del mes pasado en PDF'
•Crear eventos: 'Agendame una reunion con [cliente] el jueves a las 3pm'

5.2 Morning Briefing Automatico

Todos los dias laborales a las 8am, el sistema genera un briefing personalizado y lo envia como notificacion. El CEO llega a su oficina y sabe exactamente que necesita atencion.

•'Buenos dias. Hoy tienes: 3 aprobaciones pendientes, 2 follow-ups vencidos, 1 factura que vence manana'
•Situacion financiera: balance total, lo cobrado ayer, lo que se espera cobrar esta semana
•Pipeline: deals que no han tenido actividad en 7+ dias (en riesgo de enfriarse)
•Equipo: tareas vencidas, personas sobrecargadas
•Oportunidades: leads calientes sin contactar en 3+ dias
•Alertas de sistema: automatizaciones con errores, integraciones caidas

5.3 Lead Scoring Dinamico y Automatico

El score de cada lead se calcula y actualiza automaticamente en tiempo real sin intervencion manual. Nunca mas perder un lead caliente por falta de seguimiento.

Factores del Score (0-100)
Factor	Descripcion	Peso	Como se mide
Engagement Score	Actividad reciente con el contacto	30%	Llamadas, emails, reuniones en 30 dias
Profile Score	Fit del perfil con el cliente ideal	25%	Industria, tamano empresa, presupuesto estimado
Behavior Score	Senales de interes activo	25%	Apertura de cotizaciones, preguntas tecnicas, urgencia declarada
Financial Score	Historial financiero y valor	20%	LTV historico, comportamiento de pago, recurrencia

•Decay automatico: si no hay actividad en 14 dias, el score baja 5 puntos por dia
•Temperatura calculada: Cold (0-30), Warm (31-60), Hot (61-80), Very Hot (81-100)
•Alerta cuando un lead hot lleva 3 dias sin contacto
•Recalculo en tiempo real cada vez que se registra una actividad

5.4 Forecasting y Deteccion de Riesgos

Forecasting de Revenue
•Revenue proyectado proximo mes: suma de (valor deal x probabilidad de cierre) para deals en propuesta y negociacion
•Escenario optimista: gana todos los deals activos
•Escenario base: gana los deals con probabilidad > 60%
•Escenario pesimista: solo gana los deals con probability = 'very likely' por comportamiento historico
•Cashflow proyectado dia a dia los proximos 90 dias: cuando entran cobros vs cuando salen gastos comprometidos

Deteccion Proactiva de Riesgos
•Proyecto en riesgo de retraso: progreso real vs progreso esperado segun fechas. Alerta 10 dias antes del deadline
•Cliente en riesgo de churn: sin actividad + factura vencida + lead score en baja
•Presupuesto en riesgo: gastos actuales + proyectados superan budget del proyecto
•Concentracion de revenue: alerta si mas del 40% del revenue viene de un solo cliente (riesgo de dependencia)
•Pipeline seco: alerta si no entran leads nuevos en 21 dias
•Equipo sobrecargado: persona al 95%+ de capacidad por mas de 2 semanas
•Deal estancado: deal sin cambio de etapa en 15+ dias segun el promedio de la etapa



SECCION 6 — ARQUITECTURA ENTERPRISE Y SEGURIDAD

6. Arquitectura de Sistema Enterprise

6.1 Modelo de Datos Multi-Empresa Correcto

La reestructuracion del modelo de datos es el cambio mas profundo y el que habilita todo lo demas. Se agrega una capa de grupo corporativo sobre las empresas existentes.

Nuevas Entidades Requeridas
Tabla	Proposito	Relaciones Clave
corporate_groups	Entidad raiz del holding, contiene todas las empresas	1:N con my_companies
group_memberships	Que usuarios pertenecen al grupo con que rol de holding	N:N users x corporate_groups
company_memberships	Que usuarios tienen acceso a que empresa y con que rol	N:N users x my_companies con rol
permission_rules	Reglas granulares: puede_ver_finanzas, aprobar_hasta $X	N:1 company_memberships
intercompany_transactions	Transacciones entre empresas del mismo grupo	N:1 company origen y destino
approval_workflows	Definicion de workflows: gastos > $X necesitan aprobacion de Y	1:N my_companies
approval_requests	Instancias pendientes o resueltas de aprobacion	N:1 approval_workflows
audit_log	Log inmutable de cada operacion en el sistema via triggers	N:1 cualquier entidad
payment_links	Links de pago de dLocal Go vinculados a incomes	1:1 incomes
client_portal_tokens	Tokens de acceso al portal del cliente por contacto	N:1 contacts
contract_templates	Templates de contratos con variables dinamicas	N:1 my_companies
contracts	Contratos generados y firmados	N:1 deals o quotes
automation_executions	Log de cada ejecucion de automatizacion con resultado	N:1 automations
exchange_rates	Tipos de cambio historicos actualizados por cron	Standalone
team_capacity	Capacidad semanal de cada miembro del equipo	N:1 users x my_companies
bank_statements	Extractos bancarios importados para conciliacion	N:1 accounts
reconciliation_matches	Matches entre movimientos bancarios e incomes/expenses	N:1 bank_statements

6.2 Sistema de Permisos Granulares

Jerarquia de Roles
Rol	Scope	Capacidades Principales
HOLDING_OWNER	Todo el grupo	Acceso total, consolidacion, crear/eliminar empresas, ver todas las finanzas
HOLDING_ADMIN	Todo el grupo (solo lectura avanzada)	Ver reportes consolidados, no puede modificar estructura
COMPANY_OWNER	Una empresa especifica	Acceso total dentro de su empresa, gestionar equipo, aprobar todo
COMPANY_ADMIN	Una empresa	Gestionar equipo, configuracion, aprobar hasta cierto monto
COMPANY_FINANCE	Modulo financiero de una empresa	Solo ingresos, gastos, cuentas, presupuestos
COMPANY_SALES	Modulo CRM de una empresa	Deals, contactos, cotizaciones, actividades
COMPANY_OPS	Modulo operativo de una empresa	Proyectos, tareas, time tracking
COMPANY_VIEWER	Una empresa (readonly)	Ver todo, no puede crear ni modificar nada
CLIENT_PORTAL	Portal del cliente solamente	Solo sus proyectos, sus facturas, sus documentos

Permission Rules Granulares
•puede_aprobar_gastos_hasta: limite en moneda de la empresa
•puede_ver_finanzas_grupo: acceso al consolidado del holding
•puede_invitar_equipo: puede agregar nuevos miembros
•puede_eliminar_datos: puede borrar clientes, proyectos, deals
•puede_exportar_datos: puede descargar reportes y exportaciones
•puede_modificar_contratos: puede editar templates de contratos
•puede_ver_costos_equipo: puede ver la tarifa interna de cada miembro

6.3 Audit Trail Inmutable

Cada operacion en el sistema queda registrada en un log inmutable que no puede modificarse ni eliminarse. Se implementa con PostgreSQL triggers que escriben en audit_log antes de cada UPDATE o DELETE.

•Que cambio: entidad afectada, campo modificado, valor anterior, valor nuevo
•Quien: user_id del responsable del cambio
•Cuando: timestamp con timezone de alta precision
•Como: tipo de operacion (INSERT, UPDATE, DELETE), IP del cliente
•Por que: session_id y accion_context para correlacionar con automatizaciones
•UI de audit trail: filtrable por entidad, usuario, tipo de operacion, y periodo

6.4 Seguridad y Compliance

Seguridad de Datos
•Row Level Security en todas las tablas de Supabase: cada query esta restringida por empresa y por rol del usuario
•Encriptacion en reposo: datos sensibles (cuentas bancarias, datos fiscales, passwords de API) encriptados con pgcrypto
•HTTPS everywhere: toda comunicacion cliente-servidor usa TLS 1.3
•API Keys con scopes: las API keys de integraciones tienen permisos minimos necesarios
•Secret management: ningun secreto en el codigo, todo en variables de entorno con rotacion

Autenticacion Avanzada
•Two-Factor Authentication obligatorio para HOLDING_OWNER
•Magic links para portal del cliente: sin passwords, expiran en 15 minutos
•Session management: logout automatico por inactividad configurable por empresa
•Device tracking: lista de dispositivos autorizados por usuario
•Suspicious login detection: alerta si el login viene de un pais o IP desconocido

Backup y Recuperacion
•Backups automaticos de Supabase cada 6 horas con retencion de 30 dias
•Point-in-time recovery: recuperar el estado de la DB en cualquier momento de los ultimos 7 dias
•Exportacion de datos completa: el usuario puede descargar todos sus datos en formato JSON
•Disaster recovery plan documentado con RTO < 4 horas y RPO < 1 hora



SECCION 7 — EXPERIENCIA DE USUARIO DE CLASE MUNDIAL

7. Experiencia de Usuario — Velocidad y Fluidez

Un sistema que nadie quiere usar es un sistema fallido. Verlyx Hub debe ser la herramienta que el equipo abra con gusto, que sea mas rapida que pensar, y que anticipe lo que se necesita antes de pedirlo.

7.1 Command Palette Global (Cmd+K)

El shortcut de productividad mas importante de cualquier herramienta enterprise moderna. Con una combinacion de teclas el usuario puede hacer cualquier accion sin navegar.

•Busqueda en tiempo real sobre todas las entidades: clientes, proyectos, deals, tareas, documentos, facturas
•Acciones rapidas: Nueva tarea, Nuevo deal, Nuevo contacto, Nueva factura, Nuevo proyecto
•Navegacion instantanea: escribir el nombre de cualquier pagina del sistema para ir directamente
•Acciones contextuales: si estas en un deal, el palette ofrece 'Mover a siguiente etapa', 'Crear tarea del deal', 'Generar factura'
•Historial reciente: los ultimos 10 elementos visitados
•Atajos de teclado documentados: Cmd+N (nueva tarea), Cmd+D (nuevo deal), etc.

7.2 Inbox de Acciones: Lo que Necesita Atencion Ahora

La primera pantalla que debe ver el CEO al abrir el sistema: todo lo que requiere su decision o atencion, ordenado por urgencia, con accion directa desde la misma vista.

•Aprobaciones pendientes: gastos que superan el umbral, contratos para revisar, descuentos solicitados
•Follow-ups vencidos o con vencimiento hoy, con nombre del contacto y contexto del ultimo contacto
•Facturas que vencen en los proximos 3 dias con boton de 'Enviar recordatorio'
•Proyectos con retraso identificado: X dias atrasado, responsable, proxima accion
•Deals sin actividad hace mas de 7 dias con calor del lead y valor del deal
•Mensajes del portal del cliente sin respuesta
•Automatizaciones con errores en las ultimas 24 horas
•Cada item del inbox tiene: titulo, contexto, y botones de accion directa sin navegar

7.3 Modo Focus por Empresa

•Selector de empresa siempre visible en el topbar con logo y color primario de la empresa activa
•Al cambiar de empresa: todos los modulos se filtran instantaneamente, la URL cambia, el color del sidebar cambia
•Opcion 'Vista de Grupo': todos los datos de todas las empresas consolidados
•Breadcrumb de empresa: todos los registros muestran a que empresa pertenecen
•Atajos para cambiar empresa sin mouse: Alt+1, Alt+2, Alt+3 por empresa en orden

7.4 Vistas Avanzadas para Cada Modulo

Proyectos
•Vista Lista: tabla con columnas configurables, ordenamiento, filtros avanzados
•Vista Kanban: por status con drag & drop nativo, preview de tarjeta en hover
•Vista Gantt: timeline de proyectos y tareas con dependencias visuales
•Vista Calendario: proyectos y deadlines en vista mensual/semanal
•Vista Mosaico: cards grandes con progreso visual, ideal para presentation

Tareas
•Kanban con swim lanes por proyecto, o por asignado, o por prioridad
•Vista tabla para bulk editing de tareas
•Mi Dia: vista personal de las tareas del dia con drag para reordenar prioridad
•Vista timeline: tareas en cronologia con dependencias

Deals / Pipeline
•Pipeline Kanban: tarjetas grandes con valor, cliente, dias en etapa, temperatura del lead
•Vista tabla: para deals en masa con filtros avanzados
•Vista forecast: agrupado por probabilidad de cierre y mes esperado

7.5 Design System Coherente

•Biblioteca de componentes UI completamente documentada: Button, Input, Select, Modal, Toast, Badge, Card, Table, Kanban, etc.
•Tokens de diseno: colores, espaciado, tipografia, sombras, bordes — todos como variables CSS
•Dark mode y light mode con persistencia por usuario
•Temas de color por empresa: cada empresa tiene su color primario que tine el sidebar y los headers
•Responsive design: funcional en tablet y mobile aunque el foco sea desktop
•Animaciones y microinteracciones: transitions suaves en modales, toasts con auto-dismiss, loading skeletons
•Density settings: compacta, normal, y espaciosa para diferentes preferencias de trabajo



SECCION 8 — INTEGRACIONES Y ECOSISTEMA

8. Integraciones Externas

8.1 Comunicacion con Clientes

Integracion	Que hace	Prioridad
WhatsApp Business API	Enviar mensajes de seguimiento, cotizaciones, y alertas de pago. Recibir respuestas en el sistema	ALTA
Gmail + Google Workspace	Sincronizacion de emails con contactos, tracking de apertura de cotizaciones enviadas por email	ALTA
Outlook / Microsoft 365	Mismo para usuarios de ecosistema Microsoft	MEDIA
Zoom	Crear reunion desde deal o tarea. El link se agrega automaticamente al evento del calendario	MEDIA
Google Meet	Alternativa a Zoom para creacion de reuniones	MEDIA
Calendly	Cuando un lead agenda reunion via Calendly, se crea el deal y la actividad automaticamente	ALTA
Slack / Discord	Notificaciones de eventos criticos del sistema en canales del equipo	MEDIA

8.2 Pagos y Finanzas

Integracion	Que hace	Prioridad
dLocal Go	Cobros online para Latam: tarjeta, transferencia, efectivo. Webhook de confirmacion automatico	CRITICA
Mercado Pago	Alternativa para mercado argentino y otros paises Latam	ALTA
Stripe	Para cobros en USD con clientes internacionales	MEDIA
BROU / Itau API	Importacion automatica de extractos para conciliacion bancaria	ALTA
DGI Uruguay	Validacion de RUT de proveedores y clientes. Futura facturacion electronica e-CF	ALTA
Open Banking APIs	Conexion directa con bancos para saldo en tiempo real y movimientos del dia	MEDIA

8.3 Marketing y Generacion de Leads

Integracion	Que hace	Prioridad
Meta Ads (Facebook/Instagram)	Ver metricas de campanas dentro del CRM. Attribution: lead vino de que campana	ALTA
Google Ads	Mismo para campanas de Google con costo por lead calculado	ALTA
Google Analytics	Vincular trafico web con leads generados. Saber que paginas convierten	MEDIA
Typeform / JotForm	Formulario de contacto completado -> lead creado automaticamente con score inicial	ALTA
LinkedIn Sales Navigator	Enriquecer perfiles de contactos con cargo, empresa, conexiones mutuas	MEDIA
Hunter.io	Encontrar emails de contactos a partir de nombre y dominio	BAJA

8.4 API Publica

Verlyx Hub debe tener una API REST publica y documentada. Esto abre posibilidades de integracion que ninguno de los competidores Latam ofrece.

•Autenticacion con API Keys (para integraciones server-to-server) y OAuth 2.0 (para aplicaciones de terceros)
•Endpoints para todas las entidades: contacts, projects, tasks, deals, invoices, payments
•Webhooks outbound: cuando pasa algo en Verlyx Hub, notificar a sistemas externos en tiempo real
•Rate limiting configurable por cliente de API con headers estandar de throttling
•Documentacion interactiva con Swagger/OpenAPI 3.0 con ejemplos en cada endpoint
•SDK en TypeScript/JavaScript publicado en npm para integracion facil
•Sandbox environment para que desarrolladores prueben sin datos reales



SECCION 9 — STACK TECNOLOGICO DEFINITIVO

9. Stack Tecnologico

9.1 Frontend

Tecnologia	Version	Por que / Uso
Next.js	16.x	App Router, Server Components para datos estaticos, Route Handlers para API. Mantener.
React	19.x	Aprovechar concurrent features y Server Components. Mantener.
TypeScript	5.x	Strict mode activado, sin any salvo excepciones justificadas. Mantener.
Tailwind CSS	v4	Mantener. Design system con CSS variables para theming por empresa.
Zustand	v5	Estado del cliente para UI state. Mantener para auth y empresa activa.
TanStack Query	v5	AGREGAR. Reemplazar useEffect + fetch con caching inteligente y background refetch.
TanStack Virtual	v3	AGREGAR. Virtualizacion de listas largas > 100 items para performance.
CMDK	latest	AGREGAR. Command palette Cmd+K con busqueda y acciones.
React Hook Form + Zod	latest	AGREGAR. Formularios con validacion en tiempo real y tipado completo.
Recharts	latest	AGREGAR. Graficos financieros y de BI con animaciones.
DND Kit	latest	AGREGAR. Drag and drop para Kanban, reordenamiento de widgets y listas.
date-fns	v4	Ya instalado. Mantener para manipulacion de fechas.

9.2 Backend con Supabase

Componente	Estado	Implementacion
Supabase PostgreSQL	Activo	Agregar indices GIN para busqueda full-text. Migrar schema para multi-empresa.
Supabase Auth	Activo	Extender con company_memberships y permission_rules para multi-empresa.
Supabase RLS	Activo	Actualizar politicas para rol granular por empresa y modulo.
Supabase Realtime	INACTIVO — ACTIVAR	Habilitar en tasks, deals, notifications, e incomes para colaboracion.
Supabase Edge Functions	INACTIVO — CREAR	Motor de automatizaciones, webhooks de pago, generacion de reportes pesados.
Supabase Storage	Activo parcial	Usar para todos los archivos: documentos, contratos, adjuntos, exportaciones.
Supabase Cron	INACTIVO — CREAR	Morning briefing, recordatorios de cobro, actualizacion de tipos de cambio.
Supabase Webhooks	INACTIVO — CREAR	Triggers para motor de automatizaciones y eventos del sistema.

9.3 Servicios Externos

Servicio	Uso	Tier Recomendado
Claude API (Anthropic)	Asistente AI con tool use, analisis de datos, forecasting	claude-sonnet-4-6 (produccion), claude-haiku (queries simples)
Resend	Emails transaccionales: facturas, recordatorios, portal del cliente, magic links	Pro plan para volumen
dLocal Go	Cobros online para Uruguay y Latam con webhook de confirmacion	Business account
Sentry	Error tracking, performance monitoring, alertas operacionales	Team plan
Vercel	Deployment con Edge Network global, preview deployments por branch	Pro plan
Cloudflare R2	Almacenamiento de archivos a $0.015/GB vs $0.023/GB de S3	Pay as you go
ExchangeRate-API	Tipos de cambio en tiempo real para multi-moneda	Free tier (1500 req/mes)
Twilio / 360dialog	WhatsApp Business API para mensajes a clientes	Pay per message



SECCION 10 — ROADMAP DE IMPLEMENTACION (20 SEMANAS)

10. Roadmap de Implementacion

El roadmap esta organizado para que cada fase entregue valor inmediato y no dependa de la siguiente para funcionar. Al final de cada fase, el sistema es mejor que al inicio y se puede usar en produccion.

Fase 1 — Fundamentos Confiables (Semanas 1-3)

Objetivo
Eliminar todos los bugs criticos. Al final, el sistema es 100% confiable con los datos que tiene y ninguna feature miente.

FASE
  1
Sem 1-3	Fundamentos que no mienten
•Unificar todos los enums y status en lowercase snake_case con migration SQL
•Instalar TanStack Query y migrar los stores mas usados (tasks, deals, clients)
•Activar Supabase Realtime en tasks y deals para colaboracion en tiempo real
•Crear motor de automatizaciones con Supabase Edge Functions y Database Webhooks
•Conectar AI con Claude API real, contexto dinamico de Supabase, tool use basico
•Implementar pipeline deal_won: auto-income + auto-proyecto + auto-tarea de onboarding
•Implementar audit log con triggers de PostgreSQL en todas las tablas criticas
•Migrar PulsarMoon a tablas reales de proyectos (eliminar demo data)
•Migrar Verlyx Ecosystem a tablas reales de buildings y merchants

Fase 2 — Monetizacion y Cobros (Semanas 4-7)

Objetivo
El sistema debe poder cobrar solo. Desde que se gana un deal hasta tener el dinero, la intervencion manual debe ser minima.

FASE
  2
Sem 4-7	El ciclo de cobro completo
•Facturacion automatica: deal ganado o cotizacion aceptada genera factura con items y vencimiento
•Integracion completa dLocal Go: payment link desde factura, webhook de confirmacion automatico
•Portal del cliente v1: acceso por magic link, estado del proyecto, descarga de facturas, pago online
•Sistema de contratos: templates con variables dinamicas, envio al cliente, firma en portal
•Recordatorios de cobro automaticos: 3 dias antes, dia del vencimiento, 7 dias despues
•Aging dashboard: Por Cobrar con colores por urgencia y DSO por cliente
•Facturacion recurrente: para retainers mensuales con generacion automatica
•Email transaccional con Resend: facturas, recordatorios, confirmaciones de pago

Fase 3 — Inteligencia y Vision de Grupo (Semanas 8-12)

Objetivo
El CEO debe poder tomar decisiones informadas en menos de 5 minutos mirando el sistema.

FASE
  3
Sem 8-12	Datos que se convierten en decisiones
•Holding Dashboard: P&L consolidado del grupo, balance total, pipeline consolidado
•Eliminacion intercompany: detection automatica y exclusion del consolidado
•Multi-moneda con conversion automatica via ExchangeRate-API
•AI asistente v2: tool use completo, puede ejecutar cualquier accion del sistema
•Morning Briefing automatico: Supabase Cron envia briefing personalizado a las 8am
•Lead Scoring dinamico con decay automatico y recalculo en tiempo real
•Reportes ejecutivos en PDF: P&L, Balance Sheet simplificado, reporte de cobros
•Forecasting de revenue a 90 dias con tres escenarios
•Business Intelligence: conversion funnel, win rate, rentabilidad por proyecto
•Deteccion de riesgos proactiva: proyecto en riesgo, cliente en riesgo de churn, pipeline seco

Fase 4 — Equipo y Governance (Semanas 13-16)

Objetivo
El sistema soporta un equipo real con roles distintos trabajando en paralelo con confianza total en los permisos.

FASE
  4
Sem 13-16	Del emprendedor al equipo
•Sistema de permisos granulares: company_memberships, permission_rules, y roles por modulo
•Invitaciones de equipo por email con rol configurable y onboarding guiado
•Approval workflows configurables: gastos, contratos, descuentos con motor de aprobacion
•Vista de capacidad del equipo: heatmap de carga, deteccion de sobrecarga, proyeccion
•Rentabilidad por proyecto: ingresos - horas equipo x costo - gastos directos
•Gestion de gastos y rendiciones del equipo con flujo de aprobacion
•Portal del cliente v2: aprobacion de entregables, mensajeria directa, solicitud de cambios
•Command palette global (Cmd+K) con busqueda y acciones rapidas
•Inbox de acciones pendientes como pantalla principal del sistema

Fase 5 — Plataforma y Ecosistema (Semanas 17-20)

Objetivo
Verlyx Hub se convierte en plataforma: conecta con el mundo exterior, escala sin limite, y puede venderse a otros.

FASE
  5
Sem 17-20	Del sistema a la plataforma
•Conciliacion bancaria automatica con IA matching y importacion de extractos
•API publica REST con autenticacion, rate limiting, y documentacion Swagger
•Integracion WhatsApp Business API para mensajes a clientes desde el sistema
•Integracion Gmail / Google Calendar para sincronizacion de emails y reuniones
•Facturacion electronica DGI Uruguay (e-CF) para empresas Uruguayas
•Mobile app PWA: instalable en telefono con notificaciones push nativas
•White-label: el sistema puede desplegarse con marca propia para clientes grandes
•Multilenguaje: espanol completo, ingles, portugues para expansion regional
•Marketplace de integraciones: panel para conectar nuevas apps sin codigo



SECCION 11 — POR QUE VERLYX HUB SERA UNICO

11. Posicionamiento Competitivo

11.1 El Problema del Mercado Actual

El mercado de software empresarial esta fragmentado en herramientas especializadas que no se hablan entre si. Salesforce cuesta $300/usuario/mes y necesita consultora para implementar. HubSpot es excelente para marketing pero no tiene gestion operacional real. Monday.com resuelve proyectos pero no tiene CRM ni finanzas. Odoo tiene todo pero es extremadamente complejo. Ninguno fue construido para el CEO latinoamericano de una empresa de servicios que maneja multiples negocios, cobra en pesos y dolares, necesita facturacion para DGI, y quiere una sola pantalla para ver todo.

11.2 Ventajas Competitivas Irrepetibles

Ventaja	Por que es irrepetible	Competidor mas cercano
Consolidacion de grupo con intercompany	Ninguna herramienta Latam SMB tiene esto	Solo ERPs enterprise como SAP
Pipeline Lead -> Cobro en un sistema	Los competidores son uno de los pasos, no todo el flujo	Nadie en Latam
IA que ejecuta acciones reales	Claude con tool use sobre datos propios del negocio	Ninguno en el segmento
Hecho para Latam nativo: dLocal, DGI, UYU, ARS	No una adaptacion, diseno nativo para la region	Solo plataformas locales de un pais
Portal del cliente con cobro integrado	El cliente aprueba, el cliente paga, todo en un link	Muy pocos y sin Latam coverage
Un sistema para el grupo, no por empresa	Vision de holding con drill-down por empresa	Solo SAP y Oracle
Precio accesible para PyMEs premium	Enterprise features a precio de SaaS moderno	Nadie posicionado igual
Open API desde el inicio	Conecta con cualquier sistema futuro sin reescribir	Los grandes lo tienen, los locales no



SECCION 12 — GUIA DE IMPLEMENTACION PARA EL MODELO DE IA

12. Instrucciones Criticas de Implementacion

Para Claude Opus que implemente este sistema
Las siguientes instrucciones son el contrato de calidad de la implementacion. Cada decision de arquitectura tiene una razon que debe respetarse para mantener la coherencia del sistema a largo plazo.

12.1 Principios de Arquitectura

21.TypeScript estricto en todo el codebase: nunca usar 'any', nunca hacer type assertions innecesarias. Si TypeScript se queja, arreglar el tipo, no silenciar el error
22.Separacion de responsabilidades: los stores de Zustand manejan estado del cliente, TanStack Query maneja fetching y cache, los Route Handlers manejan logica de servidor, las Edge Functions manejan logica pesada o programada
23.Optimistic updates en todas las operaciones: el cambio se refleja inmediatamente en la UI, se revierte si el servidor falla
24.Error handling visible: nunca silenciar errores. Cada operacion fallida debe mostrar un toast de error especifico, no generico
25.Loading states en cada boton que dispara una operacion async: el boton muestra spinner y se deshabilita para evitar double-submit
26.Paginacion en todas las listas con mas de 50 registros potenciales: nunca cargar toda la tabla en memoria
27.Las operaciones criticas (crear factura, mover deal, aprobar gasto) deben tener confirmacion explicita

12.2 Convenciones de Codigo

•Archivos: kebab-case.tsx para paginas y componentes, camelCase.ts para utilities y hooks
•Componentes: PascalCase, una exportacion por archivo cuando sea posible
•Funciones: camelCase, nombres descriptivos que indican que hace (getClientById, createInvoiceFromDeal)
•Status enums: siempre lowercase snake_case para consistencia con Supabase
•Comentarios en el codigo: en espanol para logica de negocio, en ingles para logica tecnica
•Cada modulo nuevo debe tener su carpeta en /components/[modulo]/ con index.ts exportando los publicos
•Los hooks personalizados van en /lib/hooks/ con el prefijo 'use': useDeals, useCompanyFinancials, useAIAssistant

12.3 Performance Guidelines

•TanStack Query staleTime minimo 30 segundos para datos que no cambian frecuentemente
•Los calculos pesados del dashboard van en el servidor o en useMemo con dependencias correctas
•Los reportes financieros complejos se calculan en Edge Functions, no en el cliente
•Las imagenes siempre con next/image y loading='lazy'
•Los iconos con lucide-react ya instalado, no importar librerias de iconos adicionales
•Los graficos con Recharts (agregar), con lazy loading de la pagina que los contiene

12.4 Testing y Calidad

•Cada funcion de utilidad critica (calculos financieros, formateo de moneda) debe tener tests unitarios
•Los flujos criticos (deal ganado, factura generada, pago recibido) deben tener tests de integracion
•Usar Supabase local para tests que necesiten base de datos
•El build de Next.js no debe tener errores de TypeScript ni warnings de ESLint
•Cada PR debe incluir descripcion de que cambio y por que, no solo que archivos



SECCION 13 — SCHEMA DE BASE DE DATOS: ENTIDADES CRITICAS

13. Schema de Base de Datos

Las siguientes definiciones de tablas son las adiciones y modificaciones mas importantes al schema actual. Se presentan en formato pseudoSQL para comunicar la intencion de diseno.

13.1 Tablas de Grupo y Permisos

corporate_groups
•id UUID PRIMARY KEY
•name TEXT NOT NULL
•slug TEXT UNIQUE — para URLs amigables
•base_currency TEXT DEFAULT 'USD'
•country TEXT
•timezone TEXT DEFAULT 'America/Montevideo'
•logo_url TEXT
•settings JSONB — configuraciones del holding
•created_by UUID REFERENCES auth.users
•created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

company_memberships
•id UUID PRIMARY KEY
•user_id UUID REFERENCES auth.users
•company_id UUID REFERENCES my_companies
•role TEXT CHECK role IN ('company_owner','company_admin','company_finance','company_sales','company_ops','company_viewer')
•permissions JSONB — puede_aprobar_gastos_hasta, puede_ver_costos_equipo, etc.
•invited_by UUID REFERENCES auth.users
•accepted_at TIMESTAMPTZ
•is_active BOOLEAN DEFAULT true
•created_at TIMESTAMPTZ

approval_workflows
•id UUID PRIMARY KEY
•company_id UUID REFERENCES my_companies
•entity_type TEXT — 'expense', 'contract', 'deal_discount', 'new_client'
•condition_field TEXT — 'amount', 'discount_percent'
•condition_operator TEXT — 'greater_than', 'equals'
•condition_value NUMERIC
•approver_role TEXT — que rol debe aprobar
•approver_user_id UUID — o usuario especifico
•is_active BOOLEAN DEFAULT true

13.2 Tablas Financieras Nuevas

payment_links
•id UUID PRIMARY KEY
•company_id UUID REFERENCES my_companies
•income_id UUID REFERENCES incomes
•dlocal_link_id TEXT — ID del link en dLocal
•url TEXT NOT NULL — URL del link de pago
•amount NUMERIC, currency TEXT
•status TEXT CHECK status IN ('active','paid','expired','cancelled')
•paid_at TIMESTAMPTZ
•paid_amount NUMERIC
•payment_method TEXT — card, bank_transfer, cash
•dlocal_webhook_data JSONB — payload completo del webhook
•expires_at TIMESTAMPTZ
•created_at TIMESTAMPTZ

bank_statements
•id UUID PRIMARY KEY
•company_id UUID REFERENCES my_companies
•account_id UUID REFERENCES accounts
•period_start DATE, period_end DATE
•imported_at TIMESTAMPTZ
•total_credits NUMERIC, total_debits NUMERIC
•opening_balance NUMERIC, closing_balance NUMERIC
•source_file_url TEXT
•status TEXT CHECK status IN ('pending','reconciled','partial')

bank_statement_items
•id UUID PRIMARY KEY
•statement_id UUID REFERENCES bank_statements
•transaction_date DATE
•description TEXT
•amount NUMERIC — positivo ingreso, negativo gasto
•balance_after NUMERIC
•reference TEXT — numero de referencia bancaria
•reconciled_with_type TEXT — 'income' o 'expense'
•reconciled_with_id UUID — referencia al income o expense
•reconciled_at TIMESTAMPTZ
•reconciled_by UUID REFERENCES auth.users



SECCION 14 — METRICAS DE EXITO DEL SISTEMA

14. Metricas de Exito

Como saber que el sistema esta cumpliendo su promesa. Estas metricas se pueden medir objetivamente y deben revisarse al finalizar cada fase del roadmap.

14.1 Metricas Operacionales

Metrica	Objetivo a 6 meses	Como se mide
Tiempo deal ganado -> factura enviada	< 5 minutos (automatico)	Timestamp deal_won vs timestamp factura creada
Tiempo factura enviada -> cobro confirmado	-20% vs linea base manual	DSO promedio en el dashboard
% automatizaciones ejecutadas con exito	> 99%	automation_executions con status = success
Tiempo para obtener P&L del grupo	< 30 segundos	Carga del holding dashboard
Tareas creadas manualmente vs automaticamente	30% automaticas	task.created_by_automation vs user
Tiempo de respuesta del AI asistente	< 3 segundos	Latencia del endpoint /api/ai/chat
Score de completitud de datos de clientes	> 85%	Campos completos en tabla contacts

14.2 Metricas de Adopcion del Equipo

Metrica	Objetivo a 3 meses	Indicador de
DAU/MAU del sistema	> 70%	El equipo usa el sistema diariamente
% acciones via Command Palette	> 30% de usuarios activos	Adopcion de shortcuts de productividad
Clientes que pagan via portal	> 50% de facturas	Exito del portal de pago
Queries al AI asistente por usuario/semana	> 5	Confianza en el asistente de IA
% deals con cotizacion vinculada	> 80%	Uso correcto del pipeline completo
Tiempo promedio de apertura de alerta hasta accion	< 4 horas	Efectividad del inbox de acciones



DECLARACION FINAL

15. Declaracion de Intencion

Este documento no describe lo que seria 'lindo tener'. Describe lo que es posible construir con las herramientas que ya existen, la arquitectura que ya esta en el sistema, y la vision que ya esta clara.

Verlyx Hub tiene todo para ser el sistema operativo de referencia para grupos empresariales en crecimiento en Latinoamerica. No necesita anos ni equipos de 50 personas. Necesita implementacion disciplinada, fase por fase, con las prioridades correctas.

Cada modulo de este documento fue especificado con suficiente detalle para implementarse. Cada correccion critica tiene causa, efecto, y solucion. Cada decision de arquitectura tiene su razon documentada. El sistema que emerge de este blueprint sera genuinamente unico en el mercado regional.

Verlyx Hub
No una herramienta mas.
La columna vertebral de un grupo empresarial que crece.
La envidia de cualquier empresa del mundo.
