/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - BUILDING SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE GESTIÓN DE EDIFICIOS
 * 
 * Implementa:
 * - CRUD completo de edificios
 * - Configuración de tipos de cuenta (expensas, moneda)
 * - Gestión de información general
 * - Auditoría enterprise con deep diff
 * - Repository Pattern
 * 
 * PARA 150 USUARIOS - NO ES UNA DEMO
 */

import {
  generateUUID,
  nowISO,
  createRepository,
  type IRepository,
} from '../repository/DataAccessLayer';

import {
  audit,
  auditCreate,
  auditUpdate,
  auditDelete,
  sanitizeForAudit,
  type AuditActor,
  type AuditContext,
} from '../audit/DeepAuditService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Currency = 'UYU' | 'USD' | 'EUR' | 'ARS';
export type AccountType = 'expenses' | 'reserve_fund' | 'extraordinary' | 'other';
export type BuildingStatus = 'active' | 'inactive' | 'suspended';

export interface BuildingAddress {
  street: string;
  number: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface BuildingContact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface AccountConfiguration {
  type: AccountType;
  name: string;
  currency: Currency;
  description?: string;
  isDefault: boolean;
}

export interface BuildingConfiguration {
  /** Moneda principal del edificio */
  defaultCurrency: Currency;
  
  /** Tipos de cuenta habilitados */
  accountTypes: AccountConfiguration[];
  
  /** Día de vencimiento de expensas (1-28) */
  expenseDueDay: number;
  
  /** Días de gracia para pagos */
  gracePeriodDays: number;
  
  /** Tasa de interés por mora (porcentaje mensual) */
  lateFeeRate: number;
  
  /** Requiere aprobación de accesos */
  requireAccessApproval: boolean;
  
  /** Máximo de días para accesos temporales */
  maxTemporaryAccessDays: number;
  
  /** Horario de recepción */
  receptionHours?: {
    start: string; // HH:MM
    end: string;
    daysOfWeek: number[]; // 0-6
  };
  
  /** Módulos habilitados */
  enabledModules: {
    access: boolean;
    reservations: boolean;
    maintenance: boolean;
    announcements: boolean;
    surveys: boolean;
    messageBoard: boolean;
    notifications: boolean;
  };
}

export interface Building {
  id: string;
  
  /** Código único del edificio (para URLs y referencias) */
  code: string;
  
  /** Nombre del edificio */
  name: string;
  
  /** Descripción */
  description?: string;
  
  /** Dirección completa */
  address: BuildingAddress;
  
  /** Contactos del edificio */
  contacts: BuildingContact[];
  
  /** Cantidad total de unidades */
  totalUnits: number;
  
  /** Cantidad de pisos */
  floors: number;
  
  /** Año de construcción */
  yearBuilt?: number;
  
  /** Configuración del edificio */
  configuration: BuildingConfiguration;
  
  /** Estado */
  status: BuildingStatus;
  
  /** Imagen principal */
  imageUrl?: string;
  
  /** Galería de imágenes */
  gallery?: string[];
  
  /** ID del administrador principal */
  primaryAdminId: string;
  
  /** IDs de administradores secundarios */
  secondaryAdminIds: string[];
  
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

export interface CreateBuildingInput {
  code: string;
  name: string;
  description?: string;
  address: BuildingAddress;
  contacts?: BuildingContact[];
  totalUnits: number;
  floors: number;
  yearBuilt?: number;
  configuration?: Partial<BuildingConfiguration>;
  imageUrl?: string;
  primaryAdminId: string;
}

export interface UpdateBuildingInput {
  name?: string;
  description?: string;
  address?: Partial<BuildingAddress>;
  contacts?: BuildingContact[];
  totalUnits?: number;
  floors?: number;
  yearBuilt?: number;
  imageUrl?: string;
  gallery?: string[];
  secondaryAdminIds?: string[];
}

export interface BuildingFilters {
  status?: BuildingStatus | BuildingStatus[];
  city?: string;
  search?: string;
  adminId?: string;
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

const STORAGE_KEY = 'aquarela_buildings_v2';

function getStoredBuildings(): Building[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[BuildingService] Failed to read buildings:', e);
    return [];
  }
}

function saveBuildings(list: Building[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[BuildingService] Failed to save buildings:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

function getDefaultConfiguration(): BuildingConfiguration {
  return {
    defaultCurrency: 'UYU',
    accountTypes: [
      { type: 'expenses', name: 'Gastos Comunes', currency: 'UYU', isDefault: true },
      { type: 'reserve_fund', name: 'Fondo de Reserva', currency: 'UYU', isDefault: false },
    ],
    expenseDueDay: 10,
    gracePeriodDays: 5,
    lateFeeRate: 2,
    requireAccessApproval: true,
    maxTemporaryAccessDays: 30,
    receptionHours: {
      start: '08:00',
      end: '20:00',
      daysOfWeek: [1, 2, 3, 4, 5], // Lunes a Viernes
    },
    enabledModules: {
      access: true,
      reservations: true,
      maintenance: true,
      announcements: true,
      surveys: false,
      messageBoard: false,
      notifications: true,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

function validateBuilding(input: Partial<CreateBuildingInput>, isUpdate = false): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!isUpdate) {
    if (!input.code?.trim()) {
      errors.push({ field: 'code', message: 'El código es requerido', code: 'REQUIRED' });
    } else if (!/^[A-Z0-9_-]{2,20}$/i.test(input.code)) {
      errors.push({ field: 'code', message: 'El código debe ser alfanumérico (2-20 caracteres)', code: 'INVALID_FORMAT' });
    }
    
    if (!input.name?.trim()) {
      errors.push({ field: 'name', message: 'El nombre es requerido', code: 'REQUIRED' });
    }
    
    if (!input.address?.street?.trim()) {
      errors.push({ field: 'address.street', message: 'La calle es requerida', code: 'REQUIRED' });
    }
    
    if (!input.address?.city?.trim()) {
      errors.push({ field: 'address.city', message: 'La ciudad es requerida', code: 'REQUIRED' });
    }
    
    if (!input.totalUnits || input.totalUnits < 1) {
      errors.push({ field: 'totalUnits', message: 'Debe tener al menos 1 unidad', code: 'INVALID_VALUE' });
    }
    
    if (!input.floors || input.floors < 1) {
      errors.push({ field: 'floors', message: 'Debe tener al menos 1 piso', code: 'INVALID_VALUE' });
    }
    
    if (!input.primaryAdminId?.trim()) {
      errors.push({ field: 'primaryAdminId', message: 'El administrador principal es requerido', code: 'REQUIRED' });
    }
  }
  
  // Validaciones para update también
  if (input.totalUnits !== undefined && input.totalUnits < 1) {
    errors.push({ field: 'totalUnits', message: 'Debe tener al menos 1 unidad', code: 'INVALID_VALUE' });
  }
  
  if (input.floors !== undefined && input.floors < 1) {
    errors.push({ field: 'floors', message: 'Debe tener al menos 1 piso', code: 'INVALID_VALUE' });
  }
  
  return errors;
}

function isCodeUnique(code: string, excludeId?: string): boolean {
  const buildings = getStoredBuildings();
  return !buildings.some(b => b.code.toUpperCase() === code.toUpperCase() && b.id !== excludeId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createAuditActor(userId: string, userName: string): AuditActor {
  return {
    userId,
    userName,
    userEmail: `${userId}@aquarela.local`,
    userRole: 'admin',
  };
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
 * Crea un nuevo edificio.
 */
export async function createBuilding(
  input: CreateBuildingInput,
  actor: AuditActor
): Promise<OperationResult<Building>> {
  // Validar
  const errors = validateBuilding(input);
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
  
  // Verificar código único
  if (!isCodeUnique(input.code)) {
    return {
      success: false,
      error: {
        code: 'DUPLICATE_CODE',
        message: `Ya existe un edificio con el código ${input.code}`,
      },
    };
  }
  
  const now = nowISO();
  const defaultConfig = getDefaultConfiguration();
  
  const building: Building = {
    id: generateUUID(),
    code: input.code.toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim(),
    address: {
      street: input.address.street,
      number: input.address.number,
      apartment: input.address.apartment,
      city: input.address.city,
      state: input.address.state,
      postalCode: input.address.postalCode,
      country: input.address.country || 'Uruguay',
      coordinates: input.address.coordinates,
    },
    contacts: input.contacts || [],
    totalUnits: input.totalUnits,
    floors: input.floors,
    yearBuilt: input.yearBuilt,
    configuration: {
      ...defaultConfig,
      ...input.configuration,
    },
    status: 'active',
    imageUrl: input.imageUrl,
    gallery: [],
    primaryAdminId: input.primaryAdminId,
    secondaryAdminIds: [],
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
  
  // Guardar
  const list = getStoredBuildings();
  list.unshift(building);
  saveBuildings(list);
  
  // Auditar
  await auditCreate(
    'building',
    sanitizeForAudit(building as unknown as Record<string, unknown>),
    actor,
    createAuditContext(building.id),
    `Edificio ${building.name}`
  );
  
  console.log(`[BuildingService] Created building: ${building.code} - ${building.name}`);
  
  return { success: true, data: building };
}

/**
 * Obtiene un edificio por ID.
 */
export function getBuilding(id: string): Building | null {
  return getStoredBuildings().find(b => b.id === id) || null;
}

/**
 * Obtiene un edificio por código.
 */
export function getBuildingByCode(code: string): Building | null {
  const normalized = code.toUpperCase().trim();
  return getStoredBuildings().find(b => b.code === normalized) || null;
}

/**
 * Lista todos los edificios con filtros.
 */
export function listBuildings(filters: BuildingFilters = {}): Building[] {
  let list = getStoredBuildings();
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(b => statuses.includes(b.status));
  }
  
  if (filters.city) {
    const city = filters.city.toLowerCase();
    list = list.filter(b => b.address.city.toLowerCase().includes(city));
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    list = list.filter(b =>
      b.name.toLowerCase().includes(search) ||
      b.code.toLowerCase().includes(search) ||
      b.address.street.toLowerCase().includes(search)
    );
  }
  
  if (filters.adminId) {
    list = list.filter(b =>
      b.primaryAdminId === filters.adminId ||
      b.secondaryAdminIds.includes(filters.adminId!)
    );
  }
  
  // Ordenar por nombre
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Actualiza un edificio.
 */
export async function updateBuilding(
  id: string,
  input: UpdateBuildingInput,
  actor: AuditActor
): Promise<OperationResult<Building>> {
  const list = getStoredBuildings();
  const index = list.findIndex(b => b.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Edificio no encontrado' },
    };
  }
  
  const existing = list[index];
  const previousState = JSON.parse(JSON.stringify(existing)) as Building;
  
  // Validar cambios
  const errors = validateBuilding(input as Partial<CreateBuildingInput>, true);
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
  
  // Aplicar cambios
  if (input.name !== undefined) existing.name = input.name.trim();
  if (input.description !== undefined) existing.description = input.description?.trim();
  if (input.address) {
    existing.address = { ...existing.address, ...input.address };
  }
  if (input.contacts !== undefined) existing.contacts = input.contacts;
  if (input.totalUnits !== undefined) existing.totalUnits = input.totalUnits;
  if (input.floors !== undefined) existing.floors = input.floors;
  if (input.yearBuilt !== undefined) existing.yearBuilt = input.yearBuilt;
  if (input.imageUrl !== undefined) existing.imageUrl = input.imageUrl;
  if (input.gallery !== undefined) existing.gallery = input.gallery;
  if (input.secondaryAdminIds !== undefined) existing.secondaryAdminIds = input.secondaryAdminIds;
  
  // Actualizar audit
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveBuildings(list);
  
  // Auditar
  await auditUpdate(
    'building',
    id,
    sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    sanitizeForAudit(existing as unknown as Record<string, unknown>),
    actor,
    createAuditContext(id),
    `Edificio ${existing.name}`
  );
  
  return { success: true, data: existing };
}

/**
 * Actualiza la configuración de un edificio.
 */
export async function updateBuildingConfiguration(
  id: string,
  configUpdates: Partial<BuildingConfiguration>,
  actor: AuditActor
): Promise<OperationResult<Building>> {
  const list = getStoredBuildings();
  const index = list.findIndex(b => b.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Edificio no encontrado' },
    };
  }
  
  const existing = list[index];
  const previousState = JSON.parse(JSON.stringify(existing)) as Building;
  
  // Merge configuration
  existing.configuration = {
    ...existing.configuration,
    ...configUpdates,
  };
  
  // Actualizar audit
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveBuildings(list);
  
  // Auditar con alta severidad (cambio de configuración)
  await audit({
    action: 'update',
    entityType: 'building',
    entityId: id,
    entityName: `Configuración de ${existing.name}`,
    actor,
    context: createAuditContext(id),
    before: sanitizeForAudit(previousState.configuration as unknown as Record<string, unknown>),
    after: sanitizeForAudit(existing.configuration as unknown as Record<string, unknown>),
    description: 'Actualización de configuración del edificio',
    severity: 'medium',
    tags: ['configuration', 'building'],
  });
  
  return { success: true, data: existing };
}

/**
 * Cambia el estado de un edificio.
 */
export async function changeBuildingStatus(
  id: string,
  newStatus: BuildingStatus,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<Building>> {
  const list = getStoredBuildings();
  const index = list.findIndex(b => b.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Edificio no encontrado' },
    };
  }
  
  const existing = list[index];
  const previousStatus = existing.status;
  
  if (previousStatus === newStatus) {
    return {
      success: false,
      error: { code: 'SAME_STATUS', message: 'El edificio ya tiene ese estado' },
    };
  }
  
  existing.status = newStatus;
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveBuildings(list);
  
  // Auditar con severidad alta
  await audit({
    action: 'status_change',
    entityType: 'building',
    entityId: id,
    entityName: `Edificio ${existing.name}`,
    actor,
    context: createAuditContext(id),
    before: { status: previousStatus },
    after: { status: newStatus },
    description: `Cambio de estado: ${previousStatus} → ${newStatus}. Razón: ${reason}`,
    severity: 'high',
    tags: ['status-change', 'building'],
  });
  
  return { success: true, data: existing };
}

/**
 * Elimina un edificio (soft delete - cambia a inactive).
 */
export async function deleteBuilding(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<void>> {
  const result = await changeBuildingStatus(id, 'inactive', reason, actor);
  
  if (result.success) {
    // Auditar eliminación
    await auditDelete(
      'building',
      id,
      sanitizeForAudit(result.data as unknown as Record<string, unknown>),
      actor,
      createAuditContext(id),
      `Edificio ${result.data?.name}`,
      reason
    );
    
    return { success: true, data: undefined };
  }
  
  return { success: false, error: result.error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT TYPE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Agrega un tipo de cuenta al edificio.
 */
export async function addAccountType(
  buildingId: string,
  account: Omit<AccountConfiguration, 'isDefault'>,
  actor: AuditActor
): Promise<OperationResult<Building>> {
  const list = getStoredBuildings();
  const index = list.findIndex(b => b.id === buildingId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Edificio no encontrado' },
    };
  }
  
  const existing = list[index];
  
  // Verificar que no exista
  if (existing.configuration.accountTypes.some(a => a.type === account.type)) {
    return {
      success: false,
      error: { code: 'DUPLICATE', message: 'Ya existe ese tipo de cuenta' },
    };
  }
  
  const newAccount: AccountConfiguration = {
    ...account,
    isDefault: existing.configuration.accountTypes.length === 0,
  };
  
  existing.configuration.accountTypes.push(newAccount);
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveBuildings(list);
  
  await audit({
    action: 'update',
    entityType: 'building',
    entityId: buildingId,
    entityName: `Tipo de cuenta: ${account.name}`,
    actor,
    context: createAuditContext(buildingId),
    after: sanitizeForAudit(newAccount as unknown as Record<string, unknown>),
    description: `Agregado tipo de cuenta: ${account.name}`,
    tags: ['account-type', 'configuration'],
  });
  
  return { success: true, data: existing };
}

/**
 * Elimina un tipo de cuenta del edificio.
 */
export async function removeAccountType(
  buildingId: string,
  accountType: AccountType,
  actor: AuditActor
): Promise<OperationResult<Building>> {
  const list = getStoredBuildings();
  const index = list.findIndex(b => b.id === buildingId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Edificio no encontrado' },
    };
  }
  
  const existing = list[index];
  const accountIndex = existing.configuration.accountTypes.findIndex(a => a.type === accountType);
  
  if (accountIndex === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Tipo de cuenta no encontrado' },
    };
  }
  
  const removed = existing.configuration.accountTypes.splice(accountIndex, 1)[0];
  
  // Si era el default, hacer default al primero disponible
  if (removed.isDefault && existing.configuration.accountTypes.length > 0) {
    existing.configuration.accountTypes[0].isDefault = true;
  }
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveBuildings(list);
  
  await audit({
    action: 'delete',
    entityType: 'building',
    entityId: buildingId,
    entityName: `Tipo de cuenta: ${removed.name}`,
    actor,
    context: createAuditContext(buildingId),
    before: sanitizeForAudit(removed as unknown as Record<string, unknown>),
    description: `Eliminado tipo de cuenta: ${removed.name}`,
    tags: ['account-type', 'configuration'],
  });
  
  return { success: true, data: existing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene estadísticas generales de edificios.
 */
export function getBuildingStatistics(): {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  totalUnits: number;
  byCity: Record<string, number>;
} {
  const buildings = getStoredBuildings();
  
  const stats = {
    total: buildings.length,
    active: 0,
    inactive: 0,
    suspended: 0,
    totalUnits: 0,
    byCity: {} as Record<string, number>,
  };
  
  for (const building of buildings) {
    // Por estado
    if (building.status === 'active') stats.active++;
    else if (building.status === 'inactive') stats.inactive++;
    else if (building.status === 'suspended') stats.suspended++;
    
    // Total de unidades
    stats.totalUnits += building.totalUnits;
    
    // Por ciudad
    const city = building.address.city;
    stats.byCity[city] = (stats.byCity[city] || 0) + 1;
  }
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // CRUD
  createBuilding,
  getBuilding,
  getBuildingByCode,
  listBuildings,
  updateBuilding,
  deleteBuilding,
  
  // Configuration
  updateBuildingConfiguration,
  changeBuildingStatus,
  
  // Account types
  addAccountType,
  removeAccountType,
  
  // Statistics
  getBuildingStatistics,
};
