/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - DEEP AUDIT SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Servicio de auditoría con:
 * - Deep diff real (no JSON.stringify comparison)
 * - Separación de campos sensibles
 * - Trazabilidad completa
 * - Preparado para backend real
 */

import {
  generateUUID,
  nowISO,
  deepDiff,
  createRepository,
  type DiffEntry,
  type EntityType,
} from '../repository/DataAccessLayer';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AuditAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'revoke'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'password_change'
  | 'permission_change'
  | 'status_change'
  | 'bulk_operation';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditActor {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditContext {
  buildingId: string;
  buildingName?: string;
  unitId?: string;
  unitName?: string;
  requestId?: string;
  source?: 'web' | 'api' | 'mobile' | 'automation' | 'system';
  correlationId?: string;
}

export interface AuditRecord {
  id: string;
  
  // Qué pasó
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  
  // Quién lo hizo
  actor: AuditActor;
  
  // Contexto
  context: AuditContext;
  
  // Cuándo
  timestamp: string;
  
  // Cambios detallados
  changes: DiffEntry[];
  
  // Metadata
  severity: AuditSeverity;
  description: string;
  tags?: string[];
  
  // Valores para búsqueda rápida
  searchableText?: string;
}

// Campos que nunca deben aparecer en el diff
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'privateKey',
  'ssn',
  'taxId',
  'creditCard',
  'cvv',
  'pin',
]);

// Campos que se redactan parcialmente
const REDACT_PARTIAL_FIELDS = new Set([
  'email',
  'phone',
  'phoneNumber',
  'mobile',
  'documentNumber',
  'dni',
  'passport',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

const auditRepository = createRepository<AuditRecord>('audit_log');

// ═══════════════════════════════════════════════════════════════════════════════
// SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Redacta campos sensibles de un objeto.
 */
export function sanitizeForAudit<T extends Record<string, unknown>>(
  obj: T,
  depth = 0
): T {
  if (depth > 10) return obj; // Prevenir recursión infinita
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Campo completamente sensible
    if (SENSITIVE_FIELDS.has(key)) {
      result[key] = '[REDACTED]';
      continue;
    }
    
    // Campo parcialmente sensible
    if (REDACT_PARTIAL_FIELDS.has(key) && typeof value === 'string') {
      result[key] = redactPartial(value, key);
      continue;
    }
    
    // Recursión para objetos anidados
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeForAudit(value as Record<string, unknown>, depth + 1);
      continue;
    }
    
    // Arrays
    if (Array.isArray(value)) {
      result[key] = value.map(item => {
        if (item && typeof item === 'object') {
          return sanitizeForAudit(item as Record<string, unknown>, depth + 1);
        }
        return item;
      });
      continue;
    }
    
    result[key] = value;
  }
  
  return result as T;
}

/**
 * Redacta parcialmente un valor.
 */
function redactPartial(value: string, fieldType: string): string {
  if (!value || value.length < 4) {
    return '****';
  }
  
  switch (fieldType) {
    case 'email': {
      const [local, domain] = value.split('@');
      if (!domain) return '****@****';
      const redactedLocal = local.length > 2 
        ? `${local[0]}***${local[local.length - 1]}`
        : '***';
      return `${redactedLocal}@${domain}`;
    }
    
    case 'phone':
    case 'phoneNumber':
    case 'mobile':
      // Mostrar últimos 4 dígitos
      return `****${value.slice(-4)}`;
    
    case 'documentNumber':
    case 'dni':
    case 'passport':
      // Mostrar primeros 2 y últimos 2
      return `${value.slice(0, 2)}****${value.slice(-2)}`;
    
    default:
      return `${value[0]}****${value[value.length - 1]}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula severidad basada en acción y entidad.
 */
export function calculateSeverity(
  action: AuditAction,
  entityType: EntityType,
  changes?: DiffEntry[]
): AuditSeverity {
  // Acciones críticas
  if (['delete', 'permission_change', 'password_change'].includes(action)) {
    return 'critical';
  }
  
  // Acciones de alta severidad
  if (['approve', 'reject', 'revoke', 'bulk_operation'].includes(action)) {
    return 'high';
  }
  
  // Entidades críticas
  if (['user', 'access_authorization'].includes(entityType)) {
    if (action === 'create' || action === 'update') {
      return 'high';
    }
  }
  
  // Updates con muchos cambios
  if (action === 'update' && changes && changes.length > 5) {
    return 'medium';
  }
  
  // Lecturas son low
  if (action === 'read') {
    return 'low';
  }
  
  return 'medium';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE AUDIT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditParams {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  actor: AuditActor;
  context: AuditContext;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  description?: string;
  tags?: string[];
  severity?: AuditSeverity;
}

/**
 * Registra un evento de auditoría.
 */
export async function audit(params: AuditParams): Promise<AuditRecord> {
  const {
    action,
    entityType,
    entityId,
    entityName,
    actor,
    context,
    before,
    after,
    description,
    tags,
    severity,
  } = params;
  
  // Sanitizar before/after
  const sanitizedBefore = before ? sanitizeForAudit(before) : undefined;
  const sanitizedAfter = after ? sanitizeForAudit(after) : undefined;
  
  // Calcular diff
  let changes: DiffEntry[] = [];
  
  if (action === 'create' && sanitizedAfter) {
    // Para creates, todos los campos son "agregados"
    changes = Object.entries(sanitizedAfter).map(([key, value]) => ({
      path: key,
      operation: 'add' as const,
      oldValue: undefined,
      newValue: value,
      before: undefined,
      after: value,
    }));
  } else if (action === 'delete' && sanitizedBefore) {
    // Para deletes, todos los campos son "eliminados"
    changes = Object.entries(sanitizedBefore).map(([key, value]) => ({
      path: key,
      operation: 'remove' as const,
      oldValue: value,
      newValue: undefined,
      before: value,
      after: undefined,
    }));
  } else if (sanitizedBefore && sanitizedAfter) {
    // Para updates, calcular diff real
    changes = deepDiff(sanitizedBefore, sanitizedAfter);
  }
  
  // Calcular severidad
  const finalSeverity = severity ?? calculateSeverity(action, entityType, changes);
  
  // Generar descripción si no se provee
  const finalDescription = description ?? generateDescription(action, entityType, entityName, changes);
  
  // Texto buscable
  const searchableText = [
    action,
    entityType,
    entityId,
    entityName,
    actor.userName,
    actor.userEmail,
    context.buildingId,
    finalDescription,
    ...(tags || []),
  ].filter(Boolean).join(' ').toLowerCase();
  
  const record: Omit<AuditRecord, 'id'> = {
    action,
    entityType,
    entityId,
    entityName,
    actor,
    context,
    timestamp: nowISO(),
    changes,
    severity: finalSeverity,
    description: finalDescription,
    tags,
    searchableText,
  };
  
  const created = await auditRepository.create(record);
  
  // Log para desarrollo
  console.log(`[Audit] ${finalSeverity.toUpperCase()} | ${action} ${entityType} ${entityId} | ${actor.userName}`);
  
  return created as AuditRecord;
}

/**
 * Genera descripción automática.
 */
function generateDescription(
  action: AuditAction,
  entityType: EntityType,
  entityName?: string,
  changes?: DiffEntry[]
): string {
  const entityDisplay = entityName || entityType;
  
  switch (action) {
    case 'create':
      return `Creó ${entityDisplay}`;
    case 'read':
      return `Visualizó ${entityDisplay}`;
    case 'update':
      const fieldCount = changes?.length || 0;
      const fieldNames = changes?.slice(0, 3).map(c => c.path).join(', ') || '';
      return fieldCount > 3
        ? `Actualizó ${fieldCount} campos de ${entityDisplay}: ${fieldNames}, ...`
        : `Actualizó ${entityDisplay}: ${fieldNames}`;
    case 'delete':
      return `Eliminó ${entityDisplay}`;
    case 'approve':
      return `Aprobó ${entityDisplay}`;
    case 'reject':
      return `Rechazó ${entityDisplay}`;
    case 'cancel':
      return `Canceló ${entityDisplay}`;
    case 'revoke':
      return `Revocó ${entityDisplay}`;
    case 'export':
      return `Exportó datos de ${entityDisplay}`;
    case 'import':
      return `Importó datos a ${entityDisplay}`;
    case 'login':
      return 'Inició sesión';
    case 'logout':
      return 'Cerró sesión';
    case 'password_change':
      return 'Cambió contraseña';
    case 'permission_change':
      return `Modificó permisos de ${entityDisplay}`;
    case 'status_change':
      const statusChange = changes?.find(c => c.path.includes('status'));
      if (statusChange) {
        return `Cambió estado de ${entityDisplay}: ${statusChange.before} → ${statusChange.after}`;
      }
      return `Cambió estado de ${entityDisplay}`;
    case 'bulk_operation':
      return `Operación masiva en ${entityDisplay}`;
    default:
      return `${action} en ${entityDisplay}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Audita una creación.
 */
export async function auditCreate(
  entityType: EntityType,
  entity: Record<string, unknown>,
  actor: AuditActor,
  context: AuditContext,
  entityName?: string
): Promise<AuditRecord> {
  return audit({
    action: 'create',
    entityType,
    entityId: entity.id as string,
    entityName: entityName || (entity.name as string),
    actor,
    context,
    after: entity,
  });
}

/**
 * Audita una actualización.
 */
export async function auditUpdate(
  entityType: EntityType,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  actor: AuditActor,
  context: AuditContext,
  entityName?: string
): Promise<AuditRecord> {
  return audit({
    action: 'update',
    entityType,
    entityId,
    entityName: entityName || (after.name as string),
    actor,
    context,
    before,
    after,
  });
}

/**
 * Audita una eliminación.
 */
export async function auditDelete(
  entityType: EntityType,
  entity: Record<string, unknown>,
  actor: AuditActor,
  context: AuditContext,
  entityName?: string
): Promise<AuditRecord> {
  return audit({
    action: 'delete',
    entityType,
    entityId: entity.id as string,
    entityName: entityName || (entity.name as string),
    actor,
    context,
    before: entity,
  });
}

/**
 * Audita un cambio de estado.
 */
export async function auditStatusChange(
  entityType: EntityType,
  entityId: string,
  fromStatus: string,
  toStatus: string,
  actor: AuditActor,
  context: AuditContext,
  entityName?: string,
  reason?: string
): Promise<AuditRecord> {
  return audit({
    action: 'status_change',
    entityType,
    entityId,
    entityName,
    actor,
    context,
    before: { status: fromStatus },
    after: { status: toStatus },
    description: reason 
      ? `Cambió estado: ${fromStatus} → ${toStatus}. Razón: ${reason}`
      : `Cambió estado: ${fromStatus} → ${toStatus}`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditQuery {
  entityType?: EntityType;
  entityId?: string;
  actorId?: string;
  buildingId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  fromDate?: string;
  toDate?: string;
  searchText?: string;
  limit?: number;
  offset?: number;
}

/**
 * Busca registros de auditoría.
 */
export async function queryAudit(query: AuditQuery): Promise<{
  records: AuditRecord[];
  total: number;
}> {
  const allRecords = await auditRepository.findMany({
    orderBy: { field: 'timestamp', direction: 'desc' },
  });
  
  let filtered = allRecords as AuditRecord[];
  
  // Aplicar filtros
  if (query.entityType) {
    filtered = filtered.filter(r => r.entityType === query.entityType);
  }
  
  if (query.entityId) {
    filtered = filtered.filter(r => r.entityId === query.entityId);
  }
  
  if (query.actorId) {
    filtered = filtered.filter(r => r.actor.userId === query.actorId);
  }
  
  if (query.buildingId) {
    filtered = filtered.filter(r => r.context.buildingId === query.buildingId);
  }
  
  if (query.action) {
    filtered = filtered.filter(r => r.action === query.action);
  }
  
  if (query.severity) {
    filtered = filtered.filter(r => r.severity === query.severity);
  }
  
  if (query.fromDate) {
    filtered = filtered.filter(r => r.timestamp >= query.fromDate!);
  }
  
  if (query.toDate) {
    filtered = filtered.filter(r => r.timestamp <= query.toDate!);
  }
  
  if (query.searchText) {
    const search = query.searchText.toLowerCase();
    filtered = filtered.filter(r => 
      r.searchableText?.includes(search) || 
      r.description.toLowerCase().includes(search)
    );
  }
  
  const total = filtered.length;
  
  // Paginación
  const limit = query.limit || 50;
  const offset = query.offset || 0;
  const records = filtered.slice(offset, offset + limit);
  
  return { records, total };
}

/**
 * Obtiene historial de una entidad específica.
 */
export async function getEntityHistory(
  entityType: EntityType,
  entityId: string,
  limit = 100
): Promise<AuditRecord[]> {
  const result = await queryAudit({
    entityType,
    entityId,
    limit,
  });
  
  return result.records;
}

/**
 * Obtiene actividad de un usuario.
 */
export async function getUserActivity(
  userId: string,
  fromDate?: string,
  limit = 100
): Promise<AuditRecord[]> {
  const result = await queryAudit({
    actorId: userId,
    fromDate,
    limit,
  });
  
  return result.records;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  audit,
  auditCreate,
  auditUpdate,
  auditDelete,
  auditStatusChange,
  queryAudit,
  getEntityHistory,
  getUserActivity,
  sanitizeForAudit,
  calculateSeverity,
};
