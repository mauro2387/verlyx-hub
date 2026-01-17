/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - AUTOMATION ENGINE SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Motor de ejecución de automatizaciones inteligentes.
 * Procesa reglas, evalúa condiciones, ejecuta acciones.
 * 
 * Capacidades:
 * - Triggers: evento, horario, umbral, manual
 * - Condiciones: campo, lógica, existencia, comparación
 * - Acciones: notificaciones, cambio estado, asignaciones, tareas, webhooks
 * - Historial de ejecución completo
 */

import type {
  AutomationRule,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  AutomationExecution,
  TriggerType,
  ConditionOperator,
  ActionType,
  ExecutionStatus,
} from '../types/automation.types';

import type {
  AccessAuthorization,
  MaintenanceRequest,
  Reservation,
  Payment,
} from '../types/core.types';

import { logAudit } from './auditService';

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  RULES: 'aquarela_automation_rules',
  EXECUTIONS: 'aquarela_automation_executions',
  QUEUE: 'aquarela_automation_queue',
};

interface QueuedEvent {
  id: string;
  eventType: string;
  payload: any;
  timestamp: string;
  processed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene todas las reglas de automatización
 */
export function getAllRules(): AutomationRule[] {
  const stored = localStorage.getItem(STORAGE_KEYS.RULES);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Obtiene reglas por building
 */
export function getRulesByBuilding(buildingId: string): AutomationRule[] {
  return getAllRules().filter(r => 
    r.scope.buildingIds.includes(buildingId) || r.scope.buildingIds.includes('*')
  );
}

/**
 * Obtiene una regla por ID
 */
export function getRule(ruleId: string): AutomationRule | null {
  return getAllRules().find(r => r.id === ruleId) || null;
}

/**
 * Guarda reglas
 */
function saveRules(rules: AutomationRule[]): void {
  localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
}

/**
 * Crea una nueva regla de automatización
 */
export async function createRule(
  input: Omit<AutomationRule, 'id' | 'executionStats' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; data?: AutomationRule; error?: string }> {
  try {
    const rules = getAllRules();
    
    // Generar ID único
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newRule: AutomationRule = {
      ...input,
      id,
      executionStats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        lastExecutedAt: undefined,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Validar regla
    const validation = validateRule(newRule);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    rules.push(newRule);
    saveRules(rules);
    
    await logAudit({
      entityType: 'automation_rule',
      entityId: id,
      action: 'create',
      newValues: newRule,
    });
    
    return { success: true, data: newRule };
  } catch (error) {
    console.error('Error creating rule:', error);
    return { success: false, error: 'Error interno al crear regla' };
  }
}

/**
 * Actualiza una regla existente
 */
export async function updateRule(
  ruleId: string,
  updates: Partial<AutomationRule>
): Promise<{ success: boolean; data?: AutomationRule; error?: string }> {
  try {
    const rules = getAllRules();
    const idx = rules.findIndex(r => r.id === ruleId);
    
    if (idx === -1) {
      return { success: false, error: 'Regla no encontrada' };
    }
    
    const oldRule = { ...rules[idx] };
    const updatedRule: AutomationRule = {
      ...rules[idx],
      ...updates,
      id: ruleId, // No permitir cambiar ID
      updatedAt: new Date().toISOString(),
    };
    
    // Validar regla
    const validation = validateRule(updatedRule);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    rules[idx] = updatedRule;
    saveRules(rules);
    
    await logAudit({
      entityType: 'automation_rule',
      entityId: ruleId,
      action: 'update',
      previousValues: oldRule,
      newValues: updatedRule,
    });
    
    return { success: true, data: updatedRule };
  } catch (error) {
    console.error('Error updating rule:', error);
    return { success: false, error: 'Error interno al actualizar regla' };
  }
}

/**
 * Activa o desactiva una regla
 */
export async function toggleRuleStatus(
  ruleId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const result = await updateRule(ruleId, { enabled });
  return { success: result.success, error: result.error };
}

/**
 * Elimina una regla
 */
export async function deleteRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const rules = getAllRules();
    const idx = rules.findIndex(r => r.id === ruleId);
    
    if (idx === -1) {
      return { success: false, error: 'Regla no encontrada' };
    }
    
    const deletedRule = rules[idx];
    rules.splice(idx, 1);
    saveRules(rules);
    
    await logAudit({
      entityType: 'automation_rule',
      entityId: ruleId,
      action: 'delete',
      previousValues: deletedRule,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting rule:', error);
    return { success: false, error: 'Error interno al eliminar regla' };
  }
}

/**
 * Valida una regla
 */
function validateRule(rule: AutomationRule): { valid: boolean; error?: string } {
  if (!rule.name || rule.name.trim().length === 0) {
    return { valid: false, error: 'El nombre es requerido' };
  }
  
  if (!rule.triggers || rule.triggers.length === 0) {
    return { valid: false, error: 'Se requiere al menos un trigger' };
  }
  
  if (!rule.actions || rule.actions.length === 0) {
    return { valid: false, error: 'Se requiere al menos una acción' };
  }
  
  // Validar triggers
  for (const trigger of rule.triggers) {
    if (!trigger.type) {
      return { valid: false, error: 'Tipo de trigger inválido' };
    }
    
    if (trigger.type === 'schedule' && !trigger.schedule) {
      return { valid: false, error: 'Schedule requerido para trigger programado' };
    }
    
    if (trigger.type === 'threshold' && !trigger.threshold) {
      return { valid: false, error: 'Threshold requerido para trigger de umbral' };
    }
  }
  
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene historial de ejecuciones
 */
export function getExecutions(
  filters?: {
    ruleId?: string;
    status?: ExecutionStatus;
    from?: string;
    to?: string;
    limit?: number;
  }
): AutomationExecution[] {
  const stored = localStorage.getItem(STORAGE_KEYS.EXECUTIONS);
  let executions: AutomationExecution[] = stored ? JSON.parse(stored) : [];
  
  if (filters?.ruleId) {
    executions = executions.filter(e => e.ruleId === filters.ruleId);
  }
  
  if (filters?.status) {
    executions = executions.filter(e => e.status === filters.status);
  }
  
  if (filters?.from) {
    executions = executions.filter(e => e.startedAt >= filters.from!);
  }
  
  if (filters?.to) {
    executions = executions.filter(e => e.startedAt <= filters.to!);
  }
  
  // Ordenar por fecha descendente
  executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  
  if (filters?.limit) {
    executions = executions.slice(0, filters.limit);
  }
  
  return executions;
}

/**
 * Guarda una ejecución
 */
function saveExecution(execution: AutomationExecution): void {
  const stored = localStorage.getItem(STORAGE_KEYS.EXECUTIONS);
  const executions: AutomationExecution[] = stored ? JSON.parse(stored) : [];
  
  executions.push(execution);
  
  // Mantener solo los últimos 1000 registros
  if (executions.length > 1000) {
    executions.splice(0, executions.length - 1000);
  }
  
  localStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(executions));
}

/**
 * Actualiza estadísticas de una regla
 */
function updateRuleStats(ruleId: string, executionTime: number, success: boolean): void {
  const rules = getAllRules();
  const idx = rules.findIndex(r => r.id === ruleId);
  
  if (idx === -1) return;
  
  const rule = rules[idx];
  const stats = rule.executionStats;
  
  stats.totalExecutions++;
  if (success) {
    stats.successfulExecutions++;
  } else {
    stats.failedExecutions++;
  }
  
  // Calcular nuevo promedio
  stats.averageExecutionTime = 
    (stats.averageExecutionTime * (stats.totalExecutions - 1) + executionTime) / stats.totalExecutions;
  stats.lastExecutedAt = new Date().toISOString();
  
  rules[idx] = rule;
  saveRules(rules);
}

/**
 * Procesa un evento y ejecuta reglas coincidentes
 */
export async function processEvent(
  eventType: string,
  payload: any,
  buildingId: string
): Promise<{ processedRules: number; successful: number; failed: number }> {
  const startTime = Date.now();
  const rules = getRulesByBuilding(buildingId).filter(r => r.enabled);
  
  let processedRules = 0;
  let successful = 0;
  let failed = 0;
  
  for (const rule of rules) {
    // Verificar si algún trigger coincide con el evento
    const matchingTrigger = rule.triggers.find(t => 
      t.type === 'event' && t.eventType === eventType
    );
    
    if (!matchingTrigger) continue;
    
    processedRules++;
    
    // Evaluar condiciones
    const conditionsMet = evaluateConditions(rule.conditions, payload);
    
    if (!conditionsMet) {
      // Registrar ejecución saltada
      saveExecution({
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        triggeredBy: {
          type: 'event',
          eventType,
          payload,
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'skipped',
        conditionResults: [],
        actionResults: [],
        totalDuration: 0,
      });
      continue;
    }
    
    // Ejecutar acciones
    const result = await executeRule(rule, eventType, payload);
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }
  
  console.log(`[Automation] Processed event ${eventType}: ${processedRules} rules, ${successful} successful, ${failed} failed`);
  
  return { processedRules, successful, failed };
}

/**
 * Ejecuta una regla manualmente
 */
export async function executeRuleManually(
  ruleId: string,
  payload?: any
): Promise<{ success: boolean; execution?: AutomationExecution; error?: string }> {
  const rule = getRule(ruleId);
  
  if (!rule) {
    return { success: false, error: 'Regla no encontrada' };
  }
  
  const result = await executeRule(rule, 'manual_trigger', payload || {});
  return result;
}

/**
 * Ejecuta una regla
 */
async function executeRule(
  rule: AutomationRule,
  triggerType: string,
  payload: any
): Promise<{ success: boolean; execution: AutomationExecution; error?: string }> {
  const startTime = Date.now();
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const execution: AutomationExecution = {
    id: executionId,
    ruleId: rule.id,
    ruleName: rule.name,
    triggeredBy: {
      type: triggerType as TriggerType,
      eventType: triggerType,
      payload,
    },
    startedAt: new Date().toISOString(),
    status: 'running',
    conditionResults: [],
    actionResults: [],
    totalDuration: 0,
  };
  
  try {
    // Evaluar condiciones y registrar resultados
    const conditionResults = rule.conditions.map(condition => {
      const result = evaluateSingleCondition(condition, payload);
      return {
        conditionId: `cond_${condition.field}_${condition.operator}`,
        conditionDescription: `${condition.field} ${condition.operator} ${condition.value}`,
        result,
        evaluatedValue: getNestedValue(payload, condition.field),
      };
    });
    
    execution.conditionResults = conditionResults;
    
    const allConditionsMet = conditionResults.every(r => r.result);
    
    if (!allConditionsMet) {
      execution.status = 'skipped';
      execution.completedAt = new Date().toISOString();
      execution.totalDuration = Date.now() - startTime;
      saveExecution(execution);
      updateRuleStats(rule.id, execution.totalDuration, true);
      return { success: true, execution };
    }
    
    // Ejecutar acciones
    let hasErrors = false;
    
    for (const action of rule.actions) {
      const actionStart = Date.now();
      
      try {
        await executeAction(action, payload, rule);
        
        execution.actionResults.push({
          actionId: action.type,
          actionType: action.type,
          status: 'completed',
          output: { message: 'Acción ejecutada correctamente' },
          duration: Date.now() - actionStart,
        });
      } catch (actionError: any) {
        hasErrors = true;
        execution.actionResults.push({
          actionId: action.type,
          actionType: action.type,
          status: 'failed',
          error: actionError.message || 'Error desconocido',
          duration: Date.now() - actionStart,
        });
        
        // Si está configurado para detenerse en error
        if (rule.errorHandling?.stopOnFirstError) {
          break;
        }
      }
    }
    
    execution.status = hasErrors ? 'partial_success' : 'completed';
    execution.completedAt = new Date().toISOString();
    execution.totalDuration = Date.now() - startTime;
    
    saveExecution(execution);
    updateRuleStats(rule.id, execution.totalDuration, !hasErrors);
    
    return { success: !hasErrors, execution };
    
  } catch (error: any) {
    execution.status = 'failed';
    execution.error = error.message || 'Error desconocido';
    execution.completedAt = new Date().toISOString();
    execution.totalDuration = Date.now() - startTime;
    
    saveExecution(execution);
    updateRuleStats(rule.id, execution.totalDuration, false);
    
    return { success: false, execution, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONDITION EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evalúa todas las condiciones de una regla
 */
function evaluateConditions(conditions: AutomationCondition[], payload: any): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // Sin condiciones = siempre ejecutar
  }
  
  // Por ahora, todas las condiciones deben cumplirse (AND lógico)
  // TODO: Soportar grupos de condiciones con AND/OR
  return conditions.every(condition => evaluateSingleCondition(condition, payload));
}

/**
 * Evalúa una condición individual
 */
function evaluateSingleCondition(condition: AutomationCondition, payload: any): boolean {
  const actualValue = getNestedValue(payload, condition.field);
  const expectedValue = condition.value;
  
  switch (condition.operator) {
    case 'equals':
      return actualValue === expectedValue;
      
    case 'not_equals':
      return actualValue !== expectedValue;
      
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      
    case 'not_contains':
      return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      
    case 'starts_with':
      return String(actualValue).toLowerCase().startsWith(String(expectedValue).toLowerCase());
      
    case 'ends_with':
      return String(actualValue).toLowerCase().endsWith(String(expectedValue).toLowerCase());
      
    case 'greater_than':
      return Number(actualValue) > Number(expectedValue);
      
    case 'less_than':
      return Number(actualValue) < Number(expectedValue);
      
    case 'greater_or_equal':
      return Number(actualValue) >= Number(expectedValue);
      
    case 'less_or_equal':
      return Number(actualValue) <= Number(expectedValue);
      
    case 'is_empty':
      return actualValue === null || actualValue === undefined || actualValue === '';
      
    case 'is_not_empty':
      return actualValue !== null && actualValue !== undefined && actualValue !== '';
      
    case 'in_list':
      return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      
    case 'not_in_list':
      return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
      
    case 'matches_regex':
      try {
        return new RegExp(String(expectedValue)).test(String(actualValue));
      } catch {
        return false;
      }
      
    case 'is_before':
      return new Date(actualValue) < new Date(expectedValue);
      
    case 'is_after':
      return new Date(actualValue) > new Date(expectedValue);
      
    case 'is_between':
      if (Array.isArray(expectedValue) && expectedValue.length === 2) {
        const val = Number(actualValue);
        return val >= Number(expectedValue[0]) && val <= Number(expectedValue[1]);
      }
      return false;
      
    default:
      console.warn(`Unknown operator: ${condition.operator}`);
      return false;
  }
}

/**
 * Obtiene un valor anidado de un objeto
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta una acción de automatización
 */
async function executeAction(
  action: AutomationAction,
  payload: any,
  rule: AutomationRule
): Promise<void> {
  console.log(`[Automation] Executing action: ${action.type}`);
  
  switch (action.type) {
    case 'notification':
      await executeNotificationAction(action, payload);
      break;
      
    case 'status_change':
      await executeStatusChangeAction(action, payload);
      break;
      
    case 'assignment':
      await executeAssignmentAction(action, payload);
      break;
      
    case 'create_task':
      await executeCreateTaskAction(action, payload);
      break;
      
    case 'data_update':
      await executeDataUpdateAction(action, payload);
      break;
      
    case 'webhook':
      await executeWebhookAction(action, payload);
      break;
      
    case 'email':
      await executeEmailAction(action, payload);
      break;
      
    case 'report':
      await executeReportAction(action, payload);
      break;
      
    case 'archive':
      await executeArchiveAction(action, payload);
      break;
      
    case 'escalation':
      await executeEscalationAction(action, payload);
      break;
      
    default:
      throw new Error(`Tipo de acción no soportado: ${action.type}`);
  }
}

/**
 * Ejecuta acción de notificación
 */
async function executeNotificationAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'notification' || !action.notification) {
    throw new Error('Configuración de notificación inválida');
  }
  
  const { channels, title, message, recipients, priority } = action.notification;
  
  // Interpolar variables en el mensaje
  const interpolatedTitle = interpolateTemplate(title, payload);
  const interpolatedMessage = interpolateTemplate(message, payload);
  
  // Crear notificación en sistema
  const notifications = JSON.parse(localStorage.getItem('aquarela_notifications') || '[]');
  
  for (const recipientId of recipients) {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientId,
      title: interpolatedTitle,
      message: interpolatedMessage,
      channels,
      priority,
      read: false,
      createdAt: new Date().toISOString(),
      automationGenerated: true,
    };
    
    notifications.push(notification);
  }
  
  localStorage.setItem('aquarela_notifications', JSON.stringify(notifications));
  
  console.log(`[Automation] Notification sent to ${recipients.length} recipients`);
}

/**
 * Ejecuta acción de cambio de estado
 */
async function executeStatusChangeAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'status_change' || !action.statusChange) {
    throw new Error('Configuración de cambio de estado inválida');
  }
  
  const { entityType, newStatus, reason } = action.statusChange;
  const entityId = payload.id;
  
  if (!entityId) {
    throw new Error('ID de entidad no encontrado en payload');
  }
  
  // Obtener storage según tipo de entidad
  const storageKey = `aquarela_${entityType}s`;
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    throw new Error(`Storage no encontrado para ${entityType}`);
  }
  
  const entities = JSON.parse(stored);
  const idx = entities.findIndex((e: any) => e.id === entityId);
  
  if (idx === -1) {
    throw new Error(`Entidad ${entityId} no encontrada`);
  }
  
  entities[idx].status = newStatus;
  entities[idx].lastStatusChangeReason = reason;
  entities[idx].lastStatusChangeAt = new Date().toISOString();
  
  localStorage.setItem(storageKey, JSON.stringify(entities));
  
  await logAudit({
    entityType,
    entityId,
    action: 'status_change',
    previousValues: { status: payload.status },
    newValues: { status: newStatus },
    metadata: { reason, automationGenerated: true },
  });
  
  console.log(`[Automation] Status changed for ${entityType} ${entityId}: ${newStatus}`);
}

/**
 * Ejecuta acción de asignación
 */
async function executeAssignmentAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'assignment' || !action.assignment) {
    throw new Error('Configuración de asignación inválida');
  }
  
  const { assigneeType, assigneeIds, strategy } = action.assignment;
  const entityId = payload.id;
  
  if (!entityId) {
    throw new Error('ID de entidad no encontrado en payload');
  }
  
  // Determinar assignee según estrategia
  let selectedAssignee: string;
  
  switch (strategy) {
    case 'round_robin':
      // Rotar entre los assignees disponibles
      const rrIndex = Date.now() % assigneeIds.length;
      selectedAssignee = assigneeIds[rrIndex];
      break;
      
    case 'least_loaded':
      // Por ahora, simplemente el primero (implementación simplificada)
      selectedAssignee = assigneeIds[0];
      break;
      
    case 'specific':
      selectedAssignee = assigneeIds[0];
      break;
      
    case 'by_skill':
      selectedAssignee = assigneeIds[0]; // Simplificado
      break;
      
    default:
      selectedAssignee = assigneeIds[0];
  }
  
  // Actualizar entidad con asignación
  // Este es un ejemplo genérico - en producción habría lógica específica por tipo
  console.log(`[Automation] Assigned ${entityId} to ${selectedAssignee}`);
}

/**
 * Ejecuta acción de crear tarea
 */
async function executeCreateTaskAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'create_task' || !action.createTask) {
    throw new Error('Configuración de crear tarea inválida');
  }
  
  const { title, description, priority, category, assigneeIds, dueInHours } = action.createTask;
  
  // Interpolar templates
  const interpolatedTitle = interpolateTemplate(title, payload);
  const interpolatedDescription = interpolateTemplate(description, payload);
  
  // Crear tarea
  const tasks = JSON.parse(localStorage.getItem('aquarela_tasks') || '[]');
  
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + dueInHours);
  
  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: interpolatedTitle,
    description: interpolatedDescription,
    priority,
    category,
    status: 'pending',
    assigneeIds,
    dueDate: dueDate.toISOString(),
    createdAt: new Date().toISOString(),
    automationGenerated: true,
    relatedEntityId: payload.id,
    relatedEntityType: payload.entityType,
  };
  
  tasks.push(task);
  localStorage.setItem('aquarela_tasks', JSON.stringify(tasks));
  
  await logAudit({
    entityType: 'task',
    entityId: task.id,
    action: 'create',
    newValues: task,
    metadata: { automationGenerated: true },
  });
  
  console.log(`[Automation] Task created: ${task.id}`);
}

/**
 * Ejecuta acción de actualización de datos
 */
async function executeDataUpdateAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'data_update' || !action.dataUpdate) {
    throw new Error('Configuración de actualización de datos inválida');
  }
  
  const { entityType, field, value, operation } = action.dataUpdate;
  const entityId = payload.id;
  
  if (!entityId) {
    throw new Error('ID de entidad no encontrado');
  }
  
  const storageKey = `aquarela_${entityType}s`;
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    throw new Error(`Storage no encontrado para ${entityType}`);
  }
  
  const entities = JSON.parse(stored);
  const idx = entities.findIndex((e: any) => e.id === entityId);
  
  if (idx === -1) {
    throw new Error(`Entidad ${entityId} no encontrada`);
  }
  
  const previousValue = getNestedValue(entities[idx], field);
  let newValue: any;
  
  switch (operation) {
    case 'set':
      newValue = interpolateTemplate(String(value), payload);
      break;
    case 'increment':
      newValue = Number(previousValue || 0) + Number(value);
      break;
    case 'decrement':
      newValue = Number(previousValue || 0) - Number(value);
      break;
    case 'append':
      newValue = String(previousValue || '') + String(value);
      break;
    case 'toggle':
      newValue = !previousValue;
      break;
    default:
      newValue = value;
  }
  
  // Actualizar valor (soporta paths anidados)
  setNestedValue(entities[idx], field, newValue);
  localStorage.setItem(storageKey, JSON.stringify(entities));
  
  console.log(`[Automation] Data updated: ${entityType}.${field} = ${newValue}`);
}

/**
 * Ejecuta acción de webhook
 */
async function executeWebhookAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'webhook' || !action.webhook) {
    throw new Error('Configuración de webhook inválida');
  }
  
  const { url, method, headers, body } = action.webhook;
  
  // En un entorno real, aquí se haría la llamada HTTP
  // Por ahora, simulamos el registro
  console.log(`[Automation] Webhook called: ${method} ${url}`);
  console.log('[Automation] Webhook payload:', body || payload);
  
  // Simulación de llamada exitosa
  // En producción: await fetch(url, { method, headers, body: JSON.stringify(body || payload) })
}

/**
 * Ejecuta acción de email
 */
async function executeEmailAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'email' || !action.email) {
    throw new Error('Configuración de email inválida');
  }
  
  const { to, cc, bcc, subject, body, isHtml, attachments } = action.email;
  
  const interpolatedSubject = interpolateTemplate(subject, payload);
  const interpolatedBody = interpolateTemplate(body, payload);
  
  // En producción, aquí se enviaría el email real
  console.log(`[Automation] Email queued: To=${to.join(',')}, Subject=${interpolatedSubject}`);
  
  // Registrar en cola de emails
  const emailQueue = JSON.parse(localStorage.getItem('aquarela_email_queue') || '[]');
  emailQueue.push({
    id: `email_${Date.now()}`,
    to,
    cc,
    bcc,
    subject: interpolatedSubject,
    body: interpolatedBody,
    isHtml,
    attachments,
    status: 'pending',
    createdAt: new Date().toISOString(),
    automationGenerated: true,
  });
  localStorage.setItem('aquarela_email_queue', JSON.stringify(emailQueue));
}

/**
 * Ejecuta acción de reporte
 */
async function executeReportAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'report' || !action.report) {
    throw new Error('Configuración de reporte inválida');
  }
  
  const { reportType, format, recipients, includeCharts, dateRange } = action.report;
  
  // En producción, aquí se generaría el reporte real
  console.log(`[Automation] Report generated: ${reportType} in ${format} format`);
  
  // Registrar generación de reporte
  const reports = JSON.parse(localStorage.getItem('aquarela_generated_reports') || '[]');
  reports.push({
    id: `report_${Date.now()}`,
    reportType,
    format,
    recipients,
    dateRange,
    status: 'completed',
    generatedAt: new Date().toISOString(),
    automationGenerated: true,
  });
  localStorage.setItem('aquarela_generated_reports', JSON.stringify(reports));
}

/**
 * Ejecuta acción de archivo
 */
async function executeArchiveAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'archive' || !action.archive) {
    throw new Error('Configuración de archivo inválida');
  }
  
  const { entityType, retentionDays, archiveLocation } = action.archive;
  const entityId = payload.id;
  
  // Mover a archivo
  const storageKey = `aquarela_${entityType}s`;
  const archiveKey = `aquarela_${entityType}s_archive`;
  
  const stored = localStorage.getItem(storageKey);
  if (!stored) return;
  
  const entities = JSON.parse(stored);
  const idx = entities.findIndex((e: any) => e.id === entityId);
  
  if (idx === -1) return;
  
  const entity = entities[idx];
  entity.archivedAt = new Date().toISOString();
  entity.archiveRetentionUntil = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
  
  // Agregar a archivo
  const archived = JSON.parse(localStorage.getItem(archiveKey) || '[]');
  archived.push(entity);
  localStorage.setItem(archiveKey, JSON.stringify(archived));
  
  // Remover del storage activo
  entities.splice(idx, 1);
  localStorage.setItem(storageKey, JSON.stringify(entities));
  
  console.log(`[Automation] Entity ${entityId} archived`);
}

/**
 * Ejecuta acción de escalamiento
 */
async function executeEscalationAction(action: AutomationAction, payload: any): Promise<void> {
  if (action.type !== 'escalation' || !action.escalation) {
    throw new Error('Configuración de escalamiento inválida');
  }
  
  const { escalateTo, escalationLevel, notifyOriginalAssignee, escalationMessage } = action.escalation;
  
  const interpolatedMessage = interpolateTemplate(escalationMessage, payload);
  
  // Crear notificación de escalamiento
  const notifications = JSON.parse(localStorage.getItem('aquarela_notifications') || '[]');
  
  for (const recipientId of escalateTo) {
    notifications.push({
      id: `notif_esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientId,
      title: `⚠️ Escalamiento Nivel ${escalationLevel}`,
      message: interpolatedMessage,
      channels: ['in_app', 'email'],
      priority: 'high',
      read: false,
      createdAt: new Date().toISOString(),
      automationGenerated: true,
      escalationLevel,
    });
  }
  
  localStorage.setItem('aquarela_notifications', JSON.stringify(notifications));
  
  console.log(`[Automation] Escalated to level ${escalationLevel}: ${escalateTo.join(', ')}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED TASKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Procesa reglas con triggers programados
 * Debería llamarse periódicamente (ej: cada minuto)
 */
export async function processScheduledRules(): Promise<void> {
  const rules = getAllRules().filter(r => 
    r.enabled && r.triggers.some(t => t.type === 'schedule')
  );
  
  const now = new Date();
  
  for (const rule of rules) {
    const scheduleTriggers = rule.triggers.filter(t => t.type === 'schedule');
    
    for (const trigger of scheduleTriggers) {
      if (trigger.type !== 'schedule' || !trigger.schedule) continue;
      
      const shouldRun = checkScheduleMatch(trigger.schedule, now);
      
      if (shouldRun) {
        console.log(`[Automation] Running scheduled rule: ${rule.name}`);
        await executeRule(rule, 'schedule', { scheduledAt: now.toISOString() });
      }
    }
  }
}

/**
 * Verifica si un schedule coincide con la hora actual
 */
function checkScheduleMatch(schedule: any, now: Date): boolean {
  // Simplificación - en producción usar una librería como cron-parser
  
  if (schedule.frequency === 'daily') {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    return now.getHours() === hours && now.getMinutes() === minutes;
  }
  
  if (schedule.frequency === 'weekly') {
    const dayOfWeek = now.getDay();
    if (!schedule.daysOfWeek.includes(dayOfWeek)) return false;
    
    const [hours, minutes] = schedule.time.split(':').map(Number);
    return now.getHours() === hours && now.getMinutes() === minutes;
  }
  
  if (schedule.frequency === 'monthly') {
    const dayOfMonth = now.getDate();
    if (!schedule.daysOfMonth.includes(dayOfMonth)) return false;
    
    const [hours, minutes] = schedule.time.split(':').map(Number);
    return now.getHours() === hours && now.getMinutes() === minutes;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interpola variables en un template
 * Ejemplo: "Hola {{visitor.firstName}}" con payload {visitor: {firstName: "Juan"}} => "Hola Juan"
 */
function interpolateTemplate(template: string, payload: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getNestedValue(payload, path.trim());
    return value !== undefined ? String(value) : `{{${path}}}`;
  });
}

/**
 * Establece un valor en un path anidado
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Obtiene estadísticas de automatización
 */
export function getAutomationStats(buildingId?: string): {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
  executionsByStatus: Record<ExecutionStatus, number>;
  topRulesByExecutions: Array<{ ruleId: string; ruleName: string; executions: number }>;
} {
  const rules = buildingId ? getRulesByBuilding(buildingId) : getAllRules();
  const executions = getExecutions({ limit: 1000 });
  
  const executionsByStatus: Record<ExecutionStatus, number> = {
    pending: 0,
    running: 0,
    completed: 0,
    partial_success: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
  };
  
  for (const exec of executions) {
    executionsByStatus[exec.status]++;
  }
  
  const successfulCount = executionsByStatus.completed + executionsByStatus.partial_success;
  const totalCount = executions.filter(e => e.status !== 'skipped' && e.status !== 'cancelled').length;
  
  // Top reglas por ejecuciones
  const ruleExecutionCounts: Record<string, { name: string; count: number }> = {};
  for (const exec of executions) {
    if (!ruleExecutionCounts[exec.ruleId]) {
      ruleExecutionCounts[exec.ruleId] = { name: exec.ruleName, count: 0 };
    }
    ruleExecutionCounts[exec.ruleId].count++;
  }
  
  const topRules = Object.entries(ruleExecutionCounts)
    .map(([ruleId, data]) => ({ ruleId, ruleName: data.name, executions: data.count }))
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5);
  
  return {
    totalRules: rules.length,
    activeRules: rules.filter(r => r.enabled).length,
    totalExecutions: executions.length,
    successRate: totalCount > 0 ? (successfulCount / totalCount) * 100 : 100,
    executionsByStatus,
    topRulesByExecutions: topRules,
  };
}

/**
 * Exporta configuración de automatizaciones
 */
export function exportAutomationConfig(): string {
  const rules = getAllRules();
  return JSON.stringify(rules, null, 2);
}

/**
 * Importa configuración de automatizaciones
 */
export async function importAutomationConfig(configJson: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  
  try {
    const rules = JSON.parse(configJson);
    
    if (!Array.isArray(rules)) {
      return { success: false, imported: 0, errors: ['El formato debe ser un array de reglas'] };
    }
    
    for (const rule of rules) {
      const validation = validateRule(rule);
      if (!validation.valid) {
        errors.push(`Regla ${rule.name || 'sin nombre'}: ${validation.error}`);
        continue;
      }
      
      // Generar nuevo ID para evitar conflictos
      rule.id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      rule.createdAt = new Date().toISOString();
      rule.updatedAt = new Date().toISOString();
      rule.executionStats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      };
      
      const existingRules = getAllRules();
      existingRules.push(rule);
      saveRules(existingRules);
      
      imported++;
    }
    
    return { success: true, imported, errors };
  } catch (error: any) {
    return { success: false, imported, errors: [`Error de parsing: ${error.message}`] };
  }
}

export default {
  // Rules
  getAllRules,
  getRulesByBuilding,
  getRule,
  createRule,
  updateRule,
  toggleRuleStatus,
  deleteRule,
  
  // Execution
  processEvent,
  executeRuleManually,
  processScheduledRules,
  getExecutions,
  
  // Stats
  getAutomationStats,
  
  // Import/Export
  exportAutomationConfig,
  importAutomationConfig,
};
