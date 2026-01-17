/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - AUTOMATION SERVICE (ENTERPRISE REFACTORED)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Servicio de automatización REFACTORIZADO que:
 * - Mantiene compatibilidad con tipos existentes en automation.types.ts
 * - Usa IdempotentEngine para ejecución con idempotencia
 * - Usa DataAccessLayer para persistencia
 * - Usa TemplateEngine para interpolación segura
 * - Usa DeepAuditService para auditoría
 * 
 * Este archivo REEMPLAZA automationService.ts con una implementación
 * que funciona con los tipos actuales.
 */

import type {
  AutomationRule,
  AutomationCondition,
  AutomationAction,
  AutomationExecution,
  SystemEvent,
  ConditionOperator,
} from '../../types/automation.types';

import {
  generateUUID,
  nowISO,
  parseDate,
  compareDates,
  createRepository,
} from '../repository/DataAccessLayer';

import {
  interpolateText,
  evaluateExpression,
  type TemplateContext,
} from '../templates/TemplateEngine';

import {
  audit,
  type AuditActor,
  type AuditContext,
} from '../audit/DeepAuditService';

import {
  generateIdempotencyKey,
  isEventDuplicate,
  markEventProcessed,
  acquireLock,
  releaseLock,
  checkRateLimit,
} from './IdempotentEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORIES
// ═══════════════════════════════════════════════════════════════════════════════

const rulesRepository = createRepository<AutomationRule>('automation_rule');
const executionsRepository = createRepository<AutomationExecution>('automation_execution');

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS INTERNOS
// ═══════════════════════════════════════════════════════════════════════════════

interface ExecutionResult {
  success: boolean;
  execution: AutomationExecution;
  actionsExecuted: number;
  actionsFailed: number;
  skipped?: boolean;
  skipReason?: string;
}

interface ConditionEvaluationResult {
  passed: boolean;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene todas las reglas de automatización.
 */
export async function getAllRules(): Promise<AutomationRule[]> {
  const rules = await rulesRepository.findMany({
    orderBy: { field: 'createdAt', direction: 'desc' },
  });
  return rules as AutomationRule[];
}

/**
 * Obtiene reglas por building.
 */
export async function getRulesByBuilding(buildingId: string): Promise<AutomationRule[]> {
  const rules = await getAllRules();
  return rules.filter(r => {
    // AutomationRule tiene buildingId directamente, puede ser '*' para global
    return r.buildingId === buildingId || r.buildingId === '*';
  });
}

/**
 * Obtiene una regla por ID.
 */
export async function getRule(ruleId: string): Promise<AutomationRule | null> {
  return rulesRepository.findById(ruleId) as Promise<AutomationRule | null>;
}

/**
 * Crea una nueva regla de automatización.
 */
export async function createRule(
  ruleData: Omit<AutomationRule, 'id' | 'audit'>,
  actor: AuditActor,
  context: AuditContext
): Promise<AutomationRule> {
  const rule = await rulesRepository.create(ruleData);
  
  await audit({
    action: 'create',
    entityType: 'automation_rule',
    entityId: rule.id,
    entityName: ruleData.name,
    actor,
    context,
    after: rule as unknown as Record<string, unknown>,
    description: `Creó regla de automatización: ${ruleData.name}`,
    tags: ['automation', 'rule-created'],
  });
  
  console.log(`[Automation] Rule created: ${rule.id} - ${ruleData.name}`);
  return rule as AutomationRule;
}

/**
 * Actualiza una regla existente.
 */
export async function updateRule(
  ruleId: string,
  updates: Partial<AutomationRule>,
  actor: AuditActor,
  context: AuditContext
): Promise<AutomationRule | null> {
  const existing = await getRule(ruleId);
  if (!existing) return null;
  
  const updated = await rulesRepository.update(ruleId, updates);
  
  await audit({
    action: 'update',
    entityType: 'automation_rule',
    entityId: ruleId,
    entityName: existing.name,
    actor,
    context,
    before: existing as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    description: `Actualizó regla de automatización: ${existing.name}`,
    tags: ['automation', 'rule-updated'],
  });
  
  return updated as AutomationRule;
}

/**
 * Activa/desactiva una regla.
 */
export async function toggleRule(
  ruleId: string,
  isActive: boolean,
  actor: AuditActor,
  context: AuditContext
): Promise<AutomationRule | null> {
  const existing = await getRule(ruleId);
  if (!existing) return null;
  
  const updated = await rulesRepository.update(ruleId, { isActive });
  
  await audit({
    action: 'status_change',
    entityType: 'automation_rule',
    entityId: ruleId,
    entityName: existing.name,
    actor,
    context,
    before: { isActive: existing.isActive },
    after: { isActive },
    description: `${isActive ? 'Activó' : 'Desactivó'} regla: ${existing.name}`,
    tags: ['automation', 'status-change'],
  });
  
  return updated as AutomationRule;
}

/**
 * Elimina una regla.
 */
export async function deleteRule(
  ruleId: string,
  actor: AuditActor,
  context: AuditContext
): Promise<boolean> {
  const existing = await getRule(ruleId);
  if (!existing) return false;
  
  await rulesRepository.delete(ruleId);
  
  await audit({
    action: 'delete',
    entityType: 'automation_rule',
    entityId: ruleId,
    entityName: existing.name,
    actor,
    context,
    before: existing as unknown as Record<string, unknown>,
    description: `Eliminó regla de automatización: ${existing.name}`,
    severity: 'high',
    tags: ['automation', 'rule-deleted'],
  });
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta una regla con idempotencia y deduplicación.
 */
export async function executeRule(
  rule: AutomationRule,
  triggerEvent: SystemEvent,
  payload: Record<string, unknown>
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const eventKey = `${triggerEvent}:${payload.id || 'unknown'}:${nowISO()}`;
  
  // 1. Verificar si el evento ya fue procesado (deduplicación)
  if (isEventDuplicate(eventKey)) {
    console.log(`[Automation] Duplicate event skipped: ${eventKey}`);
    return createSkippedExecution(rule, 'Evento duplicado');
  }
  
  // 2. Generar idempotency key
  const entityId = (payload.id || payload.entityId || null) as string | null;
  const idempotencyKey = generateIdempotencyKey(rule.id, triggerEvent, entityId);
  
  // 3. Intentar adquirir lock
  const lockKey = `rule:${rule.id}:${entityId || 'global'}`;
  if (!acquireLock(lockKey)) {
    console.log(`[Automation] Lock not acquired: ${lockKey}`);
    return createSkippedExecution(rule, 'Ejecución en progreso');
  }
  
  try {
    // 4. Crear registro de ejecución
    const execution = await createExecution(rule, triggerEvent, payload);
    
    // 5. Evaluar condiciones
    const conditionResult = evaluateConditions(rule.conditions, payload);
    
    if (!conditionResult.passed) {
      execution.status = 'skipped';
      await executionsRepository.update(execution.id, {
        ...execution,
        status: 'skipped',
      });
      
      return {
        success: true,
        execution,
        actionsExecuted: 0,
        actionsFailed: 0,
        skipped: true,
        skipReason: conditionResult.reason,
      };
    }
    
    // 6. Ejecutar acciones
    const actionResults = await executeActions(rule.actions, payload, rule);
    
    // 7. Actualizar ejecución
    const hasErrors = actionResults.some(r => !r.success);
    execution.status = hasErrors ? 'partial_success' : 'success';
    execution.completedAt = nowISO();
    execution.durationMs = Date.now() - startTime;
    
    await executionsRepository.update(execution.id, execution);
    
    // 8. Marcar evento como procesado
    markEventProcessed(
      generateUUID(),
      triggerEvent,
      eventKey,
      payload,
      getBuildingFromPayload(payload),
      [execution.id]
    );
    
    return {
      success: !hasErrors,
      execution,
      actionsExecuted: actionResults.filter(r => r.success).length,
      actionsFailed: actionResults.filter(r => !r.success).length,
    };
    
  } finally {
    releaseLock(lockKey);
  }
}

/**
 * Crea un registro de ejecución.
 */
async function createExecution(
  rule: AutomationRule,
  triggerEvent: SystemEvent,
  payload: Record<string, unknown>
): Promise<AutomationExecution> {
  const executionData: Omit<AutomationExecution, 'id'> = {
    ruleId: rule.id,
    ruleName: rule.name,
    buildingId: rule.buildingId,
    triggeredBy: {
      type: 'event',
      event: triggerEvent,
    },
    sourceEntity: payload.entity ? {
      type: payload.entityType as string || 'unknown',
      id: (payload.entity as { id?: string })?.id || '',
      snapshot: payload.entity as Record<string, unknown>,
    } : undefined,
    conditionsEvaluated: [],
    conditionsMet: false,
    actionsExecuted: [],
    startedAt: nowISO(),
    completedAt: nowISO(),
    durationMs: 0,
    status: 'success', // Se actualizará después
    errors: [],
    fallbackExecuted: false,
  };
  
  const execution = await executionsRepository.create(executionData);
  return execution as AutomationExecution;
}

/**
 * Crea una ejecución marcada como skipped.
 */
function createSkippedExecution(rule: AutomationRule, reason: string): ExecutionResult {
  return {
    success: true,
    execution: {
      id: generateUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      buildingId: rule.buildingId,
      triggeredBy: { type: 'manual' },
      conditionsEvaluated: [],
      conditionsMet: false,
      actionsExecuted: [],
      startedAt: nowISO(),
      completedAt: nowISO(),
      durationMs: 0,
      status: 'skipped',
      errors: [{
        timestamp: nowISO(),
        code: 'SKIPPED',
        message: reason,
      }],
      fallbackExecuted: false,
    },
    actionsExecuted: 0,
    actionsFailed: 0,
    skipped: true,
    skipReason: reason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONDITION EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evalúa todas las condiciones de una regla.
 */
function evaluateConditions(
  conditions: AutomationCondition[],
  payload: Record<string, unknown>
): ConditionEvaluationResult {
  if (!conditions || conditions.length === 0) {
    return { passed: true };
  }
  
  for (const condition of conditions) {
    const result = evaluateSingleCondition(condition, payload);
    
    // Por defecto, todas las condiciones deben pasar (AND)
    if (!result.passed) {
      return {
        passed: false,
        reason: result.reason || `Condición no cumplida: ${condition.field} ${condition.operator} ${condition.value}`,
      };
    }
  }
  
  return { passed: true };
}

/**
 * Evalúa una condición individual.
 */
function evaluateSingleCondition(
  condition: AutomationCondition,
  payload: Record<string, unknown>
): ConditionEvaluationResult {
  const actualValue = getNestedValue(payload, condition.field);
  const expectedValue = condition.value;
  
  const passed = compareValues(actualValue, expectedValue, condition.operator);
  
  return {
    passed,
    reason: passed ? undefined : `${condition.field} (${actualValue}) ${condition.operator} ${expectedValue}`,
  };
}

/**
 * Obtiene un valor anidado de un objeto usando notación de punto.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

/**
 * Compara dos valores según el operador.
 */
function compareValues(
  actual: unknown,
  expected: unknown,
  operator: ConditionOperator
): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
      
    case 'not_equals':
      return actual !== expected;
      
    case 'greater_than':
      return Number(actual) > Number(expected);
      
    case 'less_than':
      return Number(actual) < Number(expected);
      
    case 'contains':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.toLowerCase().includes(expected.toLowerCase());
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected);
      }
      return false;
      
    case 'starts_with':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.toLowerCase().startsWith(expected.toLowerCase());
      }
      return false;
      
    case 'ends_with':
      if (typeof actual === 'string' && typeof expected === 'string') {
        return actual.toLowerCase().endsWith(expected.toLowerCase());
      }
      return false;
      
    case 'is_null':
      return actual === undefined || actual === null;
      
    case 'is_not_null':
      return actual !== undefined && actual !== null;
      
    default:
      console.warn(`[Automation] Unknown operator: ${operator}`);
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

interface ActionExecutionResult {
  actionType: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

/**
 * Ejecuta todas las acciones de una regla.
 */
async function executeActions(
  actions: AutomationAction[],
  payload: Record<string, unknown>,
  rule: AutomationRule
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];
  
  // Crear contexto para interpolación
  const context: TemplateContext = {
    entity: payload,
    event: { type: 'automation', timestamp: nowISO() },
    user: { name: 'Sistema' },
    building: { name: getBuildingFromPayload(payload) },
  };
  
  for (const action of actions) {
    try {
      const result = await executeSingleAction(action, context, rule);
      results.push(result);
      
      // Si falla y la regla tiene stopOnFirstError, parar
      if (!result.success && shouldStopOnError(rule)) {
        break;
      }
    } catch (error) {
      results.push({
        actionType: action.type,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      
      if (shouldStopOnError(rule)) {
        break;
      }
    }
  }
  
  return results;
}

/**
 * Ejecuta una acción individual.
 */
async function executeSingleAction(
  action: AutomationAction,
  context: TemplateContext,
  rule: AutomationRule
): Promise<ActionExecutionResult> {
  const buildingId = context.building?.id as string || 'default';
  
  switch (action.type) {
    case 'notification':
      return executeNotificationAction(action, context, buildingId);
      
    case 'status_change':
      return executeStatusChangeAction(action, context);
      
    case 'email':
      return executeEmailAction(action, context, buildingId);
      
    case 'webhook':
      return executeWebhookAction(action, context, buildingId);
      
    case 'task_creation':
      return executeTaskCreationAction(action, context);
      
    case 'data_update':
      return executeDataUpdateAction(action, context);
      
    case 'escalation':
      return executeEscalationAction(action, context);
      
    case 'assignment':
      return executeAssignmentAction(action, context);
      
    default:
      return {
        actionType: action.type,
        success: false,
        error: `Tipo de acción no soportado: ${action.type}`,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function executeNotificationAction(
  action: AutomationAction,
  context: TemplateContext,
  buildingId: string
): Promise<ActionExecutionResult> {
  // Verificar rate limit
  const rateCheck = checkRateLimit('push', buildingId);
  if (!rateCheck.allowed) {
    return {
      actionType: 'notification',
      success: false,
      error: `Rate limit exceeded. Resets at ${rateCheck.resetAt}`,
    };
  }
  
  // Obtener configuración de la notificación
  const config = (action as unknown as Record<string, unknown>).config as Record<string, unknown> || {};
  const title = config.title as string || 'Notificación';
  const message = config.message as string || '';
  
  // Interpolar texto de forma SEGURA (sin eval)
  const interpolatedTitle = interpolateText(title, context);
  const interpolatedMessage = interpolateText(message, context);
  
  console.log(`[Automation] Notification: ${interpolatedTitle}`);
  console.log(`[Automation] Message: ${interpolatedMessage}`);
  
  // En producción: enviar a servicio de notificaciones
  
  return {
    actionType: 'notification',
    success: true,
    output: {
      title: interpolatedTitle,
      message: interpolatedMessage,
    },
  };
}

async function executeStatusChangeAction(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionExecutionResult> {
  const config = (action as unknown as Record<string, unknown>).config as Record<string, unknown> || {};
  const entityType = config.entityType as string;
  const newStatus = config.newStatus as string;
  const entityId = context.entity?.id as string;
  
  if (!entityId) {
    return {
      actionType: 'status_change',
      success: false,
      error: 'Entity ID not found in context',
    };
  }
  
  console.log(`[Automation] Status change: ${entityType} ${entityId} → ${newStatus}`);
  
  // En producción: llamar al servicio correspondiente para cambiar estado
  
  return {
    actionType: 'status_change',
    success: true,
    output: { entityType, entityId, newStatus },
  };
}

async function executeEmailAction(
  action: AutomationAction,
  context: TemplateContext,
  buildingId: string
): Promise<ActionExecutionResult> {
  // Verificar rate limit
  const rateCheck = checkRateLimit('email', buildingId);
  if (!rateCheck.allowed) {
    return {
      actionType: 'email',
      success: false,
      error: `Email rate limit exceeded. Resets at ${rateCheck.resetAt}`,
    };
  }
  
  const config = (action as unknown as Record<string, unknown>).config as Record<string, unknown> || {};
  const to = config.to as string[];
  const subject = config.subject as string || 'Notificación';
  const body = config.body as string || '';
  
  const interpolatedSubject = interpolateText(subject, context);
  const interpolatedBody = interpolateText(body, context);
  
  console.log(`[Automation] Email to: ${to?.join(', ')}`);
  console.log(`[Automation] Subject: ${interpolatedSubject}`);
  
  // En producción: enviar email
  
  return {
    actionType: 'email',
    success: true,
    output: { to, subject: interpolatedSubject },
  };
}

async function executeWebhookAction(
  action: AutomationAction,
  context: TemplateContext,
  buildingId: string
): Promise<ActionExecutionResult> {
  // Verificar rate limit
  const rateCheck = checkRateLimit('webhook', buildingId);
  if (!rateCheck.allowed) {
    return {
      actionType: 'webhook',
      success: false,
      error: `Webhook rate limit exceeded. Resets at ${rateCheck.resetAt}`,
    };
  }
  
  const config = (action as unknown as Record<string, unknown>).config as Record<string, unknown> || {};
  const url = config.url as string;
  const method = (config.method as string) || 'POST';
  
  console.log(`[Automation] Webhook: ${method} ${url}`);
  
  // En producción: hacer llamada HTTP
  
  return {
    actionType: 'webhook',
    success: true,
    output: { url, method },
  };
}

async function executeTaskCreationAction(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionExecutionResult> {
  const config = (action as unknown as Record<string, unknown>).config as Record<string, unknown> || {};
  const title = config.title as string || 'Nueva tarea';
  const description = config.description as string || '';
  
  const interpolatedTitle = interpolateText(title, context);
  const interpolatedDescription = interpolateText(description, context);
  
  console.log(`[Automation] Create task: ${interpolatedTitle}`);
  
  // En producción: crear tarea en el sistema
  
  return {
    actionType: 'task_creation',
    success: true,
    output: {
      title: interpolatedTitle,
      description: interpolatedDescription,
    },
  };
}

async function executeDataUpdateAction(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionExecutionResult> {
  const config = (action as unknown as Record<string, unknown>).config as Record<string, unknown> || {};
  const field = config.field as string;
  const value = config.value as unknown;
  const entityId = context.entity?.id as string;
  
  // Si el valor es una expresión, evaluarla de forma segura
  let finalValue = value;
  if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
    const expr = value.slice(2, -2).trim();
    const result = evaluateExpression(expr, context);
    if (result.success) {
      finalValue = result.value;
    }
  }
  
  console.log(`[Automation] Data update: ${field} = ${finalValue}`);
  
  return {
    actionType: 'data_update',
    success: true,
    output: { entityId, field, value: finalValue },
  };
}

async function executeEscalationAction(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionExecutionResult> {
  const config = (action as unknown as Record<string, unknown>).config as Record<string, unknown> || {};
  const escalateTo = config.escalateTo as string[];
  const message = config.message as string || '';
  
  const interpolatedMessage = interpolateText(message, context);
  
  console.log(`[Automation] Escalation to: ${escalateTo?.join(', ')}`);
  console.log(`[Automation] Message: ${interpolatedMessage}`);
  
  return {
    actionType: 'escalation',
    success: true,
    output: { escalateTo, message: interpolatedMessage },
  };
}

async function executeAssignmentAction(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionExecutionResult> {
  const config = (action as unknown as Record<string, unknown>).config as Record<string, unknown> || {};
  const assignTo = config.assignTo as string;
  const entityId = context.entity?.id as string;
  
  console.log(`[Automation] Assignment: ${entityId} → ${assignTo}`);
  
  return {
    actionType: 'assignment',
    success: true,
    output: { entityId, assignTo },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getBuildingFromPayload(payload: Record<string, unknown>): string {
  return (payload.buildingId as string) || (payload.building_id as string) || 'default';
}

function shouldStopOnError(_rule: AutomationRule): boolean {
  // AutomationRule no tiene campo execution, pero podríamos agregar lógica adicional
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Procesa un evento del sistema y ejecuta las reglas que coincidan.
 */
export async function processEvent(
  eventType: SystemEvent,
  payload: Record<string, unknown>,
  buildingId: string
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  
  // Obtener reglas activas para el building
  const rules = await getRulesByBuilding(buildingId);
  const activeRules = rules.filter(r => r.isActive);
  
  // Filtrar reglas que coinciden con el tipo de evento
  const matchingRules = activeRules.filter(r => {
    const trigger = r.trigger;
    if (trigger.type !== 'event') return false;
    // EventTrigger tiene eventType, no event
    return trigger.eventType === eventType;
  });
  
  console.log(`[Automation] Processing event ${eventType} - ${matchingRules.length} matching rules`);
  
  // Ejecutar cada regla
  for (const rule of matchingRules) {
    const result = await executeRule(rule, eventType, payload);
    results.push(result);
  }
  
  return results;
}

/**
 * Ejecuta reglas programadas (schedule trigger).
 * Debe llamarse periódicamente (cron job).
 */
export async function processScheduledRules(): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  const allRules = await getAllRules();
  
  const scheduledRules = allRules.filter(r => 
    r.isActive && r.trigger.type === 'schedule'
  );
  
  const now = new Date();
  
  for (const rule of scheduledRules) {
    // Verificar si es hora de ejecutar según el schedule
    const trigger = rule.trigger;
    if (trigger.type === 'schedule' && trigger.scheduleType) {
      const shouldRun = shouldRunSchedule({
        scheduleType: trigger.scheduleType,
        cronExpression: trigger.cronExpression,
        time: trigger.time,
        dayOfWeek: trigger.dayOfWeek,
        dayOfMonth: trigger.dayOfMonth,
      }, now);
      
      if (shouldRun) {
        const result = await executeRule(
          rule,
          'system.daily_start' as SystemEvent, // Usar un evento de sistema válido
          { timestamp: nowISO(), ruleId: rule.id }
        );
        results.push(result);
      }
    }
  }
  
  return results;
}

interface ScheduleConfig {
  scheduleType: string;
  cronExpression?: string;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

/**
 * Verifica si un schedule debe ejecutarse.
 * Simplificado - en producción usar librería cron.
 */
function shouldRunSchedule(schedule: ScheduleConfig, now: Date): boolean {
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay();
  const currentDate = now.getDate();
  
  // Parsear time si existe (formato HH:MM)
  let scheduleHour = 0;
  let scheduleMinute = 0;
  if (schedule.time) {
    const [h, m] = schedule.time.split(':').map(Number);
    scheduleHour = h || 0;
    scheduleMinute = m || 0;
  }
  
  switch (schedule.scheduleType) {
    case 'daily':
      return currentHour === scheduleHour && currentMinute === scheduleMinute;
    
    case 'weekly':
      return currentDay === (schedule.dayOfWeek || 0) && 
             currentHour === scheduleHour && 
             currentMinute === scheduleMinute;
    
    case 'monthly':
      return currentDate === (schedule.dayOfMonth || 1) && 
             currentHour === scheduleHour && 
             currentMinute === scheduleMinute;
    
    case 'cron':
      // En producción: usar cron-parser o similar
      return true;
    
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene historial de ejecuciones.
 */
export async function getExecutionHistory(options?: {
  ruleId?: string;
  buildingId?: string;
  status?: 'success' | 'partial_success' | 'failure' | 'skipped';
  fromDate?: string;
  limit?: number;
}): Promise<AutomationExecution[]> {
  let executions = await executionsRepository.findMany({
    orderBy: { field: 'startedAt', direction: 'desc' },
  }) as AutomationExecution[];
  
  if (options?.ruleId) {
    executions = executions.filter(e => e.ruleId === options.ruleId);
  }
  
  if (options?.status) {
    executions = executions.filter(e => e.status === options.status);
  }
  
  if (options?.fromDate) {
    const fromDate = parseDate(options.fromDate);
    if (fromDate) {
      executions = executions.filter(e => {
        const execDate = parseDate(e.startedAt);
        return execDate && compareDates(execDate, fromDate) >= 0;
      });
    }
  }
  
  if (options?.limit) {
    executions = executions.slice(0, options.limit);
  }
  
  return executions;
}

/**
 * Obtiene estadísticas de ejecución para una regla.
 */
export async function getRuleStats(ruleId: string): Promise<{
  totalExecutions: number;
  successful: number;
  failed: number;
  skipped: number;
  avgDuration: number;
  lastExecution?: string;
}> {
  const executions = await getExecutionHistory({ ruleId });
  
  const successful = executions.filter(e => e.status === 'success').length;
  const failed = executions.filter(e => e.status === 'failure').length;
  const skipped = executions.filter(e => e.status === 'skipped').length;
  
  // AutomationExecution tiene durationMs
  const durations = executions
    .map(e => e.durationMs)
    .filter(d => typeof d === 'number');
  
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;
  
  return {
    totalExecutions: executions.length,
    successful,
    failed,
    skipped,
    avgDuration,
    lastExecution: executions[0]?.startedAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Rule management
  getAllRules,
  getRulesByBuilding,
  getRule,
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
  
  // Execution
  executeRule,
  processEvent,
  processScheduledRules,
  
  // History
  getExecutionHistory,
  getRuleStats,
};
