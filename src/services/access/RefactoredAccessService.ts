/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - REFACTORED ACCESS SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Servicio de autorizaciones de acceso REFACTORIZADO con:
 * - UUID v4 real (crypto.randomUUID)
 * - Uso del DAL (Repository Pattern)
 * - Fechas con timestamps correctos
 * - Auditoría con deep diff
 * - Estados tipados
 */

import {
  generateUUID,
  isValidUUID,
  nowISO,
  parseDate,
  compareDates,
  isDateInRange,
  createRepository,
  type IRepository,
} from '../repository/DataAccessLayer';

import {
  isValidTransition,
  getValidNextStates,
  type AccessAuthorizationStatus,
  ACCESS_AUTH_STATUS_META,
} from '../status/TypedStatusMachine';

import {
  audit,
  auditCreate,
  auditUpdate,
  auditStatusChange,
  type AuditActor,
  type AuditContext,
} from '../audit/DeepAuditService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthorizedPerson {
  id: string;
  name: string;
  documentType: 'dni' | 'passport' | 'other';
  documentNumber: string;
  phone?: string;
  email?: string;
  relationship?: string;
  photoUrl?: string;
}

export interface VehicleInfo {
  licensePlate: string;
  make?: string;
  model?: string;
  color?: string;
  parkingSpot?: string;
}

export type AccessType = 
  | 'visitor'         // Visitante general
  | 'service'         // Proveedor de servicio
  | 'delivery'        // Delivery/mensajería
  | 'family'          // Familiar
  | 'contractor'      // Contratista/trabajador
  | 'tenant_guest'    // Huésped de inquilino
  | 'emergency';      // Acceso de emergencia

export type AccessScope = 
  | 'building_common' // Solo áreas comunes del edificio
  | 'unit_only'       // Solo unidad específica
  | 'unit_and_common' // Unidad + áreas comunes
  | 'restricted';     // Áreas restringidas (con aprobación especial)

export interface AccessAuthorization {
  // Identificación
  id: string;
  code: string; // Código corto para recepción (ej: AQ-2024-001234)
  
  // Propietario que autoriza
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  
  // Unidad
  buildingId: string;
  buildingName: string;
  unitId: string;
  unitNumber: string;
  
  // Persona autorizada
  person: AuthorizedPerson;
  
  // Vehículo (opcional)
  vehicle?: VehicleInfo;
  
  // Tipo y alcance
  accessType: AccessType;
  accessScope: AccessScope;
  
  // Vigencia (timestamps ISO)
  validFrom: string;
  validUntil: string;
  
  // Configuración
  maxVisits?: number;          // Null = ilimitado
  currentVisitCount: number;
  allowedDays?: number[];      // 0=Dom, 1=Lun, etc. Null = todos
  allowedTimeStart?: string;   // HH:MM
  allowedTimeEnd?: string;     // HH:MM
  
  // Estado
  status: AccessAuthorizationStatus;
  statusHistory: StatusHistoryEntry[];
  
  // Notas
  notes?: string;
  internalNotes?: string; // Solo visible para staff
  
  // Metadatos
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
  version: number;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: AccessAuthorizationStatus | null;
  toStatus: AccessAuthorizationStatus;
  changedAt: string;
  changedBy: string;
  changedByName: string;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════════

const repository = createRepository<AccessAuthorization>('access_authorization');

// Counter para códigos (en prod: secuencia en DB)
let codeCounter = Math.floor(Math.random() * 10000);

/**
 * Genera código único de autorización.
 */
function generateAccessCode(): string {
  const year = new Date().getFullYear();
  codeCounter++;
  return `AQ-${year}-${String(codeCounter).padStart(6, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateAccessAuthorizationInput {
  // Propietario
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  
  // Ubicación
  buildingId: string;
  buildingName: string;
  unitId: string;
  unitNumber: string;
  
  // Persona
  person: Omit<AuthorizedPerson, 'id'>;
  
  // Vehículo
  vehicle?: VehicleInfo;
  
  // Configuración
  accessType: AccessType;
  accessScope: AccessScope;
  validFrom: string;
  validUntil: string;
  maxVisits?: number;
  allowedDays?: number[];
  allowedTimeStart?: string;
  allowedTimeEnd?: string;
  
  // Notas
  notes?: string;
}

export async function createAccessAuthorization(
  input: CreateAccessAuthorizationInput,
  actor: AuditActor,
  context: AuditContext
): Promise<AccessAuthorization> {
  // Validar fechas
  const validFromDate = parseDate(input.validFrom);
  const validUntilDate = parseDate(input.validUntil);
  
  if (!validFromDate || !validUntilDate) {
    throw new Error('Invalid date format');
  }
  
  if (compareDates(validFromDate, validUntilDate) >= 0) {
    throw new Error('validFrom must be before validUntil');
  }
  
  const now = nowISO();
  const personId = generateUUID();
  
  const authorization: Omit<AccessAuthorization, 'id'> = {
    code: generateAccessCode(),
    
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    
    buildingId: input.buildingId,
    buildingName: input.buildingName,
    unitId: input.unitId,
    unitNumber: input.unitNumber,
    
    person: {
      ...input.person,
      id: personId,
    },
    
    vehicle: input.vehicle,
    
    accessType: input.accessType,
    accessScope: input.accessScope,
    
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    
    maxVisits: input.maxVisits,
    currentVisitCount: 0,
    allowedDays: input.allowedDays,
    allowedTimeStart: input.allowedTimeStart,
    allowedTimeEnd: input.allowedTimeEnd,
    
    status: 'draft',
    statusHistory: [],
    
    notes: input.notes,
    
    createdAt: now,
    createdBy: actor.userId,
    createdByName: actor.userName,
    updatedAt: now,
    updatedBy: actor.userId,
    updatedByName: actor.userName,
    version: 1,
  };
  
  const created = await repository.create(authorization);
  
  // Registrar en historial de estados
  const historyEntry: StatusHistoryEntry = {
    id: generateUUID(),
    fromStatus: null,
    toStatus: 'draft',
    changedAt: now,
    changedBy: actor.userId,
    changedByName: actor.userName,
    reason: 'Autorización creada',
  };
  
  const withHistory = await repository.update(created.id, {
    statusHistory: [historyEntry],
  });
  
  // Auditoría
  await auditCreate(
    'access_authorization',
    withHistory as unknown as Record<string, unknown>,
    actor,
    context,
    `Autorización para ${input.person.name}`
  );
  
  return withHistory as AccessAuthorization;
}

// ═══════════════════════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAccessAuthorization(
  id: string
): Promise<AccessAuthorization | null> {
  if (!isValidUUID(id)) {
    throw new Error('Invalid authorization ID');
  }
  
  return repository.findById(id) as Promise<AccessAuthorization | null>;
}

export async function getAccessAuthorizationByCode(
  code: string
): Promise<AccessAuthorization | null> {
  return repository.findOne({
    where: (a) => a.code === code,
  }) as Promise<AccessAuthorization | null>;
}

export interface AccessAuthorizationQuery {
  buildingId?: string;
  unitId?: string;
  ownerId?: string;
  status?: AccessAuthorizationStatus | AccessAuthorizationStatus[];
  accessType?: AccessType;
  searchText?: string;
  validOn?: string; // Fecha para verificar vigencia
  limit?: number;
  offset?: number;
}

export async function queryAccessAuthorizations(
  query: AccessAuthorizationQuery
): Promise<{ items: AccessAuthorization[]; total: number }> {
  let items = await repository.findMany({
    orderBy: { field: 'createdAt', direction: 'desc' },
  }) as AccessAuthorization[];
  
  // Filtros
  if (query.buildingId) {
    items = items.filter(a => a.buildingId === query.buildingId);
  }
  
  if (query.unitId) {
    items = items.filter(a => a.unitId === query.unitId);
  }
  
  if (query.ownerId) {
    items = items.filter(a => a.ownerId === query.ownerId);
  }
  
  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    items = items.filter(a => statuses.includes(a.status));
  }
  
  if (query.accessType) {
    items = items.filter(a => a.accessType === query.accessType);
  }
  
  if (query.searchText) {
    const search = query.searchText.toLowerCase();
    items = items.filter(a => 
      a.code.toLowerCase().includes(search) ||
      a.person.name.toLowerCase().includes(search) ||
      a.person.documentNumber.toLowerCase().includes(search) ||
      a.unitNumber.toLowerCase().includes(search)
    );
  }
  
  if (query.validOn) {
    const checkDate = parseDate(query.validOn);
    if (checkDate) {
      items = items.filter(a => 
        a.status === 'active' &&
        isDateInRange(checkDate, parseDate(a.validFrom)!, parseDate(a.validUntil)!)
      );
    }
  }
  
  const total = items.length;
  
  // Paginación
  const limit = query.limit || 50;
  const offset = query.offset || 0;
  const paginated = items.slice(offset, offset + limit);
  
  return { items: paginated, total };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface UpdateAccessAuthorizationInput {
  person?: Partial<Omit<AuthorizedPerson, 'id'>>;
  vehicle?: VehicleInfo | null;
  validFrom?: string;
  validUntil?: string;
  maxVisits?: number | null;
  allowedDays?: number[] | null;
  allowedTimeStart?: string | null;
  allowedTimeEnd?: string | null;
  notes?: string;
  internalNotes?: string;
}

export async function updateAccessAuthorization(
  id: string,
  input: UpdateAccessAuthorizationInput,
  actor: AuditActor,
  context: AuditContext
): Promise<AccessAuthorization> {
  const existing = await getAccessAuthorization(id);
  
  if (!existing) {
    throw new Error('Authorization not found');
  }
  
  // Solo se puede editar en draft o pending
  if (!['draft', 'pending_approval'].includes(existing.status)) {
    throw new Error(`Cannot edit authorization in status: ${existing.status}`);
  }
  
  const now = nowISO();
  
  // Construir updates
  const updates: Partial<AccessAuthorization> = {
    updatedAt: now,
    updatedBy: actor.userId,
    updatedByName: actor.userName,
    version: existing.version + 1,
  };
  
  if (input.person) {
    updates.person = { ...existing.person, ...input.person };
  }
  
  if (input.vehicle !== undefined) {
    updates.vehicle = input.vehicle || undefined;
  }
  
  if (input.validFrom !== undefined) {
    updates.validFrom = input.validFrom;
  }
  
  if (input.validUntil !== undefined) {
    updates.validUntil = input.validUntil;
  }
  
  if (input.maxVisits !== undefined) {
    updates.maxVisits = input.maxVisits || undefined;
  }
  
  if (input.allowedDays !== undefined) {
    updates.allowedDays = input.allowedDays || undefined;
  }
  
  if (input.allowedTimeStart !== undefined) {
    updates.allowedTimeStart = input.allowedTimeStart || undefined;
  }
  
  if (input.allowedTimeEnd !== undefined) {
    updates.allowedTimeEnd = input.allowedTimeEnd || undefined;
  }
  
  if (input.notes !== undefined) {
    updates.notes = input.notes;
  }
  
  if (input.internalNotes !== undefined) {
    updates.internalNotes = input.internalNotes;
  }
  
  const updated = await repository.update(id, updates);
  
  // Auditoría con diff real
  await auditUpdate(
    'access_authorization',
    id,
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
    actor,
    context,
    `Autorización ${existing.code}`
  );
  
  return updated as AccessAuthorization;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function submitForApproval(
  id: string,
  actor: AuditActor,
  context: AuditContext
): Promise<AccessAuthorization> {
  return changeStatus(id, 'pending_approval', actor, context, 'Enviado para aprobación');
}

export async function approveAuthorization(
  id: string,
  actor: AuditActor,
  context: AuditContext,
  notes?: string
): Promise<AccessAuthorization> {
  return changeStatus(id, 'approved', actor, context, notes || 'Autorización aprobada');
}

export async function rejectAuthorization(
  id: string,
  reason: string,
  actor: AuditActor,
  context: AuditContext
): Promise<AccessAuthorization> {
  return changeStatus(id, 'rejected', actor, context, reason);
}

export async function activateAuthorization(
  id: string,
  actor: AuditActor,
  context: AuditContext
): Promise<AccessAuthorization> {
  return changeStatus(id, 'active', actor, context, 'Autorización activada');
}

export async function revokeAuthorization(
  id: string,
  reason: string,
  actor: AuditActor,
  context: AuditContext
): Promise<AccessAuthorization> {
  return changeStatus(id, 'revoked', actor, context, reason);
}

export async function cancelAuthorization(
  id: string,
  reason: string,
  actor: AuditActor,
  context: AuditContext
): Promise<AccessAuthorization> {
  return changeStatus(id, 'cancelled', actor, context, reason);
}

/**
 * Cambia estado con validación de máquina de estados.
 */
async function changeStatus(
  id: string,
  newStatus: AccessAuthorizationStatus,
  actor: AuditActor,
  context: AuditContext,
  reason?: string
): Promise<AccessAuthorization> {
  const existing = await getAccessAuthorization(id);
  
  if (!existing) {
    throw new Error('Authorization not found');
  }
  
  // Validar transición
  const validation = isValidTransition('access_authorization', existing.status, newStatus);
  
  if (!validation.valid) {
    throw new Error(validation.reason);
  }
  
  const now = nowISO();
  
  // Agregar entrada al historial
  const historyEntry: StatusHistoryEntry = {
    id: generateUUID(),
    fromStatus: existing.status,
    toStatus: newStatus,
    changedAt: now,
    changedBy: actor.userId,
    changedByName: actor.userName,
    reason,
  };
  
  const updated = await repository.update(id, {
    status: newStatus,
    statusHistory: [...existing.statusHistory, historyEntry],
    updatedAt: now,
    updatedBy: actor.userId,
    updatedByName: actor.userName,
    version: existing.version + 1,
  });
  
  // Auditoría específica de cambio de estado
  await auditStatusChange(
    'access_authorization',
    id,
    existing.status,
    newStatus,
    actor,
    context,
    `Autorización ${existing.code}`,
    reason
  );
  
  return updated as AccessAuthorization;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISIT REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface VisitRegistration {
  id: string;
  authorizationId: string;
  authorizationCode: string;
  personName: string;
  checkedInAt: string;
  checkedInBy: string;
  checkedInByName: string;
  checkedOutAt?: string;
  checkedOutBy?: string;
  checkedOutByName?: string;
  notes?: string;
}

const visitRepository = createRepository<VisitRegistration>('visit_registration');

export async function registerVisitEntry(
  authorizationId: string,
  actor: AuditActor,
  context: AuditContext,
  notes?: string
): Promise<{ visit: VisitRegistration; authorization: AccessAuthorization }> {
  const auth = await getAccessAuthorization(authorizationId);
  
  if (!auth) {
    throw new Error('Authorization not found');
  }
  
  // Validar que está activa
  if (auth.status !== 'active') {
    throw new Error(`Authorization is not active (current status: ${auth.status})`);
  }
  
  // Validar vigencia
  const now = new Date();
  const validFrom = parseDate(auth.validFrom);
  const validUntil = parseDate(auth.validUntil);
  
  if (!validFrom || !validUntil) {
    throw new Error('Invalid authorization dates');
  }
  
  if (!isDateInRange(now, validFrom, validUntil)) {
    throw new Error('Authorization is not valid at this time');
  }
  
  // Validar máximo de visitas
  if (auth.maxVisits && auth.currentVisitCount >= auth.maxVisits) {
    throw new Error(`Maximum visits reached (${auth.maxVisits})`);
  }
  
  // Validar día de la semana
  if (auth.allowedDays && auth.allowedDays.length > 0) {
    const dayOfWeek = now.getDay();
    if (!auth.allowedDays.includes(dayOfWeek)) {
      throw new Error('Visits not allowed on this day');
    }
  }
  
  // Validar horario
  if (auth.allowedTimeStart && auth.allowedTimeEnd) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (currentTime < auth.allowedTimeStart || currentTime > auth.allowedTimeEnd) {
      throw new Error(`Visits only allowed between ${auth.allowedTimeStart} and ${auth.allowedTimeEnd}`);
    }
  }
  
  // Registrar visita
  const visitData: Omit<VisitRegistration, 'id'> = {
    authorizationId: auth.id,
    authorizationCode: auth.code,
    personName: auth.person.name,
    checkedInAt: nowISO(),
    checkedInBy: actor.userId,
    checkedInByName: actor.userName,
    notes,
  };
  
  const visit = await visitRepository.create(visitData);
  
  // Incrementar contador
  const updatedAuth = await repository.update(auth.id, {
    currentVisitCount: auth.currentVisitCount + 1,
    updatedAt: nowISO(),
    updatedBy: actor.userId,
    updatedByName: actor.userName,
    version: auth.version + 1,
  });
  
  // Auditoría
  await audit({
    action: 'create',
    entityType: 'access_authorization',
    entityId: auth.id,
    entityName: `Visita - ${auth.code}`,
    actor,
    context,
    description: `Registró entrada de ${auth.person.name}`,
    tags: ['visit', 'check-in'],
  });
  
  return {
    visit: visit as VisitRegistration,
    authorization: updatedAuth as AccessAuthorization,
  };
}

export async function registerVisitExit(
  visitId: string,
  actor: AuditActor,
  context: AuditContext,
  notes?: string
): Promise<VisitRegistration> {
  const visit = await visitRepository.findById(visitId);
  
  if (!visit) {
    throw new Error('Visit not found');
  }
  
  if ((visit as VisitRegistration).checkedOutAt) {
    throw new Error('Visit already checked out');
  }
  
  const updated = await visitRepository.update(visitId, {
    checkedOutAt: nowISO(),
    checkedOutBy: actor.userId,
    checkedOutByName: actor.userName,
    notes: notes ? `${(visit as VisitRegistration).notes || ''}\n${notes}`.trim() : (visit as VisitRegistration).notes,
  });
  
  // Auditoría
  await audit({
    action: 'update',
    entityType: 'access_authorization',
    entityId: (visit as VisitRegistration).authorizationId,
    entityName: `Visita - ${(visit as VisitRegistration).authorizationCode}`,
    actor,
    context,
    description: `Registró salida de ${(visit as VisitRegistration).personName}`,
    tags: ['visit', 'check-out'],
  });
  
  return updated as VisitRegistration;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Expira autorizaciones vencidas.
 * Ejecutar periódicamente (cron job).
 */
export async function expireOutdatedAuthorizations(
  actor: AuditActor,
  context: AuditContext
): Promise<number> {
  const now = new Date();
  
  const activeAuths = await repository.findMany({
    where: (a) => a.status === 'active',
  }) as AccessAuthorization[];
  
  let expiredCount = 0;
  
  for (const auth of activeAuths) {
    const validUntil = parseDate(auth.validUntil);
    
    if (validUntil && compareDates(now, validUntil) > 0) {
      // Ya expiró
      await changeStatus(
        auth.id,
        'expired',
        actor,
        context,
        'Expirado automáticamente por vencimiento de fecha'
      );
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    console.log(`[AccessService] Expired ${expiredCount} authorizations`);
  }
  
  return expiredCount;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // CRUD
  createAccessAuthorization,
  getAccessAuthorization,
  getAccessAuthorizationByCode,
  queryAccessAuthorizations,
  updateAccessAuthorization,
  
  // Status changes
  submitForApproval,
  approveAuthorization,
  rejectAuthorization,
  activateAuthorization,
  revokeAuthorization,
  cancelAuthorization,
  
  // Visits
  registerVisitEntry,
  registerVisitExit,
  
  // Batch
  expireOutdatedAuthorizations,
  
  // Utilities
  getValidNextStates: (status: AccessAuthorizationStatus) => 
    getValidNextStates('access_authorization', status),
};
