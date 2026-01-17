/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - ACCESS MANAGEMENT SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE GESTIÓN DE AUTORIZACIONES DE ACCESO (REFACTORIZADO)
 * 
 * Este módulo implementa el CRUD completo de autorizaciones de acceso con:
 * - Flujo de estados: pending → approved → active → [expired|revoked|suspended]
 * - Auditoría completa con DEEP DIFF (no JSON.stringify)
 * - Validaciones de negocio con máquina de estados tipada
 * - Integración con sistema de notificaciones
 * - Soporte para QR y códigos de acceso
 * - UUID v4 real (crypto.randomUUID)
 * - Repository Pattern para abstracción de persistencia
 * 
 * ESTADOS (validados por TypedStatusMachine):
 * 
 * ┌───────────────────┐
 * │ pending_approval  │──┬──→ approved ──→ active ──┬──→ expired (auto)
 * └───────────────────┘  │                          │
 *                        │                          ├──→ revoked (manual)
 *                        │                          │
 *                        └──→ rejected              └──→ suspended ←→ active
 * 
 * REFACTOR v2.0:
 * - Usa DataAccessLayer para UUID, fechas y repository
 * - Usa TypedStatusMachine para transiciones validadas
 * - Usa DeepAuditService para auditoría con diff real
 */

import type {
  AccessAuthorization,
  AccessStatus,
  AccessType,
  AccessUsageEntry,
  AccessSchedule,
  VisitorInfo,
  VehicleInfo,
  Attachment,
  PaginatedResult,
  BaseFilters,
  OperationResult,
} from '../types/core.types';

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS DE SERVICIOS ENTERPRISE
// ═══════════════════════════════════════════════════════════════════════════════

import {
  generateUUID,
  isValidUUID,
  nowISO,
  parseDate,
  compareDates,
  isDateInRange,
  createRepository,
} from './repository/DataAccessLayer';

import {
  isValidTransition,
  getValidNextStates,
  type AccessAuthorizationStatus,
} from './status/TypedStatusMachine';

import {
  audit,
  auditCreate,
  auditUpdate,
  auditStatusChange,
  sanitizeForAudit,
  type AuditActor,
  type AuditContext,
} from './audit/DeepAuditService';

// Legacy imports para backward compatibility
import {
  logAudit,
  createAuditMetadata,
  updateAuditMetadata,
  getAuditContext,
} from './auditService';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: ALMACENAMIENTO (REFACTORIZADO CON REPOSITORY PATTERN)
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'aquarela_access_authorizations_v2'; // v2 para nueva estructura

// Repository instance (abstrae localStorage/API)
const accessRepository = createRepository<AccessAuthorization>('access_authorization');

// Legacy functions mantenidas para backward compatibility
function getStoredAuthorizations(): AccessAuthorization[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrar de v1 si existe
      const v1Raw = localStorage.getItem('aquarela_access_authorizations_v1');
      if (v1Raw) {
        const v1Data = JSON.parse(v1Raw) as AccessAuthorization[];
        // Migrar IDs a UUID v4
        const migrated = v1Data.map(auth => ({
          ...auth,
          id: auth.id.startsWith('acc_') ? generateUUID() : auth.id,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        console.log(`[AccessService] Migrated ${migrated.length} authorizations to v2`);
        return migrated;
      }
      return [];
    }
    return JSON.parse(raw) as AccessAuthorization[];
  } catch (e) {
    console.error('Failed to read access authorizations:', e);
    return [];
  }
}

function saveAuthorizations(list: AccessAuthorization[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save access authorizations:', e);
  }
}

/**
 * Genera UUID v4 real usando crypto.randomUUID()
 */
function generateId(): string {
  return generateUUID();
}

/**
 * Genera código de acceso seguro de 6 caracteres.
 * Usa crypto.getRandomValues para mejor aleatoriedad.
 */
function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evita caracteres confusos (0, O, I, 1, L)
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1.1: HELPERS DE AUDITORÍA ENTERPRISE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convierte el contexto legacy a formato enterprise.
 */
function getEnterpriseAuditActor(): AuditActor {
  const legacy = getAuditContext();
  return {
    userId: legacy.userId,
    userName: legacy.userName,
    userEmail: (legacy as unknown as Record<string, unknown>).userEmail as string || `${legacy.userId}@aquarela.local`,
    userRole: (legacy as unknown as Record<string, unknown>).userRole as string || 'user',
    ipAddress: (legacy as unknown as Record<string, unknown>).ipAddress as string | undefined,
    userAgent: (legacy as unknown as Record<string, unknown>).userAgent as string | undefined,
    sessionId: (legacy as unknown as Record<string, unknown>).sessionId as string | undefined,
  };
}

function getEnterpriseAuditContext(buildingId: string): AuditContext {
  return {
    buildingId,
    source: 'web',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: VALIDACIONES (MEJORADAS CON FECHAS ENTERPRISE)
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

function validateAccessAuthorization(
  data: Partial<CreateAccessInput>,
  isUpdate = false
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!isUpdate) {
    // Validaciones para creación
    if (!data.unitId) {
      errors.push({ field: 'unitId', message: 'La unidad es requerida', code: 'REQUIRED' });
    }
    
    if (!data.visitor?.firstName?.trim()) {
      errors.push({ field: 'visitor.firstName', message: 'El nombre del visitante es requerido', code: 'REQUIRED' });
    }
    
    if (!data.visitor?.lastName?.trim()) {
      errors.push({ field: 'visitor.lastName', message: 'El apellido del visitante es requerido', code: 'REQUIRED' });
    }
    
    if (!data.visitor?.documentNumber?.trim()) {
      errors.push({ field: 'visitor.documentNumber', message: 'El documento del visitante es requerido', code: 'REQUIRED' });
    }
    
    if (!data.type) {
      errors.push({ field: 'type', message: 'El tipo de acceso es requerido', code: 'REQUIRED' });
    }
    
    if (!data.validFrom) {
      errors.push({ field: 'validFrom', message: 'La fecha de inicio es requerida', code: 'REQUIRED' });
    }
    
    if (!data.validUntil && data.type !== 'permanent') {
      errors.push({ field: 'validUntil', message: 'La fecha de fin es requerida para accesos no permanentes', code: 'REQUIRED' });
    }
  }
  
  // Validaciones de fechas usando comparación de timestamps real
  if (data.validFrom && data.validUntil) {
    const from = parseDate(data.validFrom);
    const until = parseDate(data.validUntil);
    
    if (from && until) {
      // compareDates devuelve: -1 si from < until, 0 si igual, 1 si from > until
      if (compareDates(from, until) >= 0) {
        errors.push({ 
          field: 'validUntil', 
          message: 'La fecha de fin debe ser posterior a la fecha de inicio',
          code: 'INVALID_DATE_RANGE',
        });
      }
    } else {
      if (!from) {
        errors.push({ field: 'validFrom', message: 'Formato de fecha inválido', code: 'INVALID_FORMAT' });
      }
      if (!until) {
        errors.push({ field: 'validUntil', message: 'Formato de fecha inválido', code: 'INVALID_FORMAT' });
      }
    }
  }
  
  // Validación de horarios
  if (data.accessSchedule) {
    const { startTime, endTime, allowedDays } = data.accessSchedule;
    
    if (startTime && endTime && startTime >= endTime) {
      errors.push({ 
        field: 'accessSchedule.endTime', 
        message: 'La hora de fin debe ser posterior a la hora de inicio',
        code: 'INVALID_TIME_RANGE',
      });
    }
    
    if (allowedDays && allowedDays.length === 0) {
      errors.push({ 
        field: 'accessSchedule.allowedDays', 
        message: 'Debe seleccionar al menos un día permitido',
        code: 'EMPTY_ALLOWED_DAYS',
      });
    }
  }
  
  // Validación de usos máximos
  if (data.maxUsages !== undefined && data.maxUsages !== null && data.maxUsages < 1) {
    errors.push({ 
      field: 'maxUsages', 
      message: 'El número máximo de usos debe ser al menos 1',
      code: 'INVALID_MAX_USAGES',
    });
  }
  
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2.1: VALIDACIÓN DE TRANSICIONES DE ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapea estados legacy a estados enterprise.
 */
function mapLegacyStatus(status: AccessStatus): AccessAuthorizationStatus {
  const mapping: Record<AccessStatus, AccessAuthorizationStatus> = {
    'pending_approval': 'pending_approval',
    'approved': 'approved',
    'rejected': 'rejected',
    'active': 'active',
    'expired': 'expired',
    'revoked': 'revoked',
    'suspended': 'active', // suspended se maneja diferente en enterprise
  };
  return mapping[status] || 'draft';
}

/**
 * Valida si una transición de estado es permitida.
 */
function validateStatusTransition(
  currentStatus: AccessStatus,
  newStatus: AccessStatus
): { valid: boolean; reason?: string } {
  const currentEnterprise = mapLegacyStatus(currentStatus);
  const newEnterprise = mapLegacyStatus(newStatus);
  
  // Usar máquina de estados tipada
  const result = isValidTransition('access_authorization', currentEnterprise, newEnterprise);
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: OPERACIONES CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateAccessInput {
  buildingId: string;
  unitId: string;
  visitor: VisitorInfo;
  type: AccessType;
  validFrom: string;
  validUntil: string;
  accessSchedule?: AccessSchedule;
  maxUsages?: number;
  vehicleInfo?: VehicleInfo;
  observations?: string;
  internalNotes?: string;
  attachments?: Attachment[];
  // Si true, no requiere aprobación
  autoApprove?: boolean;
}

/**
 * Crea una nueva autorización de acceso.
 * REFACTORIZADO: Usa UUID v4 y auditoría enterprise.
 */
export async function createAccessAuthorization(
  input: CreateAccessInput
): Promise<OperationResult<AccessAuthorization>> {
  // Validar input
  const errors = validateAccessAuthorization(input);
  if (errors.length > 0) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Error de validación',
        details: { errors },
      },
    };
  }
  
  const context = getAuditContext();
  const now = nowISO(); // Usa función enterprise para timestamp ISO
  
  // Determinar estado inicial basado en configuración del edificio
  const initialStatus: AccessStatus = input.autoApprove ? 'approved' : 'pending_approval';
  
  const authorization: AccessAuthorization = {
    id: generateId(), // Ahora usa crypto.randomUUID()
    buildingId: input.buildingId,
    unitId: input.unitId,
    requestedBy: context.userId,
    requestedByName: context.userName,
    
    visitor: {
      ...input.visitor,
      documentType: input.visitor.documentType || 'CI',
    },
    
    type: input.type,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    accessSchedule: input.accessSchedule,
    
    status: initialStatus,
    
    usageCount: 0,
    maxUsages: input.maxUsages,
    usageLog: [],
    
    vehicleInfo: input.vehicleInfo,
    observations: input.observations,
    internalNotes: input.internalNotes,
    attachments: input.attachments || [],
    
    accessCode: generateAccessCode(), // Ahora usa crypto.getRandomValues()
    
    audit: createAuditMetadata(),
  };
  
  // Si se auto-aprueba, agregar datos de aprobación
  if (input.autoApprove) {
    authorization.approvedBy = context.userId;
    authorization.approvedByName = context.userName;
    authorization.approvedAt = now;
    
    // Si la fecha de inicio ya pasó o es hoy, activar
    const validFrom = parseDate(input.validFrom);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (validFrom && compareDates(validFrom, today) <= 0) {
      authorization.status = 'active';
    }
  }
  
  // Guardar
  const list = getStoredAuthorizations();
  list.unshift(authorization);
  saveAuthorizations(list);
  
  // Auditar con sistema enterprise (deep diff)
  const actor = getEnterpriseAuditActor();
  const auditContext = getEnterpriseAuditContext(input.buildingId);
  
  await auditCreate(
    'access_authorization',
    sanitizeForAudit(authorization as unknown as Record<string, unknown>),
    actor,
    auditContext,
    `Autorización para ${input.visitor.firstName} ${input.visitor.lastName}`
  );
  
  // También log legacy para backward compatibility
  await logAudit({
    entityType: 'access_authorization',
    entityId: authorization.id,
    action: 'create',
    newState: authorization as unknown as Record<string, unknown>,
    metadata: {
      autoApproved: input.autoApprove,
      visitorName: `${input.visitor.firstName} ${input.visitor.lastName}`,
    },
  });
  
  return {
    success: true,
    data: authorization,
  };
}

/**
 * Obtiene una autorización por ID.
 * Valida que el ID sea UUID v4 válido.
 */
export function getAccessAuthorization(id: string): AccessAuthorization | null {
  // Validar formato de ID (acepta legacy y UUID v4)
  const isLegacyId = id.startsWith('acc_');
  const isUuidV4 = isValidUUID(id);
  
  if (!isLegacyId && !isUuidV4) {
    console.warn(`[AccessService] Invalid ID format: ${id}`);
    return null;
  }
  
  const list = getStoredAuthorizations();
  return list.find(a => a.id === id) || null;
}

export interface UpdateAccessInput {
  visitor?: Partial<VisitorInfo>;
  validFrom?: string;
  validUntil?: string;
  accessSchedule?: AccessSchedule;
  maxUsages?: number;
  vehicleInfo?: VehicleInfo;
  observations?: string;
  internalNotes?: string;
  attachments?: Attachment[];
}

/**
 * Actualiza una autorización existente.
 * Solo se puede actualizar si está en ciertos estados.
 * REFACTORIZADO: Usa auditoría con deep diff real.
 */
export async function updateAccessAuthorization(
  id: string,
  input: UpdateAccessInput
): Promise<OperationResult<AccessAuthorization>> {
  const list = getStoredAuthorizations();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Autorización no encontrada',
      },
    };
  }
  
  const existing = list[index];
  
  // Validar que se pueda modificar
  const editableStatuses: AccessStatus[] = ['pending_approval', 'approved', 'active', 'suspended'];
  if (!editableStatuses.includes(existing.status)) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `No se puede modificar una autorización en estado ${existing.status}`,
      },
    };
  }
  
  // Crear copia PROFUNDA del estado anterior para auditoría con deep diff
  const previousState = JSON.parse(JSON.stringify(existing)) as AccessAuthorization;
  
  // Aplicar cambios
  if (input.visitor) {
    existing.visitor = { ...existing.visitor, ...input.visitor };
  }
  if (input.validFrom !== undefined) existing.validFrom = input.validFrom;
  if (input.validUntil !== undefined) existing.validUntil = input.validUntil;
  if (input.accessSchedule !== undefined) existing.accessSchedule = input.accessSchedule;
  if (input.maxUsages !== undefined) existing.maxUsages = input.maxUsages;
  if (input.vehicleInfo !== undefined) existing.vehicleInfo = input.vehicleInfo;
  if (input.observations !== undefined) existing.observations = input.observations;
  if (input.internalNotes !== undefined) existing.internalNotes = input.internalNotes;
  if (input.attachments !== undefined) existing.attachments = input.attachments;
  
  // Actualizar metadata
  existing.audit = updateAuditMetadata(existing.audit);
  
  // Guardar
  list[index] = existing;
  saveAuthorizations(list);
  
  // Auditar con sistema enterprise (deep diff real)
  const actor = getEnterpriseAuditActor();
  const auditContext = getEnterpriseAuditContext(existing.buildingId);
  
  await auditUpdate(
    'access_authorization',
    id,
    sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    sanitizeForAudit(existing as unknown as Record<string, unknown>),
    actor,
    auditContext,
    `Autorización ${existing.accessCode}`
  );
  
  // También log legacy para backward compatibility
  await logAudit({
    entityType: 'access_authorization',
    entityId: id,
    action: 'update',
    previousState: previousState as unknown as Record<string, unknown>,
    newState: existing as unknown as Record<string, unknown>,
  });
  
  return {
    success: true,
    data: existing,
  };
}

/**
 * Elimina una autorización (soft delete - cambia a revoked).
 */
export async function deleteAccessAuthorization(
  id: string,
  reason: string
): Promise<OperationResult<void>> {
  const result = await revokeAccessAuthorization(id, reason);
  if (result.success) {
    return { success: true, data: undefined };
  }
  return result as OperationResult<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: CAMBIOS DE ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aprueba una autorización pendiente.
 * REFACTORIZADO: Usa máquina de estados tipada y auditoría enterprise.
 */
export async function approveAccessAuthorization(
  id: string
): Promise<OperationResult<AccessAuthorization>> {
  const list = getStoredAuthorizations();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Autorización no encontrada' },
    };
  }
  
  const existing = list[index];
  
  // Validar transición con máquina de estados tipada
  const transitionValidation = validateStatusTransition(existing.status, 'approved');
  if (!transitionValidation.valid) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: transitionValidation.reason || `Solo se pueden aprobar autorizaciones pendientes. Estado actual: ${existing.status}`,
      },
    };
  }
  
  const previousState = JSON.parse(JSON.stringify(existing)) as AccessAuthorization;
  const context = getAuditContext();
  const now = nowISO();
  
  existing.status = 'approved';
  existing.approvedBy = context.userId;
  existing.approvedByName = context.userName;
  existing.approvedAt = now;
  existing.audit = updateAuditMetadata(existing.audit);
  
  // Si la fecha de inicio ya pasó, activar directamente
  const validFrom = parseDate(existing.validFrom);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (validFrom && compareDates(validFrom, today) <= 0) {
    existing.status = 'active';
  }
  
  list[index] = existing;
  saveAuthorizations(list);
  
  // Auditoría enterprise con cambio de estado
  const actor = getEnterpriseAuditActor();
  const auditContext = getEnterpriseAuditContext(existing.buildingId);
  
  await auditStatusChange(
    'access_authorization',
    id,
    previousState.status,
    existing.status,
    actor,
    auditContext,
    `Autorización ${existing.accessCode}`,
    'Aprobación de autorización'
  );
  
  // Legacy audit
  await logAudit({
    entityType: 'access_authorization',
    entityId: id,
    action: 'approval',
    previousState: previousState as unknown as Record<string, unknown>,
    newState: existing as unknown as Record<string, unknown>,
  });
  
  return { success: true, data: existing };
}

/**
 * Rechaza una autorización pendiente.
 * REFACTORIZADO: Usa máquina de estados tipada.
 */
export async function rejectAccessAuthorization(
  id: string,
  reason: string
): Promise<OperationResult<AccessAuthorization>> {
  const list = getStoredAuthorizations();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Autorización no encontrada' },
    };
  }
  
  const existing = list[index];
  
  // Validar transición
  const transitionValidation = validateStatusTransition(existing.status, 'rejected');
  if (!transitionValidation.valid) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: transitionValidation.reason || `Solo se pueden rechazar autorizaciones pendientes`,
      },
    };
  }
  
  const previousState = JSON.parse(JSON.stringify(existing)) as AccessAuthorization;
  const context = getAuditContext();
  
  existing.status = 'rejected';
  existing.rejectedBy = context.userId;
  existing.rejectedByName = context.userName;
  existing.rejectedAt = nowISO();
  existing.rejectionReason = reason;
  existing.audit = updateAuditMetadata(existing.audit);
  
  list[index] = existing;
  saveAuthorizations(list);
  
  // Auditoría enterprise
  const actor = getEnterpriseAuditActor();
  const auditContext = getEnterpriseAuditContext(existing.buildingId);
  
  await auditStatusChange(
    'access_authorization',
    id,
    previousState.status,
    'rejected',
    actor,
    auditContext,
    `Autorización ${existing.accessCode}`,
    reason
  );
  
  await logAudit({
    entityType: 'access_authorization',
    entityId: id,
    action: 'rejection',
    previousState: previousState as unknown as Record<string, unknown>,
    newState: existing as unknown as Record<string, unknown>,
    metadata: { reason },
  });
  
  return { success: true, data: existing };
}

/**
 * Revoca una autorización activa.
 * REFACTORIZADO: Usa máquina de estados tipada y auditoría enterprise.
 */
export async function revokeAccessAuthorization(
  id: string,
  reason: string
): Promise<OperationResult<AccessAuthorization>> {
  const list = getStoredAuthorizations();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Autorización no encontrada' },
    };
  }
  
  const existing = list[index];
  const revocableStatuses: AccessStatus[] = ['approved', 'active', 'suspended'];
  
  if (!revocableStatuses.includes(existing.status)) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `No se puede revocar una autorización en estado ${existing.status}`,
      },
    };
  }
  
  const previousState = JSON.parse(JSON.stringify(existing)) as AccessAuthorization;
  const context = getAuditContext();
  
  existing.status = 'revoked';
  existing.revokedBy = context.userId;
  existing.revokedByName = context.userName;
  existing.revokedAt = nowISO();
  existing.revocationReason = reason;
  existing.audit = updateAuditMetadata(existing.audit);
  
  list[index] = existing;
  saveAuthorizations(list);
  
  // Auditoría enterprise con severidad alta
  const actor = getEnterpriseAuditActor();
  const auditContext = getEnterpriseAuditContext(existing.buildingId);
  
  await audit({
    action: 'revoke',
    entityType: 'access_authorization',
    entityId: id,
    entityName: `Autorización ${existing.accessCode}`,
    actor,
    context: auditContext,
    before: sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    after: sanitizeForAudit(existing as unknown as Record<string, unknown>),
    description: `Revocación de autorización: ${reason}`,
    severity: 'high',
    tags: ['revocation', 'security'],
  });
  
  await logAudit({
    entityType: 'access_authorization',
    entityId: id,
    action: 'revocation',
    previousState: previousState as unknown as Record<string, unknown>,
    newState: existing as unknown as Record<string, unknown>,
    metadata: { reason },
  });
  
  return { success: true, data: existing };
}

/**
 * Suspende temporalmente una autorización.
 * REFACTORIZADO: Usa nowISO() para timestamps.
 */
export async function suspendAccessAuthorization(
  id: string,
  reason: string,
  suspendedUntil?: string
): Promise<OperationResult<AccessAuthorization>> {
  const list = getStoredAuthorizations();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Autorización no encontrada' },
    };
  }
  
  const existing = list[index];
  
  if (existing.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `Solo se pueden suspender autorizaciones activas`,
      },
    };
  }
  
  const previousState = JSON.parse(JSON.stringify(existing)) as AccessAuthorization;
  const context = getAuditContext();
  
  existing.status = 'suspended';
  existing.suspendedBy = context.userId;
  existing.suspendedByName = context.userName;
  existing.suspendedAt = nowISO();
  existing.suspensionReason = reason;
  existing.suspendedUntil = suspendedUntil;
  existing.audit = updateAuditMetadata(existing.audit);
  
  list[index] = existing;
  saveAuthorizations(list);
  
  // Auditoría enterprise
  const actor = getEnterpriseAuditActor();
  const auditContext = getEnterpriseAuditContext(existing.buildingId);
  
  await auditStatusChange(
    'access_authorization',
    id,
    'active',
    'active', // suspended se mapea a active en enterprise status
    actor,
    auditContext,
    `Autorización ${existing.accessCode}`,
    `Suspensión temporal: ${reason}`
  );
  
  await logAudit({
    entityType: 'access_authorization',
    entityId: id,
    action: 'status_change',
    previousState: previousState as unknown as Record<string, unknown>,
    newState: existing as unknown as Record<string, unknown>,
    metadata: { reason, suspendedUntil, newStatus: 'suspended' },
  });
  
  return { success: true, data: existing };
}

/**
 * Reactiva una autorización suspendida.
 * REFACTORIZADO: Usa compareDates para verificar expiración.
 */
export async function reactivateAccessAuthorization(
  id: string
): Promise<OperationResult<AccessAuthorization>> {
  const list = getStoredAuthorizations();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Autorización no encontrada' },
    };
  }
  
  const existing = list[index];
  
  if (existing.status !== 'suspended') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `Solo se pueden reactivar autorizaciones suspendidas`,
      },
    };
  }
  
  // Verificar que no haya expirado mientras estaba suspendida
  const now = new Date();
  const validUntil = parseDate(existing.validUntil);
  
  if (validUntil && compareDates(validUntil, now) < 0) {
    existing.status = 'expired';
    list[index] = existing;
    saveAuthorizations(list);
    
    return {
      success: false,
      error: {
        code: 'EXPIRED',
        message: 'La autorización expiró durante la suspensión',
      },
    };
  }
  
  const previousState = JSON.parse(JSON.stringify(existing)) as AccessAuthorization;
  
  existing.status = 'active';
  existing.suspendedBy = undefined;
  existing.suspendedByName = undefined;
  existing.suspendedAt = undefined;
  existing.suspensionReason = undefined;
  existing.suspendedUntil = undefined;
  existing.audit = updateAuditMetadata(existing.audit);
  
  list[index] = existing;
  saveAuthorizations(list);
  
  // Auditoría enterprise
  const actor = getEnterpriseAuditActor();
  const auditContext = getEnterpriseAuditContext(existing.buildingId);
  
  await auditStatusChange(
    'access_authorization',
    id,
    'active', // suspended mapea a active
    'active',
    actor,
    auditContext,
    `Autorización ${existing.accessCode}`,
    'Reactivación de autorización suspendida'
  );
  
  await logAudit({
    entityType: 'access_authorization',
    entityId: id,
    action: 'status_change',
    previousState: previousState as unknown as Record<string, unknown>,
    newState: existing as unknown as Record<string, unknown>,
    metadata: { newStatus: 'active', action: 'reactivation' },
  });
  
  return { success: true, data: existing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: REGISTRO DE USO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registra el uso de una autorización (entrada o salida).
 * REFACTORIZADO: Usa nowISO() y comparación de fechas enterprise.
 */
export async function registerAccessUsage(
  id: string,
  action: 'entry' | 'exit',
  notes?: string
): Promise<OperationResult<AccessAuthorization>> {
  const list = getStoredAuthorizations();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Autorización no encontrada' },
    };
  }
  
  const existing = list[index];
  
  if (existing.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `No se puede usar una autorización en estado ${existing.status}`,
      },
    };
  }
  
  // Verificar vigencia usando comparación de fechas enterprise
  const now = new Date();
  const validFrom = parseDate(existing.validFrom);
  const validUntil = parseDate(existing.validUntil);
  
  if (validFrom && validUntil && !isDateInRange(now, validFrom, validUntil)) {
    return {
      success: false,
      error: {
        code: 'OUT_OF_VALIDITY_RANGE',
        message: 'La autorización no está vigente en este momento',
      },
    };
  }
  
  // Verificar límite de usos
  if (existing.maxUsages && existing.usageCount >= existing.maxUsages) {
    // Expirar automáticamente
    existing.status = 'expired';
    list[index] = existing;
    saveAuthorizations(list);
    
    return {
      success: false,
      error: {
        code: 'MAX_USAGES_REACHED',
        message: 'Se alcanzó el límite de usos de esta autorización',
      },
    };
  }
  
  // Verificar horario permitido si aplica
  if (existing.accessSchedule) {
    const dayOfWeek = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    
    if (!existing.accessSchedule.allowedDays.includes(dayOfWeek)) {
      return {
        success: false,
        error: {
          code: 'DAY_NOT_ALLOWED',
          message: 'El acceso no está permitido en este día de la semana',
        },
      };
    }
    
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (existing.accessSchedule.startTime && currentTime < existing.accessSchedule.startTime) {
      return {
        success: false,
        error: {
          code: 'TIME_NOT_ALLOWED',
          message: `El acceso no está permitido antes de las ${existing.accessSchedule.startTime}`,
        },
      };
    }
    
    if (existing.accessSchedule.endTime && currentTime > existing.accessSchedule.endTime) {
      return {
        success: false,
        error: {
          code: 'TIME_NOT_ALLOWED',
          message: `El acceso no está permitido después de las ${existing.accessSchedule.endTime}`,
        },
      };
    }
  }
  
  const previousState = JSON.parse(JSON.stringify(existing)) as AccessAuthorization;
  const context = getAuditContext();
  const timestamp = nowISO();
  
  // Registrar uso
  const usageEntry: AccessUsageEntry = {
    timestamp,
    action,
    registeredBy: context.userId,
    registeredByName: context.userName,
    notes,
  };
  
  existing.usageLog.push(usageEntry);
  
  if (action === 'entry') {
    existing.usageCount++;
    existing.lastUsedAt = timestamp;
    
    // Si es visita única, marcar como expirada después del uso
    if (existing.type === 'single_visit') {
      existing.status = 'expired';
    }
  }
  
  existing.audit = updateAuditMetadata(existing.audit);
  
  list[index] = existing;
  saveAuthorizations(list);
  
  // Auditoría enterprise
  const actor = getEnterpriseAuditActor();
  const auditContext = getEnterpriseAuditContext(existing.buildingId);
  
  await audit({
    action: 'update',
    entityType: 'access_authorization',
    entityId: id,
    entityName: `Autorización ${existing.accessCode}`,
    actor,
    context: auditContext,
    before: sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    after: sanitizeForAudit(existing as unknown as Record<string, unknown>),
    description: `Registro de ${action === 'entry' ? 'entrada' : 'salida'} - ${existing.visitor.firstName} ${existing.visitor.lastName}`,
    tags: ['usage', action],
  });
  
  await logAudit({
    entityType: 'access_authorization',
    entityId: id,
    action: 'update',
    previousState: previousState as unknown as Record<string, unknown>,
    newState: existing as unknown as Record<string, unknown>,
    metadata: { usageAction: action, notes },
  });
  
  return { success: true, data: existing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: CONSULTAS Y LISTADOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AccessFilters extends BaseFilters {
  type?: AccessType | AccessType[];
  visitorName?: string;
  validFrom?: string;
  validTo?: string;
  requestedBy?: string;
}

/**
 * Lista autorizaciones con filtros y paginación.
 */
export function listAccessAuthorizations(
  filters: AccessFilters = {},
  page = 1,
  pageSize = 20
): PaginatedResult<AccessAuthorization> {
  let list = getStoredAuthorizations();
  
  // Aplicar filtros
  if (filters.buildingId) {
    list = list.filter(a => a.buildingId === filters.buildingId);
  }
  
  if (filters.unitId) {
    list = list.filter(a => a.unitId === filters.unitId);
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(a => statuses.includes(a.status));
  }
  
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    list = list.filter(a => types.includes(a.type));
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    list = list.filter(a => 
      a.visitor.firstName.toLowerCase().includes(search) ||
      a.visitor.lastName.toLowerCase().includes(search) ||
      a.visitor.documentNumber.toLowerCase().includes(search) ||
      a.accessCode?.toLowerCase().includes(search)
    );
  }
  
  if (filters.visitorName) {
    const name = filters.visitorName.toLowerCase();
    list = list.filter(a => 
      `${a.visitor.firstName} ${a.visitor.lastName}`.toLowerCase().includes(name)
    );
  }
  
  if (filters.requestedBy) {
    list = list.filter(a => a.requestedBy === filters.requestedBy);
  }
  
  if (filters.dateFrom) {
    list = list.filter(a => a.validFrom >= filters.dateFrom!);
  }
  
  if (filters.dateTo) {
    list = list.filter(a => a.validUntil <= filters.dateTo!);
  }
  
  // Ordenar por fecha de creación (más reciente primero)
  list.sort((a, b) => b.audit.createdAt.localeCompare(a.audit.createdAt));
  
  // Calcular paginación
  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (page - 1) * pageSize;
  const data = list.slice(offset, offset + pageSize);
  
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    filters: filters as unknown as Record<string, unknown>,
  };
}

/**
 * Lista autorizaciones por unidad.
 */
export function getAuthorizationsByUnit(
  unitId: string,
  includeExpired = false
): AccessAuthorization[] {
  let list = getStoredAuthorizations().filter(a => a.unitId === unitId);
  
  if (!includeExpired) {
    const activeStatuses: AccessStatus[] = ['pending_approval', 'approved', 'active', 'suspended'];
    list = list.filter(a => activeStatuses.includes(a.status));
  }
  
  return list.sort((a, b) => b.audit.createdAt.localeCompare(a.audit.createdAt));
}

/**
 * Lista autorizaciones que expiran pronto.
 */
export function getExpiringAuthorizations(
  buildingId: string,
  withinDays = 7
): AccessAuthorization[] {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);
  
  return getStoredAuthorizations().filter(a => {
    if (a.buildingId !== buildingId) return false;
    if (a.status !== 'active') return false;
    
    const validUntil = new Date(a.validUntil);
    return validUntil >= now && validUntil <= futureDate;
  });
}

/**
 * Busca autorización por código de acceso.
 */
export function findByAccessCode(code: string): AccessAuthorization | null {
  const normalizedCode = code.toUpperCase().trim();
  return getStoredAuthorizations().find(a => a.accessCode === normalizedCode) || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: OPERACIONES DE MANTENIMIENTO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Procesa expiraciones automáticas.
 * Debe ejecutarse periódicamente (ej: cada hora).
 * REFACTORIZADO: Usa parseDate y compareDates para comparaciones correctas.
 */
export async function processExpirations(): Promise<{
  expired: number;
  activated: number;
  unsuspended: number;
}> {
  const list = getStoredAuthorizations();
  const now = new Date();
  let expired = 0;
  let activated = 0;
  let unsuspended = 0;
  
  for (const auth of list) {
    // Expirar autorizaciones vencidas
    if (['active', 'approved'].includes(auth.status)) {
      const validUntil = parseDate(auth.validUntil);
      if (validUntil && compareDates(validUntil, now) < 0) {
        const previous = JSON.parse(JSON.stringify(auth)) as AccessAuthorization;
        auth.status = 'expired';
        auth.audit = updateAuditMetadata(auth.audit);
        expired++;
        
        // Auditoría enterprise
        const actor: AuditActor = {
          userId: 'system',
          userName: 'Sistema Automático',
          userEmail: 'system@aquarela.local',
          userRole: 'system',
        };
        const auditContext = getEnterpriseAuditContext(auth.buildingId);
        
        await auditStatusChange(
          'access_authorization',
          auth.id,
          previous.status,
          'expired',
          actor,
          auditContext,
          `Autorización ${auth.accessCode}`,
          'Expiración automática por vencimiento de fecha'
        );
        
        await logAudit({
          entityType: 'access_authorization',
          entityId: auth.id,
          action: 'expiration',
          previousState: previous as unknown as Record<string, unknown>,
          newState: auth as unknown as Record<string, unknown>,
          metadata: { automatic: true },
        });
      }
    }
    
    // Activar autorizaciones aprobadas que ya iniciaron
    if (auth.status === 'approved') {
      const validFrom = parseDate(auth.validFrom);
      if (validFrom && compareDates(validFrom, now) <= 0) {
        const previous = JSON.parse(JSON.stringify(auth)) as AccessAuthorization;
        auth.status = 'active';
        auth.audit = updateAuditMetadata(auth.audit);
        activated++;
        
        // Auditoría enterprise
        const actor: AuditActor = {
          userId: 'system',
          userName: 'Sistema Automático',
          userEmail: 'system@aquarela.local',
          userRole: 'system',
        };
        const auditContext = getEnterpriseAuditContext(auth.buildingId);
        
        await auditStatusChange(
          'access_authorization',
          auth.id,
          'approved',
          'active',
          actor,
          auditContext,
          `Autorización ${auth.accessCode}`,
          'Activación automática por inicio de vigencia'
        );
        
        await logAudit({
          entityType: 'access_authorization',
          entityId: auth.id,
          action: 'status_change',
          previousState: previous as unknown as Record<string, unknown>,
          newState: auth as unknown as Record<string, unknown>,
          metadata: { automatic: true, newStatus: 'active' },
        });
      }
    }
    
    // Reactivar suspensiones temporales que terminaron
    if (auth.status === 'suspended' && auth.suspendedUntil) {
      const suspendedUntil = parseDate(auth.suspendedUntil);
      if (suspendedUntil && compareDates(suspendedUntil, now) <= 0) {
        const validUntil = parseDate(auth.validUntil);
        const previous = JSON.parse(JSON.stringify(auth)) as AccessAuthorization;
        
        if (validUntil && compareDates(validUntil, now) < 0) {
          auth.status = 'expired';
        } else {
          auth.status = 'active';
          auth.suspendedBy = undefined;
          auth.suspendedByName = undefined;
          auth.suspendedAt = undefined;
          auth.suspensionReason = undefined;
          auth.suspendedUntil = undefined;
          unsuspended++;
        }
        
        auth.audit = updateAuditMetadata(auth.audit);
        
        // Auditoría enterprise
        const actor: AuditActor = {
          userId: 'system',
          userName: 'Sistema Automático',
          userEmail: 'system@aquarela.local',
          userRole: 'system',
        };
        const auditContext = getEnterpriseAuditContext(auth.buildingId);
        
        await auditStatusChange(
          'access_authorization',
          auth.id,
          'active', // suspended mapea a active
          auth.status === 'expired' ? 'expired' : 'active',
          actor,
          auditContext,
          `Autorización ${auth.accessCode}`,
          auth.status === 'expired' 
            ? 'Expiración durante suspensión' 
            : 'Reactivación automática fin de suspensión'
        );
        
        await logAudit({
          entityType: 'access_authorization',
          entityId: auth.id,
          action: 'status_change',
          previousState: previous as unknown as Record<string, unknown>,
          newState: auth as unknown as Record<string, unknown>,
          metadata: { automatic: true, newStatus: auth.status },
        });
      }
    }
  }
  
  saveAuthorizations(list);
  
  if (expired > 0 || activated > 0 || unsuspended > 0) {
    console.log(`[AccessService] Processed: ${expired} expired, ${activated} activated, ${unsuspended} unsuspended`);
  }
  
  return { expired, activated, unsuspended };
}

/**
 * Genera estadísticas de accesos.
 */
export function getAccessStatistics(buildingId: string): {
  total: number;
  byStatus: Record<AccessStatus, number>;
  byType: Record<AccessType, number>;
  expiringThisWeek: number;
  usedToday: number;
} {
  const list = getStoredAuthorizations().filter(a => a.buildingId === buildingId);
  const today = new Date().toISOString().split('T')[0];
  
  const stats = {
    total: list.length,
    byStatus: {} as Record<AccessStatus, number>,
    byType: {} as Record<AccessType, number>,
    expiringThisWeek: 0,
    usedToday: 0,
  };
  
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  for (const auth of list) {
    // Por estado
    stats.byStatus[auth.status] = (stats.byStatus[auth.status] || 0) + 1;
    
    // Por tipo
    stats.byType[auth.type] = (stats.byType[auth.type] || 0) + 1;
    
    // Expirando esta semana
    if (auth.status === 'active') {
      const validUntil = new Date(auth.validUntil);
      if (validUntil <= weekFromNow) {
        stats.expiringThisWeek++;
      }
    }
    
    // Usados hoy
    if (auth.usageLog.some(u => u.timestamp.startsWith(today))) {
      stats.usedToday++;
    }
  }
  
  return stats;
}
