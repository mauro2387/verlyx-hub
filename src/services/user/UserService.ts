/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - USER SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE GESTIÓN DE USUARIOS ENTERPRISE
 * 
 * Implementa:
 * - CRUD completo de usuarios
 * - Gestión de roles y permisos
 * - Aprobación de usuarios pendientes
 * - Cambio de contraseña con validación
 * - Vinculación usuario-unidad
 * - Auditoría completa
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

export type UserRole =
  | 'super_admin'       // Acceso total a todo el sistema
  | 'admin'             // Administrador de edificio
  | 'staff'             // Personal operativo
  | 'owner'             // Propietario de unidad
  | 'tenant'            // Inquilino
  | 'visitor'           // Visitante registrado
  | 'service_provider'; // Proveedor de servicios

export type UserStatus =
  | 'pending_approval'  // Esperando aprobación
  | 'active'            // Activo
  | 'inactive'          // Inactivo temporalmente
  | 'suspended'         // Suspendido por administración
  | 'banned';           // Prohibido permanentemente

export type NotificationPreference = 'all' | 'important_only' | 'none';

export interface UserPermissions {
  canManageUsers: boolean;
  canManageBuildings: boolean;
  canManageUnits: boolean;
  canManageReservations: boolean;
  canManageAccess: boolean;
  canManageFinances: boolean;
  canViewReports: boolean;
  canManageAnnouncements: boolean;
  canManageMaintenance: boolean;
  canApprovePendingUsers: boolean;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  alternativeEmail?: string;
  documentType?: 'dni' | 'passport' | 'cuil' | 'cuit' | 'other';
  documentNumber?: string;
  profileImageUrl?: string;
  language: 'es' | 'en' | 'pt';
  timezone: string;
}

export interface UserSettings {
  emailNotifications: NotificationPreference;
  pushNotifications: NotificationPreference;
  smsNotifications: NotificationPreference;
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
}

export interface UnitAssociation {
  unitId: string;
  buildingId: string;
  role: 'owner' | 'tenant' | 'authorized';
  isPrimary: boolean;
  since: string;
  until?: string;
}

export interface LoginHistory {
  timestamp: string;
  ip: string;
  userAgent: string;
  location?: string;
  success: boolean;
  failReason?: string;
}

export interface User {
  id: string;
  
  /** Email único - usado como login */
  email: string;
  
  /** Hash de contraseña (nunca exponer) */
  passwordHash: string;
  
  /** Rol principal */
  role: UserRole;
  
  /** Estado del usuario */
  status: UserStatus;
  
  /** Permisos específicos */
  permissions: UserPermissions;
  
  /** Perfil del usuario */
  profile: UserProfile;
  
  /** Configuraciones */
  settings: UserSettings;
  
  /** Unidades asociadas */
  unitAssociations: UnitAssociation[];
  
  /** Edificios a los que tiene acceso (para staff/admin) */
  buildingAccess: string[];
  
  /** Último login */
  lastLoginAt?: string;
  
  /** Historial de logins (últimos 10) */
  loginHistory: LoginHistory[];
  
  /** Token de recuperación de contraseña */
  passwordResetToken?: string;
  passwordResetExpires?: string;
  
  /** Cuenta verificada por email */
  emailVerified: boolean;
  emailVerificationToken?: string;
  
  /** Datos de auditoría */
  audit: {
    createdAt: string;
    createdBy: string;
    createdByName: string;
    updatedAt: string;
    updatedBy: string;
    updatedByName: string;
    version: number;
    approvedAt?: string;
    approvedBy?: string;
    suspendedAt?: string;
    suspendedBy?: string;
    suspendReason?: string;
  };
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    documentType?: UserProfile['documentType'];
    documentNumber?: string;
  };
  buildingId?: string;
  unitId?: string;
  unitRole?: UnitAssociation['role'];
  autoApprove?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  role?: UserRole;
  profile?: Partial<UserProfile>;
  settings?: Partial<UserSettings>;
  permissions?: Partial<UserPermissions>;
}

export interface UserFilters {
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  buildingId?: string;
  unitId?: string;
  search?: string;
  emailVerified?: boolean;
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

const STORAGE_KEY = 'aquarela_users_v2';

function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[UserService] Failed to read users:', e);
    return [];
  }
}

function saveUsers(list: User[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[UserService] Failed to save users:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hash simple de contraseña (en producción usar bcrypt/argon2)
 * IMPORTANTE: Este hash es solo para demo, usar librería real en producción
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'aquarela_salt_v2');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una letra mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Debe incluir al menos un carácter especial');
  }
  
  return { valid: errors.length === 0, errors };
}

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

function getDefaultPermissions(role: UserRole): UserPermissions {
  const templates: Record<UserRole, UserPermissions> = {
    super_admin: {
      canManageUsers: true,
      canManageBuildings: true,
      canManageUnits: true,
      canManageReservations: true,
      canManageAccess: true,
      canManageFinances: true,
      canViewReports: true,
      canManageAnnouncements: true,
      canManageMaintenance: true,
      canApprovePendingUsers: true,
    },
    admin: {
      canManageUsers: true,
      canManageBuildings: false,
      canManageUnits: true,
      canManageReservations: true,
      canManageAccess: true,
      canManageFinances: true,
      canViewReports: true,
      canManageAnnouncements: true,
      canManageMaintenance: true,
      canApprovePendingUsers: true,
    },
    staff: {
      canManageUsers: false,
      canManageBuildings: false,
      canManageUnits: false,
      canManageReservations: true,
      canManageAccess: true,
      canManageFinances: false,
      canViewReports: false,
      canManageAnnouncements: false,
      canManageMaintenance: true,
      canApprovePendingUsers: false,
    },
    owner: {
      canManageUsers: false,
      canManageBuildings: false,
      canManageUnits: false,
      canManageReservations: true,
      canManageAccess: true,
      canManageFinances: false,
      canViewReports: false,
      canManageAnnouncements: false,
      canManageMaintenance: false,
      canApprovePendingUsers: false,
    },
    tenant: {
      canManageUsers: false,
      canManageBuildings: false,
      canManageUnits: false,
      canManageReservations: true,
      canManageAccess: true,
      canManageFinances: false,
      canViewReports: false,
      canManageAnnouncements: false,
      canManageMaintenance: false,
      canApprovePendingUsers: false,
    },
    visitor: {
      canManageUsers: false,
      canManageBuildings: false,
      canManageUnits: false,
      canManageReservations: false,
      canManageAccess: false,
      canManageFinances: false,
      canViewReports: false,
      canManageAnnouncements: false,
      canManageMaintenance: false,
      canApprovePendingUsers: false,
    },
    service_provider: {
      canManageUsers: false,
      canManageBuildings: false,
      canManageUnits: false,
      canManageReservations: false,
      canManageAccess: false,
      canManageFinances: false,
      canViewReports: false,
      canManageAnnouncements: false,
      canManageMaintenance: false,
      canApprovePendingUsers: false,
    },
  };
  
  return templates[role];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUser(input: Partial<CreateUserInput>, isUpdate = false): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!isUpdate) {
    if (!input.email?.trim()) {
      errors.push({ field: 'email', message: 'El email es requerido', code: 'REQUIRED' });
    } else if (!validateEmail(input.email)) {
      errors.push({ field: 'email', message: 'Email inválido', code: 'INVALID_FORMAT' });
    }
    
    if (!input.password) {
      errors.push({ field: 'password', message: 'La contraseña es requerida', code: 'REQUIRED' });
    } else {
      const passValidation = validatePasswordStrength(input.password);
      if (!passValidation.valid) {
        errors.push({
          field: 'password',
          message: passValidation.errors.join('. '),
          code: 'WEAK_PASSWORD',
        });
      }
    }
    
    if (!input.profile?.firstName?.trim()) {
      errors.push({ field: 'profile.firstName', message: 'El nombre es requerido', code: 'REQUIRED' });
    }
    
    if (!input.profile?.lastName?.trim()) {
      errors.push({ field: 'profile.lastName', message: 'El apellido es requerido', code: 'REQUIRED' });
    }
    
    if (!input.role) {
      errors.push({ field: 'role', message: 'El rol es requerido', code: 'REQUIRED' });
    }
  }
  
  return errors;
}

function isEmailUnique(email: string, excludeId?: string): boolean {
  const users = getStoredUsers();
  return !users.some(u =>
    u.email.toLowerCase() === email.toLowerCase() &&
    u.id !== excludeId
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createAuditContext(buildingId?: string): AuditContext {
  return {
    buildingId,
    source: 'web',
  };
}

function sanitizeUserForResponse(user: User): Omit<User, 'passwordHash' | 'passwordResetToken' | 'emailVerificationToken'> {
  const { passwordHash: _ph, passwordResetToken: _prt, emailVerificationToken: _evt, ...safe } = user;
  return safe;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea un nuevo usuario.
 */
export async function createUser(
  input: CreateUserInput,
  actor: AuditActor
): Promise<OperationResult<Omit<User, 'passwordHash'>>> {
  const errors = validateUser(input);
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
  
  if (!isEmailUnique(input.email)) {
    return {
      success: false,
      error: {
        code: 'DUPLICATE_EMAIL',
        message: 'Ya existe un usuario con este email',
      },
    };
  }
  
  const now = nowISO();
  const passwordHash = await hashPassword(input.password);
  
  const user: User = {
    id: generateUUID(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
    role: input.role,
    status: input.autoApprove ? 'active' : 'pending_approval',
    permissions: getDefaultPermissions(input.role),
    profile: {
      firstName: input.profile.firstName.trim(),
      lastName: input.profile.lastName.trim(),
      phone: input.profile.phone,
      documentType: input.profile.documentType,
      documentNumber: input.profile.documentNumber,
      language: 'es',
      timezone: 'America/Argentina/Buenos_Aires',
    },
    settings: {
      emailNotifications: 'all',
      pushNotifications: 'important_only',
      smsNotifications: 'none',
      twoFactorEnabled: false,
      loginAlerts: true,
    },
    unitAssociations: [],
    buildingAccess: input.buildingId ? [input.buildingId] : [],
    loginHistory: [],
    emailVerified: false,
    emailVerificationToken: generateSecureToken(),
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
  
  // Vincular unidad si se proporciona
  if (input.unitId && input.buildingId && input.unitRole) {
    user.unitAssociations.push({
      unitId: input.unitId,
      buildingId: input.buildingId,
      role: input.unitRole,
      isPrimary: true,
      since: now,
    });
  }
  
  // Auto-aprobar si corresponde
  if (input.autoApprove) {
    user.audit.approvedAt = now;
    user.audit.approvedBy = actor.userId;
  }
  
  const list = getStoredUsers();
  list.unshift(user);
  saveUsers(list);
  
  await auditCreate(
    'user',
    sanitizeForAudit({ ...user, passwordHash: '[PROTECTED]' } as unknown as Record<string, unknown>),
    actor,
    createAuditContext(input.buildingId),
    `Usuario ${user.profile.firstName} ${user.profile.lastName}`
  );
  
  console.log(`[UserService] Created user: ${user.email}`);
  
  return { success: true, data: sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> };
}

/**
 * Obtiene un usuario por ID.
 */
export function getUser(id: string): Omit<User, 'passwordHash'> | null {
  const user = getStoredUsers().find(u => u.id === id);
  return user ? sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> : null;
}

/**
 * Obtiene un usuario por email.
 */
export function getUserByEmail(email: string): Omit<User, 'passwordHash'> | null {
  const user = getStoredUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  return user ? sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> : null;
}

/**
 * Lista usuarios con filtros.
 */
export function listUsers(filters: UserFilters = {}): Omit<User, 'passwordHash'>[] {
  let list = getStoredUsers();
  
  if (filters.role) {
    const roles = Array.isArray(filters.role) ? filters.role : [filters.role];
    list = list.filter(u => roles.includes(u.role));
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(u => statuses.includes(u.status));
  }
  
  if (filters.buildingId) {
    list = list.filter(u =>
      u.buildingAccess.includes(filters.buildingId!) ||
      u.unitAssociations.some(ua => ua.buildingId === filters.buildingId)
    );
  }
  
  if (filters.unitId) {
    list = list.filter(u =>
      u.unitAssociations.some(ua => ua.unitId === filters.unitId)
    );
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    list = list.filter(u =>
      u.email.toLowerCase().includes(search) ||
      u.profile.firstName.toLowerCase().includes(search) ||
      u.profile.lastName.toLowerCase().includes(search) ||
      u.profile.documentNumber?.toLowerCase().includes(search)
    );
  }
  
  if (filters.emailVerified !== undefined) {
    list = list.filter(u => u.emailVerified === filters.emailVerified);
  }
  
  return list
    .map(u => sanitizeUserForResponse(u) as Omit<User, 'passwordHash'>)
    .sort((a, b) => new Date(b.audit.createdAt).getTime() - new Date(a.audit.createdAt).getTime());
}

/**
 * Lista usuarios pendientes de aprobación.
 */
export function listPendingUsers(): Omit<User, 'passwordHash'>[] {
  return listUsers({ status: 'pending_approval' });
}

/**
 * Actualiza un usuario.
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: AuditActor
): Promise<OperationResult<Omit<User, 'passwordHash'>>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
    };
  }
  
  const existing = list[index];
  const previousState = JSON.parse(JSON.stringify(existing)) as User;
  
  // Verificar email único si cambia
  if (input.email && input.email !== existing.email) {
    if (!isEmailUnique(input.email, id)) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'Ya existe un usuario con este email',
        },
      };
    }
    existing.email = input.email.toLowerCase().trim();
  }
  
  // Actualizar rol
  if (input.role && input.role !== existing.role) {
    existing.role = input.role;
    // Actualizar permisos por defecto del nuevo rol
    existing.permissions = {
      ...existing.permissions,
      ...getDefaultPermissions(input.role),
    };
  }
  
  // Actualizar perfil
  if (input.profile) {
    existing.profile = { ...existing.profile, ...input.profile };
  }
  
  // Actualizar configuraciones
  if (input.settings) {
    existing.settings = { ...existing.settings, ...input.settings };
  }
  
  // Actualizar permisos específicos
  if (input.permissions) {
    existing.permissions = { ...existing.permissions, ...input.permissions };
  }
  
  // Actualizar audit
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveUsers(list);
  
  await auditUpdate(
    'user',
    id,
    sanitizeForAudit({ ...previousState, passwordHash: '[PROTECTED]' } as unknown as Record<string, unknown>),
    sanitizeForAudit({ ...existing, passwordHash: '[PROTECTED]' } as unknown as Record<string, unknown>),
    actor,
    createAuditContext(),
    `Usuario ${existing.profile.firstName} ${existing.profile.lastName}`
  );
  
  return { success: true, data: sanitizeUserForResponse(existing) as Omit<User, 'passwordHash'> };
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aprueba un usuario pendiente.
 */
export async function approveUser(
  id: string,
  actor: AuditActor
): Promise<OperationResult<Omit<User, 'passwordHash'>>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
    };
  }
  
  const user = list[index];
  
  if (user.status !== 'pending_approval') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `El usuario no está pendiente de aprobación (estado actual: ${user.status})`,
      },
    };
  }
  
  const now = nowISO();
  user.status = 'active';
  user.audit.approvedAt = now;
  user.audit.approvedBy = actor.userId;
  user.audit.updatedAt = now;
  user.audit.updatedBy = actor.userId;
  user.audit.updatedByName = actor.userName;
  user.audit.version++;
  
  list[index] = user;
  saveUsers(list);
  
  await audit({
    action: 'update',
    entityType: 'user',
    entityId: id,
    entityName: `Usuario ${user.profile.firstName} ${user.profile.lastName}`,
    actor,
    context: createAuditContext(),
    description: 'Usuario aprobado',
    tags: ['approval', 'user'],
    severity: 'high',
  });
  
  return { success: true, data: sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> };
}

/**
 * Rechaza un usuario pendiente.
 */
export async function rejectUser(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<void>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
    };
  }
  
  const user = list[index];
  
  if (user.status !== 'pending_approval') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: 'El usuario no está pendiente de aprobación',
      },
    };
  }
  
  // Eliminar el usuario
  list.splice(index, 1);
  saveUsers(list);
  
  await audit({
    action: 'delete',
    entityType: 'user',
    entityId: id,
    entityName: `Usuario ${user.profile.firstName} ${user.profile.lastName}`,
    actor,
    context: createAuditContext(),
    before: sanitizeForAudit({ ...user, passwordHash: '[PROTECTED]' } as unknown as Record<string, unknown>),
    description: `Usuario rechazado: ${reason}`,
    tags: ['rejection', 'user'],
    severity: 'high',
  });
  
  return { success: true, data: undefined };
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Suspende un usuario.
 */
export async function suspendUser(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<Omit<User, 'passwordHash'>>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
    };
  }
  
  const user = list[index];
  const now = nowISO();
  
  user.status = 'suspended';
  user.audit.suspendedAt = now;
  user.audit.suspendedBy = actor.userId;
  user.audit.suspendReason = reason;
  user.audit.updatedAt = now;
  user.audit.updatedBy = actor.userId;
  user.audit.updatedByName = actor.userName;
  user.audit.version++;
  
  list[index] = user;
  saveUsers(list);
  
  await audit({
    action: 'update',
    entityType: 'user',
    entityId: id,
    entityName: `Usuario ${user.profile.firstName} ${user.profile.lastName}`,
    actor,
    context: createAuditContext(),
    description: `Usuario suspendido: ${reason}`,
    tags: ['suspension', 'user'],
    severity: 'critical',
  });
  
  return { success: true, data: sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> };
}

/**
 * Reactiva un usuario suspendido o inactivo.
 */
export async function reactivateUser(
  id: string,
  actor: AuditActor
): Promise<OperationResult<Omit<User, 'passwordHash'>>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
    };
  }
  
  const user = list[index];
  
  if (user.status === 'banned') {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'No se puede reactivar un usuario baneado',
      },
    };
  }
  
  const now = nowISO();
  user.status = 'active';
  user.audit.updatedAt = now;
  user.audit.updatedBy = actor.userId;
  user.audit.updatedByName = actor.userName;
  user.audit.version++;
  
  list[index] = user;
  saveUsers(list);
  
  await audit({
    action: 'update',
    entityType: 'user',
    entityId: id,
    entityName: `Usuario ${user.profile.firstName} ${user.profile.lastName}`,
    actor,
    context: createAuditContext(),
    description: 'Usuario reactivado',
    tags: ['reactivation', 'user'],
    severity: 'high',
  });
  
  return { success: true, data: sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cambia la contraseña del usuario.
 */
export async function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string,
  actor: AuditActor
): Promise<OperationResult<void>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
    };
  }
  
  const user = list[index];
  
  // Verificar contraseña actual
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return {
      success: false,
      error: { code: 'INVALID_PASSWORD', message: 'La contraseña actual es incorrecta' },
    };
  }
  
  // Validar nueva contraseña
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: validation.errors.join('. '),
      },
    };
  }
  
  // Actualizar
  user.passwordHash = await hashPassword(newPassword);
  user.audit.updatedAt = nowISO();
  user.audit.updatedBy = actor.userId;
  user.audit.updatedByName = actor.userName;
  user.audit.version++;
  
  list[index] = user;
  saveUsers(list);
  
  await audit({
    action: 'update',
    entityType: 'user',
    entityId: id,
    entityName: `Usuario ${user.profile.firstName} ${user.profile.lastName}`,
    actor,
    context: createAuditContext(),
    description: 'Contraseña cambiada',
    tags: ['password-change', 'security'],
    severity: 'high',
  });
  
  return { success: true, data: undefined };
}

/**
 * Genera un token de recuperación de contraseña.
 */
export async function requestPasswordReset(email: string): Promise<OperationResult<{ token: string }>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (index === -1) {
    // No revelar si el email existe o no
    return { success: true, data: { token: '' } };
  }
  
  const user = list[index];
  const token = generateSecureToken();
  
  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas
  
  list[index] = user;
  saveUsers(list);
  
  return { success: true, data: { token } };
}

/**
 * Resetea la contraseña usando el token.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<OperationResult<void>> {
  const list = getStoredUsers();
  const index = list.findIndex(u =>
    u.passwordResetToken === token &&
    u.passwordResetExpires &&
    new Date(u.passwordResetExpires) > new Date()
  );
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado' },
    };
  }
  
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: validation.errors.join('. '),
      },
    };
  }
  
  const user = list[index];
  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.audit.updatedAt = nowISO();
  user.audit.version++;
  
  list[index] = user;
  saveUsers(list);
  
  return { success: true, data: undefined };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT ASSOCIATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vincula un usuario a una unidad.
 */
export async function linkUserToUnit(
  userId: string,
  unitId: string,
  buildingId: string,
  role: UnitAssociation['role'],
  isPrimary: boolean,
  actor: AuditActor
): Promise<OperationResult<Omit<User, 'passwordHash'>>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.id === userId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
    };
  }
  
  const user = list[index];
  
  // Verificar si ya existe la asociación
  const existingAssoc = user.unitAssociations.find(ua =>
    ua.unitId === unitId && ua.buildingId === buildingId
  );
  
  if (existingAssoc) {
    return {
      success: false,
      error: {
        code: 'ALREADY_LINKED',
        message: 'El usuario ya está vinculado a esta unidad',
      },
    };
  }
  
  // Si es primaria, desmarcar otras
  if (isPrimary) {
    user.unitAssociations.forEach(ua => {
      ua.isPrimary = false;
    });
  }
  
  user.unitAssociations.push({
    unitId,
    buildingId,
    role,
    isPrimary,
    since: nowISO(),
  });
  
  // Asegurar acceso al edificio
  if (!user.buildingAccess.includes(buildingId)) {
    user.buildingAccess.push(buildingId);
  }
  
  user.audit.updatedAt = nowISO();
  user.audit.updatedBy = actor.userId;
  user.audit.updatedByName = actor.userName;
  user.audit.version++;
  
  list[index] = user;
  saveUsers(list);
  
  await audit({
    action: 'update',
    entityType: 'user',
    entityId: userId,
    entityName: `Usuario ${user.profile.firstName} ${user.profile.lastName}`,
    actor,
    context: createAuditContext(buildingId),
    description: `Vinculado a unidad ${unitId} como ${role}`,
    tags: ['unit-link', 'user'],
  });
  
  return { success: true, data: sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> };
}

/**
 * Desvincula un usuario de una unidad.
 */
export async function unlinkUserFromUnit(
  userId: string,
  unitId: string,
  actor: AuditActor
): Promise<OperationResult<Omit<User, 'passwordHash'>>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.id === userId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' },
    };
  }
  
  const user = list[index];
  const assocIndex = user.unitAssociations.findIndex(ua => ua.unitId === unitId);
  
  if (assocIndex === -1) {
    return {
      success: false,
      error: { code: 'NOT_LINKED', message: 'El usuario no está vinculado a esta unidad' },
    };
  }
  
  const removed = user.unitAssociations.splice(assocIndex, 1)[0];
  
  user.audit.updatedAt = nowISO();
  user.audit.updatedBy = actor.userId;
  user.audit.updatedByName = actor.userName;
  user.audit.version++;
  
  list[index] = user;
  saveUsers(list);
  
  await audit({
    action: 'update',
    entityType: 'user',
    entityId: userId,
    entityName: `Usuario ${user.profile.firstName} ${user.profile.lastName}`,
    actor,
    context: createAuditContext(removed.buildingId),
    description: `Desvinculado de unidad ${unitId}`,
    tags: ['unit-unlink', 'user'],
  });
  
  return { success: true, data: sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION (Internal)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valida credenciales y registra intento de login.
 * INTERNO - usar con AuthService en producción
 */
export async function validateCredentials(
  email: string,
  password: string,
  ip: string,
  userAgent: string
): Promise<OperationResult<Omit<User, 'passwordHash'>>> {
  const list = getStoredUsers();
  const index = list.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' },
    };
  }
  
  const user = list[index];
  const isValid = await verifyPassword(password, user.passwordHash);
  const now = nowISO();
  
  // Registrar intento
  const loginEntry: LoginHistory = {
    timestamp: now,
    ip,
    userAgent,
    success: isValid,
    failReason: isValid ? undefined : 'Invalid password',
  };
  
  // Mantener solo últimos 10 intentos
  user.loginHistory = [loginEntry, ...user.loginHistory].slice(0, 10);
  
  if (!isValid) {
    list[index] = user;
    saveUsers(list);
    return {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' },
    };
  }
  
  // Verificar estado
  if (user.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'ACCOUNT_NOT_ACTIVE',
        message: `Cuenta ${user.status === 'pending_approval' ? 'pendiente de aprobación' : user.status}`,
      },
    };
  }
  
  // Actualizar último login
  user.lastLoginAt = now;
  list[index] = user;
  saveUsers(list);
  
  return { success: true, data: sanitizeUserForResponse(user) as Omit<User, 'passwordHash'> };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene estadísticas de usuarios.
 */
export function getUserStatistics(buildingId?: string): {
  total: number;
  byRole: Record<UserRole, number>;
  byStatus: Record<UserStatus, number>;
  pendingApproval: number;
  activeLastWeek: number;
} {
  let users = getStoredUsers();
  
  if (buildingId) {
    users = users.filter(u =>
      u.buildingAccess.includes(buildingId) ||
      u.unitAssociations.some(ua => ua.buildingId === buildingId)
    );
  }
  
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const stats = {
    total: users.length,
    byRole: {} as Record<UserRole, number>,
    byStatus: {} as Record<UserStatus, number>,
    pendingApproval: 0,
    activeLastWeek: 0,
  };
  
  for (const user of users) {
    stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
    stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
    
    if (user.status === 'pending_approval') {
      stats.pendingApproval++;
    }
    
    if (user.lastLoginAt && user.lastLoginAt >= oneWeekAgo) {
      stats.activeLastWeek++;
    }
  }
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // CRUD
  createUser,
  getUser,
  getUserByEmail,
  listUsers,
  listPendingUsers,
  updateUser,
  
  // Approval
  approveUser,
  rejectUser,
  
  // Status
  suspendUser,
  reactivateUser,
  
  // Password
  changePassword,
  requestPasswordReset,
  resetPassword,
  validatePasswordStrength,
  
  // Unit Association
  linkUserToUnit,
  unlinkUserFromUnit,
  
  // Auth
  validateCredentials,
  
  // Statistics
  getUserStatistics,
};
