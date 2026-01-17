/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - UNIT SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE GESTIÓN DE UNIDADES
 * 
 * Implementa:
 * - CRUD completo de unidades (departamentos/oficinas)
 * - Asociación con edificios
 * - Gestión de propietarios e inquilinos
 * - Filtros por número, rango, identificador
 * - Auditoría enterprise
 * 
 * PARA 150 USUARIOS - NO ES UNA DEMO
 */

import {
  generateUUID,
  nowISO,
} from '../repository/DataAccessLayer';

import {
  audit,
  auditCreate,
  auditUpdate,
  sanitizeForAudit,
  type AuditActor,
  type AuditContext,
} from '../audit/DeepAuditService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UnitType = 'apartment' | 'office' | 'commercial' | 'parking' | 'storage' | 'other';
export type UnitStatus = 'active' | 'inactive' | 'under_construction' | 'reserved';
export type OccupancyStatus = 'owner_occupied' | 'rented' | 'vacant' | 'for_sale';

export interface UnitOwner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  documentNumber?: string;
  ownershipPercentage: number;
  isPrimaryContact: boolean;
  since: string; // ISO date
}

export interface UnitTenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  documentNumber?: string;
  leaseStart: string;
  leaseEnd?: string;
  isPrimaryContact: boolean;
  isActive: boolean;
}

export interface Unit {
  id: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** Número de unidad (ej: "101", "PH-A") */
  number: string;
  
  /** Identificador interno único */
  internalCode: string;
  
  /** Piso */
  floor: number;
  
  /** Tipo de unidad */
  type: UnitType;
  
  /** Estado */
  status: UnitStatus;
  
  /** Estado de ocupación */
  occupancyStatus: OccupancyStatus;
  
  /** Superficie en m² */
  area?: number;
  
  /** Cantidad de habitaciones */
  bedrooms?: number;
  
  /** Cantidad de baños */
  bathrooms?: number;
  
  /** Tiene balcón/terraza */
  hasBalcony?: boolean;
  
  /** Tiene estacionamiento incluido */
  hasParking?: boolean;
  
  /** Coeficiente para cálculo de expensas */
  expenseCoefficient: number;
  
  /** Propietarios */
  owners: UnitOwner[];
  
  /** Inquilinos (si aplica) */
  tenants: UnitTenant[];
  
  /** Notas internas */
  internalNotes?: string;
  
  /** Metadatos de auditoría */
  audit: {
    createdAt: string;
    createdBy: string;
    createdByName: string;
    updatedAt: string;
    updatedBy: string;
    updatedByName: string;
    version: number;
  };
}

export interface CreateUnitInput {
  buildingId: string;
  number: string;
  internalCode?: string;
  floor: number;
  type: UnitType;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasBalcony?: boolean;
  hasParking?: boolean;
  expenseCoefficient?: number;
  owners?: Omit<UnitOwner, 'id'>[];
}

export interface UpdateUnitInput {
  number?: string;
  floor?: number;
  type?: UnitType;
  status?: UnitStatus;
  occupancyStatus?: OccupancyStatus;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasBalcony?: boolean;
  hasParking?: boolean;
  expenseCoefficient?: number;
  internalNotes?: string;
}

export interface UnitFilters {
  buildingId?: string;
  floor?: number;
  floorRange?: { min: number; max: number };
  numberRange?: { start: string; end: string };
  type?: UnitType | UnitType[];
  status?: UnitStatus | UnitStatus[];
  occupancyStatus?: OccupancyStatus | OccupancyStatus[];
  search?: string;
  ownerId?: string;
  tenantId?: string;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'aquarela_units_v2';

function getStoredUnits(): Unit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[UnitService] Failed to read units:', e);
    return [];
  }
}

function saveUnits(list: Unit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[UnitService] Failed to save units:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

function validateUnit(input: Partial<CreateUnitInput>, isUpdate = false): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!isUpdate) {
    if (!input.buildingId?.trim()) {
      errors.push({ field: 'buildingId', message: 'El edificio es requerido', code: 'REQUIRED' });
    }
    
    if (!input.number?.trim()) {
      errors.push({ field: 'number', message: 'El número de unidad es requerido', code: 'REQUIRED' });
    }
    
    if (input.floor === undefined || input.floor < 0) {
      errors.push({ field: 'floor', message: 'El piso es requerido y debe ser >= 0', code: 'REQUIRED' });
    }
    
    if (!input.type) {
      errors.push({ field: 'type', message: 'El tipo de unidad es requerido', code: 'REQUIRED' });
    }
  }
  
  if (input.expenseCoefficient !== undefined && (input.expenseCoefficient < 0 || input.expenseCoefficient > 100)) {
    errors.push({ field: 'expenseCoefficient', message: 'El coeficiente debe estar entre 0 y 100', code: 'INVALID_VALUE' });
  }
  
  if (input.area !== undefined && input.area < 0) {
    errors.push({ field: 'area', message: 'El área no puede ser negativa', code: 'INVALID_VALUE' });
  }
  
  return errors;
}

function isUnitNumberUnique(buildingId: string, number: string, excludeId?: string): boolean {
  const units = getStoredUnits();
  return !units.some(u =>
    u.buildingId === buildingId &&
    u.number.toUpperCase() === number.toUpperCase() &&
    u.id !== excludeId
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function generateInternalCode(buildingId: string, number: string): string {
  const cleanNumber = number.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return `${buildingId.substring(0, 8)}-${cleanNumber}`;
}

function createAuditContext(buildingId: string): AuditContext {
  return {
    buildingId,
    source: 'web',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una nueva unidad.
 */
export async function createUnit(
  input: CreateUnitInput,
  actor: AuditActor
): Promise<OperationResult<Unit>> {
  const errors = validateUnit(input);
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
  
  if (!isUnitNumberUnique(input.buildingId, input.number)) {
    return {
      success: false,
      error: {
        code: 'DUPLICATE_NUMBER',
        message: `Ya existe la unidad ${input.number} en este edificio`,
      },
    };
  }
  
  const now = nowISO();
  
  const unit: Unit = {
    id: generateUUID(),
    buildingId: input.buildingId,
    number: input.number.trim().toUpperCase(),
    internalCode: input.internalCode || generateInternalCode(input.buildingId, input.number),
    floor: input.floor,
    type: input.type,
    status: 'active',
    occupancyStatus: 'vacant',
    area: input.area,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    hasBalcony: input.hasBalcony,
    hasParking: input.hasParking,
    expenseCoefficient: input.expenseCoefficient ?? 1,
    owners: (input.owners || []).map(o => ({
      ...o,
      id: generateUUID(),
    })),
    tenants: [],
    audit: {
      createdAt: now,
      createdBy: actor.userId,
      createdByName: actor.userName,
      updatedAt: now,
      updatedBy: actor.userId,
      updatedByName: actor.userName,
      version: 1,
    },
  };
  
  const list = getStoredUnits();
  list.unshift(unit);
  saveUnits(list);
  
  await auditCreate(
    'unit',
    sanitizeForAudit(unit as unknown as Record<string, unknown>),
    actor,
    createAuditContext(input.buildingId),
    `Unidad ${unit.number}`
  );
  
  console.log(`[UnitService] Created unit: ${unit.number} in building ${input.buildingId}`);
  
  return { success: true, data: unit };
}

/**
 * Obtiene una unidad por ID.
 */
export function getUnit(id: string): Unit | null {
  return getStoredUnits().find(u => u.id === id) || null;
}

/**
 * Obtiene una unidad por número dentro de un edificio.
 */
export function getUnitByNumber(buildingId: string, number: string): Unit | null {
  const normalized = number.toUpperCase().trim();
  return getStoredUnits().find(u =>
    u.buildingId === buildingId &&
    u.number === normalized
  ) || null;
}

/**
 * Obtiene una unidad por código interno.
 */
export function getUnitByInternalCode(internalCode: string): Unit | null {
  return getStoredUnits().find(u => u.internalCode === internalCode) || null;
}

/**
 * Lista unidades con filtros.
 */
export function listUnits(filters: UnitFilters = {}): Unit[] {
  let list = getStoredUnits();
  
  if (filters.buildingId) {
    list = list.filter(u => u.buildingId === filters.buildingId);
  }
  
  if (filters.floor !== undefined) {
    list = list.filter(u => u.floor === filters.floor);
  }
  
  if (filters.floorRange) {
    list = list.filter(u =>
      u.floor >= filters.floorRange!.min &&
      u.floor <= filters.floorRange!.max
    );
  }
  
  if (filters.numberRange) {
    list = list.filter(u => {
      const num = u.number.toUpperCase();
      return num >= filters.numberRange!.start.toUpperCase() &&
             num <= filters.numberRange!.end.toUpperCase();
    });
  }
  
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    list = list.filter(u => types.includes(u.type));
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(u => statuses.includes(u.status));
  }
  
  if (filters.occupancyStatus) {
    const statuses = Array.isArray(filters.occupancyStatus) ? filters.occupancyStatus : [filters.occupancyStatus];
    list = list.filter(u => statuses.includes(u.occupancyStatus));
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    list = list.filter(u =>
      u.number.toLowerCase().includes(search) ||
      u.internalCode.toLowerCase().includes(search) ||
      u.owners.some(o => o.name.toLowerCase().includes(search)) ||
      u.tenants.some(t => t.name.toLowerCase().includes(search))
    );
  }
  
  if (filters.ownerId) {
    list = list.filter(u => u.owners.some(o => o.id === filters.ownerId));
  }
  
  if (filters.tenantId) {
    list = list.filter(u => u.tenants.some(t => t.id === filters.tenantId && t.isActive));
  }
  
  // Ordenar por número
  return list.sort((a, b) => {
    // Intentar ordenar numéricamente primero
    const aNum = parseInt(a.number, 10);
    const bNum = parseInt(b.number, 10);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    
    return a.number.localeCompare(b.number);
  });
}

/**
 * Lista unidades por edificio.
 */
export function getUnitsByBuilding(buildingId: string): Unit[] {
  return listUnits({ buildingId, status: 'active' });
}

/**
 * Actualiza una unidad.
 */
export async function updateUnit(
  id: string,
  input: UpdateUnitInput,
  actor: AuditActor
): Promise<OperationResult<Unit>> {
  const list = getStoredUnits();
  const index = list.findIndex(u => u.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Unidad no encontrada' },
    };
  }
  
  const existing = list[index];
  const previousState = JSON.parse(JSON.stringify(existing)) as Unit;
  
  // Validar cambios
  const errors = validateUnit(input as Partial<CreateUnitInput>, true);
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
  
  // Verificar número único si cambia
  if (input.number && input.number !== existing.number) {
    if (!isUnitNumberUnique(existing.buildingId, input.number, id)) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_NUMBER',
          message: `Ya existe la unidad ${input.number} en este edificio`,
        },
      };
    }
  }
  
  // Aplicar cambios
  if (input.number !== undefined) existing.number = input.number.trim().toUpperCase();
  if (input.floor !== undefined) existing.floor = input.floor;
  if (input.type !== undefined) existing.type = input.type;
  if (input.status !== undefined) existing.status = input.status;
  if (input.occupancyStatus !== undefined) existing.occupancyStatus = input.occupancyStatus;
  if (input.area !== undefined) existing.area = input.area;
  if (input.bedrooms !== undefined) existing.bedrooms = input.bedrooms;
  if (input.bathrooms !== undefined) existing.bathrooms = input.bathrooms;
  if (input.hasBalcony !== undefined) existing.hasBalcony = input.hasBalcony;
  if (input.hasParking !== undefined) existing.hasParking = input.hasParking;
  if (input.expenseCoefficient !== undefined) existing.expenseCoefficient = input.expenseCoefficient;
  if (input.internalNotes !== undefined) existing.internalNotes = input.internalNotes;
  
  // Actualizar audit
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveUnits(list);
  
  await auditUpdate(
    'unit',
    id,
    sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    sanitizeForAudit(existing as unknown as Record<string, unknown>),
    actor,
    createAuditContext(existing.buildingId),
    `Unidad ${existing.number}`
  );
  
  return { success: true, data: existing };
}

/**
 * Elimina una unidad (soft delete).
 */
export async function deleteUnit(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<void>> {
  const result = await updateUnit(id, { status: 'inactive' }, actor);
  
  if (result.success && result.data) {
    await audit({
      action: 'delete',
      entityType: 'unit',
      entityId: id,
      entityName: `Unidad ${result.data.number}`,
      actor,
      context: createAuditContext(result.data.buildingId),
      before: sanitizeForAudit(result.data as unknown as Record<string, unknown>),
      description: `Eliminación de unidad: ${reason}`,
      severity: 'high',
      tags: ['deletion', 'unit'],
    });
    
    return { success: true, data: undefined };
  }
  
  return { success: false, error: result.error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Agrega un propietario a una unidad.
 */
export async function addOwner(
  unitId: string,
  ownerData: Omit<UnitOwner, 'id'>,
  actor: AuditActor
): Promise<OperationResult<Unit>> {
  const list = getStoredUnits();
  const index = list.findIndex(u => u.id === unitId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Unidad no encontrada' },
    };
  }
  
  const existing = list[index];
  
  // Validar porcentaje total
  const currentTotal = existing.owners.reduce((sum, o) => sum + o.ownershipPercentage, 0);
  if (currentTotal + ownerData.ownershipPercentage > 100) {
    return {
      success: false,
      error: {
        code: 'INVALID_PERCENTAGE',
        message: `El porcentaje total excedería 100% (actual: ${currentTotal}%)`,
      },
    };
  }
  
  const newOwner: UnitOwner = {
    ...ownerData,
    id: generateUUID(),
  };
  
  // Si es el primer propietario, hacerlo contacto principal
  if (existing.owners.length === 0) {
    newOwner.isPrimaryContact = true;
  }
  
  existing.owners.push(newOwner);
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveUnits(list);
  
  await audit({
    action: 'update',
    entityType: 'unit',
    entityId: unitId,
    entityName: `Propietario de Unidad ${existing.number}`,
    actor,
    context: createAuditContext(existing.buildingId),
    after: sanitizeForAudit(newOwner as unknown as Record<string, unknown>),
    description: `Agregado propietario: ${newOwner.name}`,
    tags: ['owner', 'unit'],
  });
  
  return { success: true, data: existing };
}

/**
 * Actualiza un propietario.
 */
export async function updateOwner(
  unitId: string,
  ownerId: string,
  updates: Partial<Omit<UnitOwner, 'id'>>,
  actor: AuditActor
): Promise<OperationResult<Unit>> {
  const list = getStoredUnits();
  const index = list.findIndex(u => u.id === unitId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Unidad no encontrada' },
    };
  }
  
  const existing = list[index];
  const ownerIndex = existing.owners.findIndex(o => o.id === ownerId);
  
  if (ownerIndex === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Propietario no encontrado' },
    };
  }
  
  const previousOwner = { ...existing.owners[ownerIndex] };
  
  // Validar porcentaje si cambia
  if (updates.ownershipPercentage !== undefined) {
    const otherTotal = existing.owners
      .filter((_, i) => i !== ownerIndex)
      .reduce((sum, o) => sum + o.ownershipPercentage, 0);
    
    if (otherTotal + updates.ownershipPercentage > 100) {
      return {
        success: false,
        error: {
          code: 'INVALID_PERCENTAGE',
          message: `El porcentaje total excedería 100%`,
        },
      };
    }
  }
  
  existing.owners[ownerIndex] = {
    ...existing.owners[ownerIndex],
    ...updates,
  };
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveUnits(list);
  
  await audit({
    action: 'update',
    entityType: 'unit',
    entityId: unitId,
    entityName: `Propietario de Unidad ${existing.number}`,
    actor,
    context: createAuditContext(existing.buildingId),
    before: sanitizeForAudit(previousOwner as unknown as Record<string, unknown>),
    after: sanitizeForAudit(existing.owners[ownerIndex] as unknown as Record<string, unknown>),
    description: `Actualizado propietario: ${existing.owners[ownerIndex].name}`,
    tags: ['owner', 'unit'],
  });
  
  return { success: true, data: existing };
}

/**
 * Elimina un propietario.
 */
export async function removeOwner(
  unitId: string,
  ownerId: string,
  actor: AuditActor
): Promise<OperationResult<Unit>> {
  const list = getStoredUnits();
  const index = list.findIndex(u => u.id === unitId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Unidad no encontrada' },
    };
  }
  
  const existing = list[index];
  const ownerIndex = existing.owners.findIndex(o => o.id === ownerId);
  
  if (ownerIndex === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Propietario no encontrado' },
    };
  }
  
  const removed = existing.owners.splice(ownerIndex, 1)[0];
  
  // Si era el contacto principal, asignar al primero disponible
  if (removed.isPrimaryContact && existing.owners.length > 0) {
    existing.owners[0].isPrimaryContact = true;
  }
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveUnits(list);
  
  await audit({
    action: 'delete',
    entityType: 'unit',
    entityId: unitId,
    entityName: `Propietario de Unidad ${existing.number}`,
    actor,
    context: createAuditContext(existing.buildingId),
    before: sanitizeForAudit(removed as unknown as Record<string, unknown>),
    description: `Eliminado propietario: ${removed.name}`,
    tags: ['owner', 'unit'],
  });
  
  return { success: true, data: existing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Agrega un inquilino a una unidad.
 */
export async function addTenant(
  unitId: string,
  tenantData: Omit<UnitTenant, 'id' | 'isActive'>,
  actor: AuditActor
): Promise<OperationResult<Unit>> {
  const list = getStoredUnits();
  const index = list.findIndex(u => u.id === unitId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Unidad no encontrada' },
    };
  }
  
  const existing = list[index];
  
  const newTenant: UnitTenant = {
    ...tenantData,
    id: generateUUID(),
    isActive: true,
  };
  
  // Si es el primer inquilino activo, hacerlo contacto principal
  const hasActiveTenants = existing.tenants.some(t => t.isActive);
  if (!hasActiveTenants) {
    newTenant.isPrimaryContact = true;
  }
  
  existing.tenants.push(newTenant);
  existing.occupancyStatus = 'rented';
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveUnits(list);
  
  await audit({
    action: 'update',
    entityType: 'unit',
    entityId: unitId,
    entityName: `Inquilino de Unidad ${existing.number}`,
    actor,
    context: createAuditContext(existing.buildingId),
    after: sanitizeForAudit(newTenant as unknown as Record<string, unknown>),
    description: `Agregado inquilino: ${newTenant.name}`,
    tags: ['tenant', 'unit'],
  });
  
  return { success: true, data: existing };
}

/**
 * Finaliza el contrato de un inquilino.
 */
export async function endTenancy(
  unitId: string,
  tenantId: string,
  endDate: string,
  actor: AuditActor
): Promise<OperationResult<Unit>> {
  const list = getStoredUnits();
  const index = list.findIndex(u => u.id === unitId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Unidad no encontrada' },
    };
  }
  
  const existing = list[index];
  const tenantIndex = existing.tenants.findIndex(t => t.id === tenantId);
  
  if (tenantIndex === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Inquilino no encontrado' },
    };
  }
  
  const previousTenant = { ...existing.tenants[tenantIndex] };
  
  existing.tenants[tenantIndex].isActive = false;
  existing.tenants[tenantIndex].leaseEnd = endDate;
  
  // Si no hay más inquilinos activos, cambiar estado de ocupación
  const hasActiveTenants = existing.tenants.some(t => t.isActive);
  if (!hasActiveTenants) {
    existing.occupancyStatus = 'vacant';
  }
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveUnits(list);
  
  await audit({
    action: 'update',
    entityType: 'unit',
    entityId: unitId,
    entityName: `Inquilino de Unidad ${existing.number}`,
    actor,
    context: createAuditContext(existing.buildingId),
    before: sanitizeForAudit(previousTenant as unknown as Record<string, unknown>),
    after: sanitizeForAudit(existing.tenants[tenantIndex] as unknown as Record<string, unknown>),
    description: `Finalizado contrato de: ${previousTenant.name}`,
    tags: ['tenant', 'unit', 'lease-end'],
  });
  
  return { success: true, data: existing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene estadísticas de unidades por edificio.
 */
export function getUnitStatistics(buildingId: string): {
  total: number;
  byStatus: Record<UnitStatus, number>;
  byOccupancy: Record<OccupancyStatus, number>;
  byType: Record<UnitType, number>;
  totalArea: number;
  avgExpenseCoefficient: number;
} {
  const units = listUnits({ buildingId });
  
  const stats = {
    total: units.length,
    byStatus: {} as Record<UnitStatus, number>,
    byOccupancy: {} as Record<OccupancyStatus, number>,
    byType: {} as Record<UnitType, number>,
    totalArea: 0,
    avgExpenseCoefficient: 0,
  };
  
  let coefficientSum = 0;
  
  for (const unit of units) {
    // Por estado
    stats.byStatus[unit.status] = (stats.byStatus[unit.status] || 0) + 1;
    
    // Por ocupación
    stats.byOccupancy[unit.occupancyStatus] = (stats.byOccupancy[unit.occupancyStatus] || 0) + 1;
    
    // Por tipo
    stats.byType[unit.type] = (stats.byType[unit.type] || 0) + 1;
    
    // Área total
    if (unit.area) stats.totalArea += unit.area;
    
    // Coeficiente
    coefficientSum += unit.expenseCoefficient;
  }
  
  stats.avgExpenseCoefficient = units.length > 0 ? coefficientSum / units.length : 0;
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // CRUD
  createUnit,
  getUnit,
  getUnitByNumber,
  getUnitByInternalCode,
  listUnits,
  getUnitsByBuilding,
  updateUnit,
  deleteUnit,
  
  // Owners
  addOwner,
  updateOwner,
  removeOwner,
  
  // Tenants
  addTenant,
  endTenancy,
  
  // Statistics
  getUnitStatistics,
};
