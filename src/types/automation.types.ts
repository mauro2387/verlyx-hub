/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - AUTOMATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * MOTOR DE AUTOMATIZACIONES INTELIGENTES
 * 
 * Este módulo implementa un sistema de reglas y eventos que permite:
 * - Definir triggers (disparadores) basados en eventos o tiempo
 * - Configurar condiciones (reglas) que determinan cuándo ejecutar
 * - Especificar acciones a realizar
 * - Manejar fallbacks cuando las acciones fallan
 * - Auditar completamente cada ejecución
 * 
 * ARQUITECTURA:
 * 
 * EventBus → RuleEngine → ActionExecutor → AuditLogger
 *     ↓           ↓              ↓              ↓
 *  Events    Conditions      Actions        Logs
 * 
 * PRINCIPIOS:
 * - Cada automatización es explicable (no "IA humo")
 * - Todas las ejecuciones son auditables
 * - Los fallbacks son obligatorios
 * - Las reglas son versionadas
 */

import type {
  AccessAuthorization,
  AccessStatus,
  AuditLogEntry,
  Building,
  ExpenseStatement,
  MaintenanceRequest,
  Notification,
  NotificationChannel,
  NotificationType,
  Payment,
  Priority,
  Reservation,
  Task,
  Unit,
  User,
} from './core.types';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: DEFINICIÓN DE REGLAS DE AUTOMATIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Una regla de automatización completa.
 * Define: trigger → conditions → actions → fallback → audit
 */
export interface AutomationRule {
  id: string;
  buildingId: string;              // Puede ser '*' para global
  
  // Metadata
  name: string;
  description: string;
  category: AutomationCategory;
  
  // Activación
  isActive: boolean;
  priority: number;                // Para orden de ejecución
  
  // Trigger: ¿Cuándo se evalúa esta regla?
  trigger: AutomationTrigger;
  
  // Conditions: ¿Bajo qué condiciones se ejecuta?
  conditions: AutomationCondition[];
  conditionOperator: 'AND' | 'OR';
  
  // Actions: ¿Qué hace cuando se cumple?
  actions: AutomationAction[];
  
  // Fallback: ¿Qué hacer si falla?
  fallbackActions: AutomationAction[];
  
  // Límites
  maxExecutionsPerDay?: number;
  cooldownMinutes?: number;        // Tiempo mínimo entre ejecuciones
  
  // Estadísticas
  executionCount: number;
  lastExecutedAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  failureCount: number;
  
  // Versionado
  version: number;
  
  // Auditoría
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export type AutomationCategory = 
  | 'access_management'            // Gestión de accesos
  | 'payment_collection'           // Cobranza
  | 'maintenance_workflow'         // Flujo de mantenimiento
  | 'reservation_management'       // Gestión de reservas
  | 'notification_dispatch'        // Envío de notificaciones
  | 'reporting'                    // Generación de reportes
  | 'data_archival'               // Archivado automático
  | 'anomaly_detection'           // Detección de anomalías
  | 'staff_management'            // Gestión de personal
  | 'financial_operations';       // Operaciones financieras

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: TRIGGERS (DISPARADORES)
// ═══════════════════════════════════════════════════════════════════════════════

export type AutomationTrigger = 
  | EventTrigger
  | ScheduleTrigger
  | ThresholdTrigger
  | ManualTrigger;

/**
 * Trigger basado en eventos del sistema
 */
export interface EventTrigger {
  type: 'event';
  eventType: SystemEvent;
  entityType?: string;             // Filtrar por tipo de entidad
  filters?: Record<string, unknown>; // Filtros adicionales
}

/**
 * Trigger basado en programación temporal
 */
export interface ScheduleTrigger {
  type: 'schedule';
  scheduleType: ScheduleType;
  
  // Para 'cron'
  cronExpression?: string;
  
  // Para 'daily', 'weekly', 'monthly'
  time?: string;                   // HH:MM
  dayOfWeek?: number;              // 0-6 para weekly
  dayOfMonth?: number;             // 1-31 para monthly
  
  // Zona horaria
  timezone: string;
}

/**
 * Trigger cuando un valor cruza un umbral
 */
export interface ThresholdTrigger {
  type: 'threshold';
  metric: ThresholdMetric;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  value: number;
  checkIntervalMinutes: number;
}

/**
 * Trigger manual (para testing o ejecución forzada)
 */
export interface ManualTrigger {
  type: 'manual';
  allowedRoles: string[];
}

export type SystemEvent = 
  // Accesos
  | 'access.created'
  | 'access.approved'
  | 'access.rejected'
  | 'access.activated'
  | 'access.used'
  | 'access.expired'
  | 'access.revoked'
  | 'access.expiring_soon'
  
  // Pagos
  | 'payment.created'
  | 'payment.confirmed'
  | 'payment.voided'
  | 'expense.issued'
  | 'expense.overdue'
  | 'expense.paid'
  
  // Reservas
  | 'reservation.created'
  | 'reservation.confirmed'
  | 'reservation.cancelled'
  | 'reservation.upcoming'
  | 'reservation.started'
  | 'reservation.completed'
  | 'reservation.no_show'
  
  // Mantenimiento
  | 'maintenance.created'
  | 'maintenance.assigned'
  | 'maintenance.started'
  | 'maintenance.completed'
  | 'maintenance.rated'
  | 'maintenance.escalated'
  
  // Usuarios
  | 'user.created'
  | 'user.activated'
  | 'user.deactivated'
  | 'user.login'
  | 'user.logout'
  | 'user.password_changed'
  
  // Sistema
  | 'system.daily_start'
  | 'system.daily_end'
  | 'system.period_close'
  | 'system.backup_completed';

export type ScheduleType = 'cron' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ThresholdMetric = 
  | 'pending_payments_count'
  | 'pending_payments_amount'
  | 'overdue_payments_count'
  | 'open_maintenance_count'
  | 'critical_maintenance_count'
  | 'expiring_access_count'
  | 'visitor_count_today'
  | 'reservation_occupancy_percent';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: CONDITIONS (CONDICIONES)
// ═══════════════════════════════════════════════════════════════════════════════

export interface AutomationCondition {
  id: string;
  field: string;                   // Path al campo (ej: "entity.status")
  operator: ConditionOperator;
  value: unknown;
  valueType: 'static' | 'dynamic' | 'relative_date';
  
  // Para fechas relativas
  relativeDateConfig?: {
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
    value: number;
    direction: 'past' | 'future';
  };
}

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'is_before_date'
  | 'is_after_date'
  | 'is_between_dates'
  | 'is_within_hours'
  | 'days_until'
  | 'days_since';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: ACTIONS (ACCIONES)
// ═══════════════════════════════════════════════════════════════════════════════

export type AutomationAction = 
  | NotificationAction
  | StatusChangeAction
  | AssignmentAction
  | TaskCreationAction
  | DataUpdateAction
  | WebhookAction
  | EmailAction
  | ReportAction
  | ArchiveAction
  | EscalationAction;

export interface BaseAction {
  id: string;
  order: number;
  delayMinutes?: number;           // Delay antes de ejecutar
  retryConfig?: {
    maxRetries: number;
    retryDelayMinutes: number;
  };
}

/**
 * Enviar notificación
 */
export interface NotificationAction extends BaseAction {
  type: 'notification';
  notificationType: NotificationType;
  channels: NotificationChannel[];
  
  // Template
  titleTemplate: string;
  messageTemplate: string;
  
  // Destinatarios
  recipientType: 'entity_owner' | 'unit_residents' | 'building_admins' | 'assigned_staff' | 'specific_users' | 'specific_roles';
  recipientIds?: string[];
  recipientRoles?: string[];
  
  // Variables disponibles en templates: {{entity.field}}, {{building.name}}, etc.
}

/**
 * Cambiar estado de una entidad
 */
export interface StatusChangeAction extends BaseAction {
  type: 'status_change';
  newStatus: string;
  reason?: string;
}

/**
 * Asignar a personal
 */
export interface AssignmentAction extends BaseAction {
  type: 'assignment';
  assignmentType: 'auto_balance' | 'round_robin' | 'specific_user' | 'by_skill';
  specificUserId?: string;
  requiredSkills?: string[];
  preferredDepartment?: string;
}

/**
 * Crear tarea relacionada
 */
export interface TaskCreationAction extends BaseAction {
  type: 'task_creation';
  taskTemplate: {
    titleTemplate: string;
    descriptionTemplate: string;
    priority: Priority;
    dueDateOffset: {
      value: number;
      unit: 'hours' | 'days';
    };
    assignmentType: 'inherit' | 'specific' | 'auto';
    specificAssigneeId?: string;
  };
}

/**
 * Actualizar datos de entidad
 */
export interface DataUpdateAction extends BaseAction {
  type: 'data_update';
  updates: Array<{
    field: string;
    value: unknown;
    operation: 'set' | 'increment' | 'decrement' | 'append' | 'remove';
  }>;
}

/**
 * Llamar webhook externo
 */
export interface WebhookAction extends BaseAction {
  type: 'webhook';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  bodyTemplate?: string;
  expectedStatusCodes: number[];
}

/**
 * Enviar email personalizado
 */
export interface EmailAction extends BaseAction {
  type: 'email';
  templateId: string;
  toAddresses: string[];           // Pueden ser templates: {{entity.email}}
  ccAddresses?: string[];
  attachments?: Array<{
    type: 'document' | 'report';
    documentId?: string;
    reportType?: string;
  }>;
}

/**
 * Generar reporte
 */
export interface ReportAction extends BaseAction {
  type: 'report';
  reportType: ReportType;
  format: 'pdf' | 'excel' | 'csv';
  delivery: {
    method: 'email' | 'storage' | 'both';
    recipients?: string[];
    storagePath?: string;
  };
  parameters?: Record<string, unknown>;
}

/**
 * Archivar datos
 */
export interface ArchiveAction extends BaseAction {
  type: 'archive';
  archiveType: 'soft_delete' | 'move_to_archive' | 'export_and_delete';
  retentionDays?: number;
}

/**
 * Escalar a supervisor
 */
export interface EscalationAction extends BaseAction {
  type: 'escalation';
  escalationLevel: number;
  escalateTo: 'supervisor' | 'building_admin' | 'super_admin' | 'specific_user';
  specificUserId?: string;
  escalationReason: string;
  includeHistory: boolean;
}

export type ReportType = 
  | 'daily_summary'
  | 'weekly_financial'
  | 'monthly_financial'
  | 'maintenance_metrics'
  | 'access_log'
  | 'reservation_usage'
  | 'payment_status'
  | 'delinquency_report'
  | 'staff_performance'
  | 'anomaly_report';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: EJECUCIÓN Y LOGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registro de cada ejecución de automatización
 */
export interface AutomationExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  buildingId: string;
  
  // Trigger que disparó
  triggeredBy: {
    type: 'event' | 'schedule' | 'threshold' | 'manual';
    event?: SystemEvent;
    schedule?: string;
    threshold?: string;
    userId?: string;              // Si fue manual
  };
  
  // Entidad que disparó (si aplica)
  sourceEntity?: {
    type: string;
    id: string;
    snapshot: Record<string, unknown>; // Estado al momento del trigger
  };
  
  // Evaluación de condiciones
  conditionsEvaluated: Array<{
    conditionId: string;
    field: string;
    operator: string;
    expectedValue: unknown;
    actualValue: unknown;
    result: boolean;
  }>;
  conditionsMet: boolean;
  
  // Ejecución de acciones
  actionsExecuted: ActionExecutionResult[];
  
  // Resultado
  status: 'success' | 'partial_success' | 'failure' | 'skipped';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  
  // Errores
  errors: AutomationError[];
  
  // Fallback
  fallbackExecuted: boolean;
  fallbackResults?: ActionExecutionResult[];
}

export interface ActionExecutionResult {
  actionId: string;
  actionType: string;
  status: 'success' | 'failure' | 'skipped';
  startedAt: string;
  completedAt: string;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
}

export interface AutomationError {
  timestamp: string;
  actionId?: string;
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: PLANTILLAS DE AUTOMATIZACIÓN PREDEFINIDAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Templates de automatizaciones comunes que se pueden instanciar
 */
export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  
  // Template de la regla
  ruleTemplate: Omit<AutomationRule, 'id' | 'buildingId' | 'executionCount' | 'lastExecutedAt' | 'lastSuccessAt' | 'lastFailureAt' | 'failureCount' | 'version' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;
  
  // Variables configurables
  configurableFields: ConfigurableField[];
  
  // Documentación
  useCases: string[];
  warnings: string[];
  requiredPermissions: string[];
}

export interface ConfigurableField {
  path: string;                    // Path en la regla (ej: "trigger.time")
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'time' | 'date';
  options?: Array<{ value: unknown; label: string }>;
  defaultValue: unknown;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: AUTOMATIZACIONES PREDEFINIDAS DEL SISTEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Automatizaciones que vienen activas por defecto
 */
export const DEFAULT_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // ACCESOS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'access_expiration_warning',
    name: 'Aviso de vencimiento de acceso',
    description: 'Notifica al propietario cuando un acceso está por vencer',
    category: 'access_management',
    ruleTemplate: {
      name: 'Aviso de vencimiento de acceso',
      description: 'Notifica 24 horas antes de que un acceso expire',
      isActive: true,
      priority: 10,
      trigger: {
        type: 'schedule',
        scheduleType: 'daily',
        time: '09:00',
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [
        {
          id: 'cond-1',
          field: 'entity.status',
          operator: 'equals',
          value: 'active',
          valueType: 'static',
        },
        {
          id: 'cond-2',
          field: 'entity.validUntil',
          operator: 'is_within_hours',
          value: 24,
          valueType: 'static',
        },
      ],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'notification',
          order: 1,
          notificationType: 'access_expiring',
          channels: ['in_app', 'email'],
          titleTemplate: 'Acceso próximo a vencer',
          messageTemplate: 'El acceso de {{entity.visitor.firstName}} {{entity.visitor.lastName}} vence mañana. Puedes renovarlo desde la app.',
          recipientType: 'entity_owner',
        } as NotificationAction,
      ],
      fallbackActions: [],
    },
    configurableFields: [
      {
        path: 'trigger.time',
        label: 'Hora de verificación',
        description: 'Hora del día para verificar vencimientos',
        type: 'time',
        defaultValue: '09:00',
      },
      {
        path: 'conditions.1.value',
        label: 'Horas de anticipación',
        description: 'Cuántas horas antes del vencimiento notificar',
        type: 'number',
        defaultValue: 24,
        validation: { min: 1, max: 168 },
      },
    ],
    useCases: [
      'Propietarios reciben aviso para renovar accesos de empleadas domésticas',
      'Evitar que visitas autorizadas queden sin acceso inesperadamente',
    ],
    warnings: [
      'Si se configura con muy poca anticipación, el propietario podría no alcanzar a renovar',
    ],
    requiredPermissions: ['access.read', 'notifications.write'],
  },

  {
    id: 'access_auto_expire',
    name: 'Expiración automática de accesos',
    description: 'Marca automáticamente como expirados los accesos vencidos',
    category: 'access_management',
    ruleTemplate: {
      name: 'Expiración automática de accesos',
      description: 'Ejecuta cada hora para marcar accesos vencidos',
      isActive: true,
      priority: 5,
      trigger: {
        type: 'schedule',
        scheduleType: 'cron',
        cronExpression: '0 * * * *', // Cada hora
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [
        {
          id: 'cond-1',
          field: 'entity.status',
          operator: 'in',
          value: ['active', 'approved'],
          valueType: 'static',
        },
        {
          id: 'cond-2',
          field: 'entity.validUntil',
          operator: 'is_before_date',
          value: 'now',
          valueType: 'dynamic',
        },
      ],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'status_change',
          order: 1,
          newStatus: 'expired',
          reason: 'Expiración automática por fecha de validez cumplida',
        } as StatusChangeAction,
        {
          id: 'action-2',
          type: 'notification',
          order: 2,
          notificationType: 'access_expired',
          channels: ['in_app'],
          titleTemplate: 'Acceso expirado',
          messageTemplate: 'El acceso de {{entity.visitor.firstName}} {{entity.visitor.lastName}} ha expirado.',
          recipientType: 'entity_owner',
        } as NotificationAction,
      ],
      fallbackActions: [
        {
          id: 'fallback-1',
          type: 'escalation',
          order: 1,
          escalationLevel: 1,
          escalateTo: 'building_admin',
          escalationReason: 'No se pudo procesar expiración automática de acceso',
          includeHistory: true,
        } as EscalationAction,
      ],
    },
    configurableFields: [],
    useCases: [
      'Mantener la base de datos de accesos actualizada',
      'Garantizar que accesos vencidos no permitan entrada',
    ],
    warnings: [],
    requiredPermissions: ['access.read', 'access.write', 'notifications.write'],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGOS Y COBRANZA
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'payment_reminder_before_due',
    name: 'Recordatorio de pago antes de vencimiento',
    description: 'Envía recordatorio de pago días antes del vencimiento',
    category: 'payment_collection',
    ruleTemplate: {
      name: 'Recordatorio de pago pre-vencimiento',
      description: 'Notifica a unidades con pagos pendientes antes del vencimiento',
      isActive: true,
      priority: 10,
      trigger: {
        type: 'schedule',
        scheduleType: 'daily',
        time: '10:00',
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [
        {
          id: 'cond-1',
          field: 'entity.status',
          operator: 'in',
          value: ['issued', 'partially_paid'],
          valueType: 'static',
        },
        {
          id: 'cond-2',
          field: 'entity.dueDate',
          operator: 'days_until',
          value: 5,
          valueType: 'static',
        },
      ],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'notification',
          order: 1,
          notificationType: 'payment_reminder',
          channels: ['in_app', 'email'],
          titleTemplate: 'Recordatorio de pago',
          messageTemplate: 'Tu estado de cuenta de {{entity.period}} vence el {{entity.dueDate}}. Monto pendiente: ${{entity.remainingAmount}}',
          recipientType: 'unit_residents',
        } as NotificationAction,
      ],
      fallbackActions: [],
    },
    configurableFields: [
      {
        path: 'conditions.1.value',
        label: 'Días de anticipación',
        description: 'Cuántos días antes del vencimiento enviar el recordatorio',
        type: 'number',
        defaultValue: 5,
        validation: { min: 1, max: 30 },
      },
    ],
    useCases: [
      'Reducir morosidad recordando a tiempo',
      'Mejorar flujo de caja del edificio',
    ],
    warnings: [
      'Muchos recordatorios pueden ser molestos para residentes puntuales',
    ],
    requiredPermissions: ['expenses.read', 'notifications.write'],
  },

  {
    id: 'payment_overdue_escalation',
    name: 'Escalamiento de pagos vencidos',
    description: 'Aplica recargos y notifica cuando un pago está vencido',
    category: 'payment_collection',
    ruleTemplate: {
      name: 'Procesamiento de pagos vencidos',
      description: 'Marca como vencido y aplica recargo después del período de gracia',
      isActive: true,
      priority: 5,
      trigger: {
        type: 'schedule',
        scheduleType: 'daily',
        time: '00:01',
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [
        {
          id: 'cond-1',
          field: 'entity.status',
          operator: 'in',
          value: ['issued', 'partially_paid'],
          valueType: 'static',
        },
        {
          id: 'cond-2',
          field: 'entity.dueDate',
          operator: 'days_since',
          value: 5, // Días de gracia
          valueType: 'static',
        },
      ],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'status_change',
          order: 1,
          newStatus: 'overdue',
          reason: 'Vencimiento de plazo de pago más período de gracia',
        } as StatusChangeAction,
        {
          id: 'action-2',
          type: 'data_update',
          order: 2,
          updates: [
            {
              field: 'lateFee',
              value: '{{entity.total * 0.05}}', // 5% recargo
              operation: 'set',
            },
            {
              field: 'total',
              value: '{{entity.total * 1.05}}',
              operation: 'set',
            },
          ],
        } as DataUpdateAction,
        {
          id: 'action-3',
          type: 'notification',
          order: 3,
          notificationType: 'payment_overdue',
          channels: ['in_app', 'email', 'sms'],
          titleTemplate: 'Pago vencido - Recargo aplicado',
          messageTemplate: 'Tu pago de {{entity.period}} está vencido. Se ha aplicado un recargo de ${{entity.lateFee}}. Nuevo total: ${{entity.total}}',
          recipientType: 'unit_residents',
        } as NotificationAction,
      ],
      fallbackActions: [],
    },
    configurableFields: [
      {
        path: 'conditions.1.value',
        label: 'Días de gracia',
        description: 'Días después del vencimiento antes de aplicar recargo',
        type: 'number',
        defaultValue: 5,
        validation: { min: 0, max: 30 },
      },
    ],
    useCases: [
      'Aplicar recargos automáticamente según política del edificio',
      'Mantener consistencia en la gestión de morosidad',
    ],
    warnings: [
      'Verificar que el porcentaje de recargo cumple con regulaciones locales',
    ],
    requiredPermissions: ['expenses.read', 'expenses.write', 'notifications.write'],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RESERVAS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'reservation_reminder',
    name: 'Recordatorio de reserva próxima',
    description: 'Notifica al residente antes de su reserva',
    category: 'reservation_management',
    ruleTemplate: {
      name: 'Recordatorio de reserva',
      description: 'Envía recordatorio 24 horas antes de la reserva',
      isActive: true,
      priority: 10,
      trigger: {
        type: 'schedule',
        scheduleType: 'daily',
        time: '09:00',
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [
        {
          id: 'cond-1',
          field: 'entity.status',
          operator: 'equals',
          value: 'confirmed',
          valueType: 'static',
        },
        {
          id: 'cond-2',
          field: 'entity.date',
          operator: 'days_until',
          value: 1,
          valueType: 'static',
        },
      ],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'notification',
          order: 1,
          notificationType: 'reservation_reminder',
          channels: ['in_app', 'push'],
          titleTemplate: 'Recordatorio: {{entity.amenityName}} mañana',
          messageTemplate: 'Tu reserva de {{entity.amenityName}} es mañana a las {{entity.startTime}}. ¡No olvides!',
          recipientType: 'entity_owner',
        } as NotificationAction,
        {
          id: 'action-2',
          type: 'task_creation',
          order: 2,
          taskTemplate: {
            titleTemplate: 'Preparar {{entity.amenityName}} para reserva',
            descriptionTemplate: 'Reserva de {{entity.userName}} - {{entity.guestCount}} personas - {{entity.date}} {{entity.startTime}}',
            priority: 'medium',
            dueDateOffset: { value: 2, unit: 'hours' },
            assignmentType: 'auto',
          },
        } as TaskCreationAction,
      ],
      fallbackActions: [],
    },
    configurableFields: [],
    useCases: [
      'Reducir no-shows recordando a los residentes',
      'Preparar amenidades con anticipación',
    ],
    warnings: [],
    requiredPermissions: ['reservations.read', 'notifications.write', 'tasks.write'],
  },

  {
    id: 'reservation_no_show_handling',
    name: 'Manejo de no-show en reservas',
    description: 'Marca y registra cuando un residente no se presenta',
    category: 'reservation_management',
    ruleTemplate: {
      name: 'Detección de no-show',
      description: 'Marca reservas sin check-in como no-show',
      isActive: true,
      priority: 5,
      trigger: {
        type: 'schedule',
        scheduleType: 'cron',
        cronExpression: '*/30 * * * *', // Cada 30 minutos
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [
        {
          id: 'cond-1',
          field: 'entity.status',
          operator: 'equals',
          value: 'confirmed',
          valueType: 'static',
        },
        {
          id: 'cond-2',
          field: 'entity.checkedInAt',
          operator: 'is_null',
          value: null,
          valueType: 'static',
        },
        {
          id: 'cond-3',
          field: 'combinedDateTime',
          operator: 'is_before_date',
          value: '-30 minutes',
          valueType: 'relative_date',
          relativeDateConfig: {
            unit: 'minutes',
            value: 30,
            direction: 'past',
          },
        },
      ],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'status_change',
          order: 1,
          newStatus: 'no_show',
          reason: 'No se registró check-in dentro de los 30 minutos posteriores al inicio',
        } as StatusChangeAction,
        {
          id: 'action-2',
          type: 'notification',
          order: 2,
          notificationType: 'reservation_reminder',
          channels: ['in_app'],
          titleTemplate: 'Reserva marcada como no-show',
          messageTemplate: 'Tu reserva de {{entity.amenityName}} fue marcada como no-show. Si esto es un error, contacta a administración.',
          recipientType: 'entity_owner',
        } as NotificationAction,
      ],
      fallbackActions: [],
    },
    configurableFields: [],
    useCases: [
      'Liberar amenidades para otros residentes',
      'Llevar registro de no-shows por residente',
    ],
    warnings: [
      'Considerar política de penalización por no-shows recurrentes',
    ],
    requiredPermissions: ['reservations.read', 'reservations.write', 'notifications.write'],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MANTENIMIENTO
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'maintenance_auto_assignment',
    name: 'Asignación automática de mantenimiento',
    description: 'Asigna solicitudes de mantenimiento al personal disponible',
    category: 'maintenance_workflow',
    ruleTemplate: {
      name: 'Auto-asignación de mantenimiento',
      description: 'Asigna automáticamente según disponibilidad y skills',
      isActive: true,
      priority: 10,
      trigger: {
        type: 'event',
        eventType: 'maintenance.created',
      } as EventTrigger,
      conditions: [
        {
          id: 'cond-1',
          field: 'entity.status',
          operator: 'equals',
          value: 'open',
          valueType: 'static',
        },
        {
          id: 'cond-2',
          field: 'entity.assignedTo',
          operator: 'is_null',
          value: null,
          valueType: 'static',
        },
      ],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'assignment',
          order: 1,
          assignmentType: 'by_skill',
          preferredDepartment: 'maintenance',
        } as AssignmentAction,
        {
          id: 'action-2',
          type: 'notification',
          order: 2,
          delayMinutes: 1,
          notificationType: 'task_assigned',
          channels: ['in_app', 'push'],
          titleTemplate: 'Nueva tarea asignada',
          messageTemplate: 'Se te asignó: {{entity.title}} en {{entity.location}}. Prioridad: {{entity.priority}}',
          recipientType: 'assigned_staff',
        } as NotificationAction,
      ],
      fallbackActions: [
        {
          id: 'fallback-1',
          type: 'notification',
          order: 1,
          notificationType: 'task_assigned',
          channels: ['in_app', 'email'],
          titleTemplate: 'Solicitud sin asignar',
          messageTemplate: 'Hay una solicitud de mantenimiento sin personal disponible: {{entity.title}}',
          recipientType: 'building_admins',
        } as NotificationAction,
      ],
    },
    configurableFields: [],
    useCases: [
      'Reducir tiempo de respuesta a solicitudes',
      'Distribuir carga de trabajo equitativamente',
    ],
    warnings: [
      'Requiere que el personal tenga skills configurados',
    ],
    requiredPermissions: ['maintenance.read', 'maintenance.assign', 'notifications.write'],
  },

  {
    id: 'maintenance_escalation',
    name: 'Escalamiento de mantenimiento crítico',
    description: 'Escala automáticamente solicitudes críticas sin atender',
    category: 'maintenance_workflow',
    ruleTemplate: {
      name: 'Escalamiento de mantenimiento',
      description: 'Escala solicitudes críticas sin iniciar después de 2 horas',
      isActive: true,
      priority: 5,
      trigger: {
        type: 'schedule',
        scheduleType: 'cron',
        cronExpression: '*/15 * * * *', // Cada 15 minutos
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [
        {
          id: 'cond-1',
          field: 'entity.priority',
          operator: 'equals',
          value: 'critical',
          valueType: 'static',
        },
        {
          id: 'cond-2',
          field: 'entity.status',
          operator: 'in',
          value: ['open', 'assigned'],
          valueType: 'static',
        },
        {
          id: 'cond-3',
          field: 'entity.createdAt',
          operator: 'days_since',
          value: 0.083, // ~2 horas
          valueType: 'static',
        },
      ],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'escalation',
          order: 1,
          escalationLevel: 1,
          escalateTo: 'supervisor',
          escalationReason: 'Solicitud crítica sin atender por más de 2 horas',
          includeHistory: true,
        } as EscalationAction,
        {
          id: 'action-2',
          type: 'notification',
          order: 2,
          notificationType: 'maintenance_update',
          channels: ['in_app', 'push', 'sms'],
          titleTemplate: '⚠️ Escalamiento de emergencia',
          messageTemplate: 'Solicitud crítica escalada: {{entity.title}}. Requiere atención inmediata.',
          recipientType: 'building_admins',
        } as NotificationAction,
      ],
      fallbackActions: [],
    },
    configurableFields: [
      {
        path: 'conditions.2.value',
        label: 'Horas antes de escalar',
        description: 'Tiempo sin atender antes de escalar',
        type: 'number',
        defaultValue: 2,
        validation: { min: 0.5, max: 24 },
      },
    ],
    useCases: [
      'Garantizar atención rápida a emergencias',
      'Notificar a supervisores de problemas críticos',
    ],
    warnings: [
      'Puede generar muchas notificaciones si hay problemas de staffing',
    ],
    requiredPermissions: ['maintenance.read', 'notifications.write'],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORTES Y OPERACIONES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'daily_operations_report',
    name: 'Reporte diario de operaciones',
    description: 'Genera y envía resumen diario a administradores',
    category: 'reporting',
    ruleTemplate: {
      name: 'Reporte diario',
      description: 'Genera resumen de operaciones del día',
      isActive: true,
      priority: 50,
      trigger: {
        type: 'schedule',
        scheduleType: 'daily',
        time: '23:00',
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'report',
          order: 1,
          reportType: 'daily_summary',
          format: 'pdf',
          delivery: {
            method: 'both',
            storagePath: '/reports/daily/',
          },
        } as ReportAction,
        {
          id: 'action-2',
          type: 'email',
          order: 2,
          templateId: 'daily_report_email',
          toAddresses: ['{{building.adminEmail}}'],
          attachments: [
            {
              type: 'report',
              reportType: 'daily_summary',
            },
          ],
        } as EmailAction,
      ],
      fallbackActions: [],
    },
    configurableFields: [
      {
        path: 'trigger.time',
        label: 'Hora de generación',
        description: 'Hora para generar el reporte diario',
        type: 'time',
        defaultValue: '23:00',
      },
    ],
    useCases: [
      'Mantener a administración informada',
      'Documentar operaciones diarias',
    ],
    warnings: [],
    requiredPermissions: ['reports.view', 'reports.export'],
  },

  {
    id: 'monthly_period_close',
    name: 'Cierre de período mensual',
    description: 'Cierra el período y genera estados de cuenta',
    category: 'financial_operations',
    ruleTemplate: {
      name: 'Cierre mensual automático',
      description: 'Ejecuta el cierre de período el primer día del mes',
      isActive: true,
      priority: 5,
      trigger: {
        type: 'schedule',
        scheduleType: 'monthly',
        dayOfMonth: 1,
        time: '01:00',
        timezone: 'America/Montevideo',
      } as ScheduleTrigger,
      conditions: [],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'report',
          order: 1,
          reportType: 'monthly_financial',
          format: 'excel',
          delivery: {
            method: 'storage',
            storagePath: '/reports/monthly/',
          },
        } as ReportAction,
        {
          id: 'action-2',
          type: 'notification',
          order: 2,
          notificationType: 'document_available',
          channels: ['in_app', 'email'],
          titleTemplate: 'Nuevo estado de cuenta disponible',
          messageTemplate: 'Tu estado de cuenta de {{previousMonth}} ya está disponible. Fecha de vencimiento: {{dueDate}}',
          recipientType: 'all_owners',
        } as NotificationAction,
      ],
      fallbackActions: [
        {
          id: 'fallback-1',
          type: 'escalation',
          order: 1,
          escalationLevel: 2,
          escalateTo: 'super_admin',
          escalationReason: 'Error en cierre de período mensual',
          includeHistory: true,
        } as EscalationAction,
      ],
    },
    configurableFields: [
      {
        path: 'trigger.dayOfMonth',
        label: 'Día de cierre',
        description: 'Día del mes para ejecutar el cierre',
        type: 'number',
        defaultValue: 1,
        validation: { min: 1, max: 28 },
      },
    ],
    useCases: [
      'Automatizar el proceso de facturación',
      'Garantizar consistencia en fechas de cierre',
    ],
    warnings: [
      'Requiere que todos los movimientos del mes estén registrados antes del cierre',
    ],
    requiredPermissions: ['expenses.write', 'expenses.close_period', 'reports.export'],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // DETECCIÓN DE ANOMALÍAS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'anomaly_high_visitor_count',
    name: 'Alerta de alto volumen de visitantes',
    description: 'Alerta cuando el número de visitantes supera el umbral',
    category: 'anomaly_detection',
    ruleTemplate: {
      name: 'Alerta de visitantes',
      description: 'Detecta volumen inusual de visitantes',
      isActive: true,
      priority: 10,
      trigger: {
        type: 'threshold',
        metric: 'visitor_count_today',
        operator: 'gte',
        value: 50,
        checkIntervalMinutes: 30,
      } as ThresholdTrigger,
      conditions: [],
      conditionOperator: 'AND',
      actions: [
        {
          id: 'action-1',
          type: 'notification',
          order: 1,
          notificationType: 'announcement',
          channels: ['in_app', 'push'],
          titleTemplate: '📊 Alto volumen de visitantes',
          messageTemplate: 'Se detectaron {{currentValue}} visitantes hoy, superando el umbral de {{threshold}}. Verificar capacidad de recepción.',
          recipientType: 'building_admins',
        } as NotificationAction,
      ],
      fallbackActions: [],
      maxExecutionsPerDay: 3,
      cooldownMinutes: 120,
    },
    configurableFields: [
      {
        path: 'trigger.value',
        label: 'Umbral de visitantes',
        description: 'Número de visitantes que dispara la alerta',
        type: 'number',
        defaultValue: 50,
        validation: { min: 10, max: 500 },
      },
    ],
    useCases: [
      'Detectar eventos no autorizados',
      'Preparar recursos adicionales en recepción',
    ],
    warnings: [
      'Ajustar umbral según el tamaño del edificio',
    ],
    requiredPermissions: ['visitors.read', 'notifications.write'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  AutomationRule,
  AutomationCategory,
  AutomationTrigger,
  EventTrigger,
  ScheduleTrigger,
  ThresholdTrigger,
  ManualTrigger,
  SystemEvent,
  ScheduleType,
  ThresholdMetric,
  AutomationCondition,
  ConditionOperator,
  AutomationAction,
  NotificationAction,
  StatusChangeAction,
  AssignmentAction,
  TaskCreationAction,
  DataUpdateAction,
  WebhookAction,
  EmailAction,
  ReportAction,
  ArchiveAction,
  EscalationAction,
  ReportType,
  AutomationExecution,
  ActionExecutionResult,
  AutomationError,
  AutomationTemplate,
  ConfigurableField,
};
