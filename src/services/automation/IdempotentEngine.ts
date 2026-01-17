/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - IDEMPOTENT AUTOMATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Motor de ejecución de automatizaciones con:
 * - Idempotencia: misma operación no se ejecuta dos veces
 * - Deduplicación de eventos
 * - Retry con backoff exponencial
 * - Rate limiting por canal
 * - Locks distribuidos (preparado para Redis)
 */

import {
  generateUUID,
  nowISO,
  nowUTC,
  addHours,
  addDays,
  deepDiff,
  createRepository,
  type EntityType,
} from '../repository/DataAccessLayer';

import {
  interpolateText,
  evaluateExpression,
  type TemplateContext,
} from '../templates/TemplateEngine';

import type {
  AutomationRule,
  AutomationExecution,
  AutomationAction,
} from '../../types/automation.types';

// Tipos locales derivados de automation.types.ts
export type ExecutionStatus = 'success' | 'partial_success' | 'failure' | 'skipped' | 'pending' | 'running';
export type ActionType = 'notification' | 'status_change' | 'email' | 'assignment' | 'task_creation' | 'data_update' | 'webhook' | 'report' | 'archive' | 'escalation';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS EXTENDIDOS PARA IDEMPOTENCIA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ejecución con soporte para idempotencia, reintentos y locks.
 * No extiende AutomationExecution para evitar incompatibilidades.
 */
export interface IdempotentExecution {
  id: string;
  
  /** Key única para deduplicación */
  idempotencyKey: string;
  
  /** ID del evento que disparó la ejecución */
  eventId: string | null;
  
  /** Lock key para ejecución concurrente */
  lockKey: string;
  
  /** Número de intento actual */
  attempt: number;
  
  /** Máximo de intentos permitidos */
  maxAttempts: number;
  
  /** Timestamp del próximo retry (si aplica) */
  nextRetryAt: string | null;
  
  /** Backoff actual en ms */
  currentBackoffMs: number;
  
  // Datos de la regla
  ruleId: string;
  ruleName: string;
  buildingId: string;
  
  // Trigger info
  triggeredBy: {
    type: 'event' | 'schedule' | 'threshold' | 'manual';
    eventType?: string;
    payload?: Record<string, unknown>;
    schedule?: string;
    threshold?: string;
    userId?: string;
  };
  
  // Timestamps
  startedAt: string;
  completedAt?: string;
  
  // Estado
  status: ExecutionStatus;
  
  // Resultados
  conditionsEvaluated: Array<{
    conditionId: string;
    field: string;
    operator: string;
    expectedValue: unknown;
    actualValue: unknown;
    result: boolean;
  }>;
  conditionsMet: boolean;
  
  actionsExecuted: Array<{
    actionId: string;
    actionType: string;
    status: 'success' | 'failure' | 'skipped';
    startedAt: string;
    completedAt: string;
    output?: Record<string, unknown>;
    error?: string;
    retryCount: number;
  }>;
  
  // Métricas
  durationMs: number;
  
  // Errores
  errors: Array<{
    timestamp: string;
    actionId?: string;
    code: string;
    message: string;
  }>;
}

export interface ProcessedEvent {
  id: string;
  eventType: string;
  eventKey: string; // Hash para deduplicación
  payload: Record<string, unknown>;
  buildingId: string;
  processedAt: string;
  triggeredExecutions: string[];
}

export interface ExecutionLock {
  lockKey: string;
  ownerId: string;
  acquiredAt: string;
  expiresAt: string;
  released: boolean;
}

export interface RateLimitEntry {
  channel: string;
  buildingId: string;
  windowStart: string;
  count: number;
  limit: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Retry
  MAX_RETRY_ATTEMPTS: 5,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 60000,
  BACKOFF_MULTIPLIER: 2,
  
  // Rate limits por canal (por hora por building)
  RATE_LIMITS: {
    email: 100,
    sms: 50,
    whatsapp: 50,
    push: 500,
    in_app: 1000,
    webhook: 200,
  } as Record<string, number>,
  
  // Lock
  LOCK_TTL_MS: 30000, // 30 segundos
  
  // Deduplicación
  EVENT_DEDUP_WINDOW_MS: 60000, // 1 minuto
  
  // Cooldown entre ejecuciones de misma regla
  DEFAULT_COOLDOWN_MS: 60000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE (LOCAL - REEMPLAZAR POR REDIS EN PROD)
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  PROCESSED_EVENTS: 'aquarela_processed_events_v2',
  EXECUTION_LOCKS: 'aquarela_execution_locks_v2',
  RATE_LIMITS: 'aquarela_rate_limits_v2',
};

function getProcessedEvents(): ProcessedEvent[] {
  const raw = localStorage.getItem(STORAGE_KEYS.PROCESSED_EVENTS);
  return raw ? JSON.parse(raw) : [];
}

function saveProcessedEvent(event: ProcessedEvent): void {
  const events = getProcessedEvents();
  events.push(event);
  
  // Limpiar eventos viejos (más de 1 hora)
  const cutoff = nowUTC() - 3600000;
  const filtered = events.filter(e => new Date(e.processedAt).getTime() > cutoff);
  
  localStorage.setItem(STORAGE_KEYS.PROCESSED_EVENTS, JSON.stringify(filtered));
}

function getLocks(): ExecutionLock[] {
  const raw = localStorage.getItem(STORAGE_KEYS.EXECUTION_LOCKS);
  return raw ? JSON.parse(raw) : [];
}

function saveLocks(locks: ExecutionLock[]): void {
  localStorage.setItem(STORAGE_KEYS.EXECUTION_LOCKS, JSON.stringify(locks));
}

function getRateLimits(): RateLimitEntry[] {
  const raw = localStorage.getItem(STORAGE_KEYS.RATE_LIMITS);
  return raw ? JSON.parse(raw) : [];
}

function saveRateLimits(limits: RateLimitEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.RATE_LIMITS, JSON.stringify(limits));
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY KEY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera idempotency key para una ejecución.
 * Combina: ruleId + eventType + entityId + fecha (truncada a minuto)
 */
export function generateIdempotencyKey(
  ruleId: string,
  eventType: string,
  entityId: string | null,
  windowMinutes = 1
): string {
  const now = new Date();
  // Truncar a ventana de minutos
  const windowedTime = Math.floor(now.getTime() / (windowMinutes * 60000)) * (windowMinutes * 60000);
  const timeWindow = new Date(windowedTime).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  
  const parts = [ruleId, eventType, entityId || 'null', timeWindow];
  return parts.join(':');
}

/**
 * Genera event key para deduplicación de eventos.
 */
export function generateEventKey(
  eventType: string,
  payload: Record<string, unknown>
): string {
  // Usar campos clave del payload para identificar el evento
  const entityId = payload.id || payload.entityId || 'unknown';
  const timestamp = payload.timestamp || nowISO();
  
  return `${eventType}:${entityId}:${timestamp}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCKING (LOCAL - REEMPLAZAR POR REDIS SETNX EN PROD)
// ═══════════════════════════════════════════════════════════════════════════════

const lockOwnerId = generateUUID(); // ID único de esta instancia

/**
 * Intenta adquirir un lock para ejecución.
 */
export function acquireLock(lockKey: string): boolean {
  const locks = getLocks();
  const now = nowUTC();
  
  // Limpiar locks expirados
  const validLocks = locks.filter(l => 
    !l.released && new Date(l.expiresAt).getTime() > now
  );
  
  // Verificar si ya existe lock activo
  const existing = validLocks.find(l => l.lockKey === lockKey);
  if (existing) {
    console.log(`[Lock] Lock already held for ${lockKey}`);
    return false;
  }
  
  // Crear nuevo lock
  const lock: ExecutionLock = {
    lockKey,
    ownerId: lockOwnerId,
    acquiredAt: nowISO(),
    expiresAt: new Date(now + CONFIG.LOCK_TTL_MS).toISOString(),
    released: false,
  };
  
  validLocks.push(lock);
  saveLocks(validLocks);
  
  console.log(`[Lock] Acquired lock for ${lockKey}`);
  return true;
}

/**
 * Libera un lock.
 */
export function releaseLock(lockKey: string): void {
  const locks = getLocks();
  const lock = locks.find(l => l.lockKey === lockKey && l.ownerId === lockOwnerId);
  
  if (lock) {
    lock.released = true;
    saveLocks(locks);
    console.log(`[Lock] Released lock for ${lockKey}`);
  }
}

/**
 * Extiende TTL de un lock.
 */
export function extendLock(lockKey: string): boolean {
  const locks = getLocks();
  const lock = locks.find(l => l.lockKey === lockKey && l.ownerId === lockOwnerId);
  
  if (lock && !lock.released) {
    lock.expiresAt = new Date(nowUTC() + CONFIG.LOCK_TTL_MS).toISOString();
    saveLocks(locks);
    return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica y actualiza rate limit para un canal.
 */
export function checkRateLimit(
  channel: string,
  buildingId: string
): { allowed: boolean; remaining: number; resetAt: string } {
  const limit = CONFIG.RATE_LIMITS[channel] || 100;
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMinutes(0, 0, 0); // Inicio de la hora actual
  
  const limits = getRateLimits();
  
  // Limpiar ventanas antiguas
  const currentWindowStr = windowStart.toISOString();
  const validLimits = limits.filter(l => l.windowStart === currentWindowStr);
  
  // Buscar entrada para este canal/building
  let entry = validLimits.find(l => 
    l.channel === channel && l.buildingId === buildingId
  );
  
  if (!entry) {
    entry = {
      channel,
      buildingId,
      windowStart: currentWindowStr,
      count: 0,
      limit,
    };
    validLimits.push(entry);
  }
  
  const resetAt = new Date(windowStart.getTime() + 3600000).toISOString();
  
  if (entry.count >= limit) {
    saveRateLimits(validLimits);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }
  
  // Incrementar contador
  entry.count++;
  saveRateLimits(validLimits);
  
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica si un evento ya fue procesado.
 */
export function isEventDuplicate(eventKey: string): boolean {
  const events = getProcessedEvents();
  const cutoff = nowUTC() - CONFIG.EVENT_DEDUP_WINDOW_MS;
  
  return events.some(e => 
    e.eventKey === eventKey && 
    new Date(e.processedAt).getTime() > cutoff
  );
}

/**
 * Marca un evento como procesado.
 */
export function markEventProcessed(
  eventId: string,
  eventType: string,
  eventKey: string,
  payload: Record<string, unknown>,
  buildingId: string,
  triggeredExecutions: string[]
): void {
  const event: ProcessedEvent = {
    id: eventId,
    eventType,
    eventKey,
    payload,
    buildingId,
    processedAt: nowISO(),
    triggeredExecutions,
  };
  
  saveProcessedEvent(event);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION WITH IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════════

const executionRepository = createRepository<IdempotentExecution>('automation_execution');

/**
 * Verifica si ya existe una ejecución con esta idempotency key.
 */
export async function getExistingExecution(
  idempotencyKey: string
): Promise<IdempotentExecution | null> {
  return executionRepository.findOne({
    where: (e) => e.idempotencyKey === idempotencyKey,
  });
}

/**
 * Crea una nueva ejecución con idempotencia.
 */
export async function createIdempotentExecution(
  rule: AutomationRule,
  eventType: string,
  eventId: string | null,
  payload: Record<string, unknown>
): Promise<IdempotentExecution | null> {
  const entityId = (payload.id || payload.entityId || null) as string | null;
  const idempotencyKey = generateIdempotencyKey(rule.id, eventType, entityId);
  
  // Verificar si ya existe
  const existing = await getExistingExecution(idempotencyKey);
  if (existing) {
    console.log(`[Automation] Execution already exists: ${idempotencyKey}`);
    return null; // Ya procesado
  }
  
  const lockKey = `exec:${rule.id}:${entityId || 'global'}`;
  
  // Intentar adquirir lock
  if (!acquireLock(lockKey)) {
    console.log(`[Automation] Could not acquire lock: ${lockKey}`);
    return null;
  }
  
  try {
    const execution: Omit<IdempotentExecution, 'id'> = {
      idempotencyKey,
      eventId,
      lockKey,
      attempt: 1,
      maxAttempts: CONFIG.MAX_RETRY_ATTEMPTS,
      nextRetryAt: null,
      currentBackoffMs: CONFIG.INITIAL_BACKOFF_MS,
      
      ruleId: rule.id,
      ruleName: rule.name,
      buildingId: rule.buildingId,
      triggeredBy: {
        type: 'event',
        eventType,
        payload,
      },
      startedAt: nowISO(),
      status: 'running',
      conditionsEvaluated: [],
      conditionsMet: false,
      actionsExecuted: [],
      durationMs: 0,
      errors: [],
    };
    
    const created = await executionRepository.create(execution as IdempotentExecution);
    return created as IdempotentExecution;
    
  } catch (error) {
    releaseLock(lockKey);
    throw error;
  }
}

/**
 * Actualiza una ejecución.
 */
export async function updateExecution(
  id: string,
  updates: Partial<IdempotentExecution>
): Promise<IdempotentExecution> {
  const updated = await executionRepository.update(id, updates);
  return updated as IdempotentExecution;
}

/**
 * Completa una ejecución (éxito o fallo).
 */
export async function completeExecution(
  execution: IdempotentExecution,
  status: ExecutionStatus,
  errorMessage?: string
): Promise<void> {
  const completedAt = nowISO();
  const durationMs = new Date(completedAt).getTime() - new Date(execution.startedAt).getTime();
  
  const updates: Partial<IdempotentExecution> = {
    status,
    completedAt,
    durationMs,
    nextRetryAt: null,
  };
  
  if (errorMessage) {
    updates.errors = [
      ...execution.errors,
      {
        timestamp: nowISO(),
        code: 'EXECUTION_ERROR',
        message: errorMessage,
      }
    ];
  }
  
  await updateExecution(execution.id, updates);
  
  // Liberar lock
  releaseLock(execution.lockKey);
}

/**
 * Programa retry con backoff exponencial.
 */
export async function scheduleRetry(
  execution: IdempotentExecution,
  errorMessage: string
): Promise<boolean> {
  if (execution.attempt >= execution.maxAttempts) {
    console.log(`[Automation] Max retries reached for ${execution.id}`);
    await completeExecution(execution, 'failure', `Max retries reached. Last error: ${errorMessage}`);
    return false;
  }
  
  // Calcular backoff con jitter
  const baseBackoff = Math.min(
    execution.currentBackoffMs * CONFIG.BACKOFF_MULTIPLIER,
    CONFIG.MAX_BACKOFF_MS
  );
  const jitter = Math.random() * 0.3 * baseBackoff; // ±30% jitter
  const nextBackoff = Math.round(baseBackoff + jitter);
  
  const nextRetryAt = new Date(nowUTC() + nextBackoff).toISOString();
  
  await updateExecution(execution.id, {
    status: 'pending',
    attempt: execution.attempt + 1,
    currentBackoffMs: nextBackoff,
    nextRetryAt,
    errors: [
      ...execution.errors,
      {
        timestamp: nowISO(),
        code: 'RETRY_SCHEDULED',
        message: `Retry scheduled. Previous error: ${errorMessage}`,
      }
    ],
  });
  
  // Liberar lock para permitir retry
  releaseLock(execution.lockKey);
  
  console.log(`[Automation] Retry scheduled for ${execution.id} at ${nextRetryAt}`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION EXECUTION WITH RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  rateLimited?: boolean;
}

/**
 * Ejecuta una acción con rate limiting.
 */
export async function executeActionWithRateLimit(
  action: AutomationAction,
  context: TemplateContext,
  buildingId: string
): Promise<ActionResult> {
  // Determinar canal para rate limiting según tipo de acción
  
  if (action.type === 'notification') {
    // NotificationAction tiene channels directamente
    const notifAction = action as { type: 'notification'; channels: string[] };
    for (const ch of notifAction.channels || []) {
      const rateCheck = checkRateLimit(ch, buildingId);
      if (!rateCheck.allowed) {
        return {
          success: false,
          rateLimited: true,
          error: `Rate limit exceeded for ${ch}. Resets at ${rateCheck.resetAt}`,
        };
      }
    }
  } else if (action.type === 'email') {
    const rateCheck = checkRateLimit('email', buildingId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        rateLimited: true,
        error: `Email rate limit exceeded. Resets at ${rateCheck.resetAt}`,
      };
    }
  } else if (action.type === 'webhook') {
    const rateCheck = checkRateLimit('webhook', buildingId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        rateLimited: true,
        error: `Webhook rate limit exceeded. Resets at ${rateCheck.resetAt}`,
      };
    }
  }
  
  try {
    // Ejecutar acción según tipo
    switch (action.type) {
      case 'notification':
        return await executeNotification(action, context);
        
      case 'status_change':
        return await executeStatusChange(action, context);
        
      case 'email':
        return await executeEmail(action, context);
        
      case 'webhook':
        return await executeWebhook(action, context);
        
      case 'task_creation':
        return await executeCreateTask(action, context);
        
      case 'data_update':
        return await executeDataUpdate(action, context);
        
      case 'escalation':
        return await executeEscalation(action, context);
        
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Action implementations - adapted to automation.types.ts structure
// Import action types for type narrowing
import type {
  NotificationAction,
  StatusChangeAction,
  EmailAction,
  WebhookAction,
  TaskCreationAction,
  DataUpdateAction,
  EscalationAction,
} from '../../types/automation.types';

async function executeNotification(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionResult> {
  if (action.type !== 'notification') {
    return { success: false, error: 'Invalid notification action' };
  }
  
  const notif = action as NotificationAction;
  const { channels, titleTemplate, messageTemplate, recipientType, recipientIds } = notif;
  
  const interpolatedTitle = interpolateText(titleTemplate, context);
  const interpolatedMessage = interpolateText(messageTemplate, context);
  
  // En producción: llamar a notification service real
  console.log(`[Notification] Sending via ${channels.join(', ')} to ${recipientType}`);
  console.log(`[Notification] Title: ${interpolatedTitle}`);
  console.log(`[Notification] Message: ${interpolatedMessage}`);
  
  return {
    success: true,
    output: {
      title: interpolatedTitle,
      message: interpolatedMessage,
      channels,
      recipientType,
      recipientIds,
    },
  };
}

async function executeStatusChange(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionResult> {
  if (action.type !== 'status_change') {
    return { success: false, error: 'Invalid status change action' };
  }
  
  const statusAction = action as StatusChangeAction;
  const { newStatus, reason } = statusAction;
  const entityId = context.entity?.id as string;
  const entityType = context.entityType as string || 'unknown';
  
  if (!entityId) {
    return { success: false, error: 'Entity ID not found in context' };
  }
  
  // En producción: llamar al servicio correspondiente
  console.log(`[StatusChange] ${entityType} ${entityId} -> ${newStatus}`);
  
  return {
    success: true,
    output: { entityType, entityId, newStatus, reason },
  };
}

async function executeEmail(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionResult> {
  if (action.type !== 'email') {
    return { success: false, error: 'Invalid email action' };
  }
  
  const emailAction = action as EmailAction;
  const { templateId, toAddresses, ccAddresses } = emailAction;
  
  // Interpolar direcciones si son templates
  const interpolatedTo = toAddresses.map(addr => 
    addr.includes('{{') ? interpolateText(addr, context) : addr
  );
  
  // En producción: llamar a email service con templateId
  console.log(`[Email] Template: ${templateId}`);
  console.log(`[Email] To: ${interpolatedTo.join(', ')}`);
  
  return {
    success: true,
    output: {
      to: interpolatedTo,
      cc: ccAddresses,
      templateId,
    },
  };
}

async function executeWebhook(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionResult> {
  if (action.type !== 'webhook') {
    return { success: false, error: 'Invalid webhook action' };
  }
  
  const webhookAction = action as WebhookAction;
  const { url, method, headers, bodyTemplate, expectedStatusCodes } = webhookAction;
  
  // Interpolar body si existe
  const finalBody = bodyTemplate 
    ? interpolateText(bodyTemplate, context)
    : JSON.stringify(context.entity || {});
  
  try {
    // En producción: hacer fetch real con timeout y retry
    console.log(`[Webhook] ${method} ${url}`);
    console.log(`[Webhook] Expected status: ${expectedStatusCodes.join(', ')}`);
    
    // Simular llamada
    // const response = await fetch(url, { method, headers, body: finalBody });
    
    return {
      success: true,
      output: { url, method, statusCode: 200 },
    };
  } catch (error) {
    return {
      success: false,
      error: `Webhook failed: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

async function executeCreateTask(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionResult> {
  if (action.type !== 'task_creation') {
    return { success: false, error: 'Invalid create task action' };
  }
  
  const taskAction = action as TaskCreationAction;
  const { taskTemplate } = taskAction;
  
  const interpolatedTitle = interpolateText(taskTemplate.titleTemplate, context);
  const interpolatedDescription = interpolateText(taskTemplate.descriptionTemplate, context);
  
  // Calcular fecha límite
  const { dueDateOffset } = taskTemplate;
  const dueDate = dueDateOffset.unit === 'hours'
    ? addHours(nowUTC(), dueDateOffset.value)
    : addDays(nowUTC(), dueDateOffset.value);
  
  console.log(`[CreateTask] ${interpolatedTitle}`);
  
  return {
    success: true,
    output: {
      title: interpolatedTitle,
      description: interpolatedDescription,
      priority: taskTemplate.priority,
      assignmentType: taskTemplate.assignmentType,
      dueDate: dueDate.toISOString(),
    },
  };
}

async function executeDataUpdate(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionResult> {
  if (action.type !== 'data_update') {
    return { success: false, error: 'Invalid data update action' };
  }
  
  const dataAction = action as DataUpdateAction;
  const { updates } = dataAction;
  const entityId = context.entity?.id as string;
  const entityType = context.entityType as string || 'unknown';
  
  if (!entityId) {
    return { success: false, error: 'Entity ID not found in context' };
  }
  
  const results: Array<{ field: string; operation: string; newValue: unknown }> = [];
  
  for (const update of updates) {
    let newValue: unknown = update.value;
    
    // Si el valor es string con referencia a entity, evaluar
    if (typeof update.value === 'string' && update.value.includes('entity.')) {
      const calcResult = evaluateExpression(update.value, context);
      if (calcResult.success) {
        newValue = calcResult.value;
      }
    }
    
    console.log(`[DataUpdate] ${entityType}.${update.field} ${update.operation} -> ${newValue}`);
    results.push({ field: update.field, operation: update.operation, newValue });
  }
  
  return {
    success: true,
    output: { entityType, entityId, updates: results },
  };
}

async function executeEscalation(
  action: AutomationAction,
  context: TemplateContext
): Promise<ActionResult> {
  if (action.type !== 'escalation') {
    return { success: false, error: 'Invalid escalation action' };
  }
  
  const escalationAction = action as EscalationAction;
  const { escalateTo, escalationLevel, escalationReason, specificUserId, includeHistory } = escalationAction;
  
  const interpolatedReason = interpolateText(escalationReason, context);
  
  console.log(`[Escalation] Level ${escalationLevel} to ${escalateTo}`);
  console.log(`[Escalation] Reason: ${interpolatedReason}`);
  
  return {
    success: true,
    output: {
      escalateTo,
      escalationLevel,
      reason: interpolatedReason,
      specificUserId,
      includeHistory,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Idempotency
  generateIdempotencyKey,
  generateEventKey,
  getExistingExecution,
  createIdempotentExecution,
  updateExecution,
  completeExecution,
  scheduleRetry,
  
  // Locking
  acquireLock,
  releaseLock,
  extendLock,
  
  // Rate limiting
  checkRateLimit,
  
  // Event deduplication
  isEventDuplicate,
  markEventProcessed,
  
  // Action execution
  executeActionWithRateLimit,
};
