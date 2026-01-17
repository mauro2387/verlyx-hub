/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - MAINTENANCE SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE OBRAS Y REPARACIONES ENTERPRISE
 * 
 * Implementa:
 * - Solicitudes de mantenimiento
 * - Obras programadas
 * - Seguimiento de reparaciones
 * - Gestión de proveedores
 * - Historial de trabajos
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

export type MaintenanceCategory =
  | 'plumbing'      // Plomería
  | 'electrical'    // Electricidad
  | 'hvac'          // Aire acondicionado/calefacción
  | 'elevator'      // Ascensor
  | 'structural'    // Estructural
  | 'cleaning'      // Limpieza
  | 'painting'      // Pintura
  | 'gardening'     // Jardinería
  | 'security'      // Seguridad
  | 'common_areas'  // Áreas comunes
  | 'other';

export type MaintenancePriority = 'low' | 'normal' | 'high' | 'urgent' | 'emergency';

export type MaintenanceStatus =
  | 'pending'       // Pendiente de revisión
  | 'approved'      // Aprobada
  | 'rejected'      // Rechazada
  | 'in_progress'   // En progreso
  | 'on_hold'       // En espera
  | 'completed'     // Completada
  | 'cancelled';    // Cancelada

export type MaintenanceType = 'request' | 'scheduled' | 'emergency' | 'preventive';

export interface MaintenanceRequest {
  id: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** ID de la unidad (si aplica) */
  unitId?: string;
  
  /** Tipo de mantenimiento */
  type: MaintenanceType;
  
  /** Categoría */
  category: MaintenanceCategory;
  
  /** Prioridad */
  priority: MaintenancePriority;
  
  /** Estado */
  status: MaintenanceStatus;
  
  /** Título */
  title: string;
  
  /** Descripción detallada */
  description: string;
  
  /** Ubicación específica */
  location: string;
  
  /** Solicitante */
  requester: {
    userId: string;
    name: string;
    email?: string;
    phone?: string;
    unitNumber?: string;
  };
  
  /** Imágenes/archivos adjuntos */
  attachments: {
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
  }[];
  
  /** Fecha deseada de atención */
  preferredDate?: string;
  preferredTimeSlot?: 'morning' | 'afternoon' | 'evening' | 'any';
  
  /** Proveedor asignado */
  assignedProvider?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  
  /** Personal interno asignado */
  assignedStaff?: {
    userId: string;
    name: string;
  };
  
  /** Fecha programada */
  scheduledDate?: string;
  scheduledTime?: string;
  
  /** Estimaciones */
  estimates?: {
    laborCost?: number;
    materialsCost?: number;
    totalCost?: number;
    duration?: string; // Duración estimada
    currency: 'ARS' | 'USD';
  };
  
  /** Costo final */
  finalCost?: {
    laborCost: number;
    materialsCost: number;
    totalCost: number;
    currency: 'ARS' | 'USD';
    invoiceNumber?: string;
  };
  
  /** Notas internas */
  internalNotes?: string;
  
  /** Historial de seguimiento */
  timeline: {
    timestamp: string;
    status: MaintenanceStatus;
    comment?: string;
    userId: string;
    userName: string;
  }[];
  
  /** Calificación del usuario */
  rating?: {
    score: number; // 1-5
    comment?: string;
    ratedAt: string;
  };
  
  /** Auditoría */
  audit: {
    createdAt: string;
    createdBy: string;
    createdByName: string;
    updatedAt: string;
    updatedBy: string;
    updatedByName: string;
    approvedAt?: string;
    approvedBy?: string;
    completedAt?: string;
    completedBy?: string;
    version: number;
  };
}

export interface ServiceProvider {
  id: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** Nombre de la empresa/persona */
  name: string;
  
  /** Categorías que atiende */
  categories: MaintenanceCategory[];
  
  /** Datos de contacto */
  contact: {
    phone: string;
    alternativePhone?: string;
    email?: string;
    address?: string;
  };
  
  /** CUIT/CUIL */
  taxId?: string;
  
  /** Activo */
  isActive: boolean;
  
  /** Calificación promedio */
  avgRating: number;
  totalJobs: number;
  
  /** Notas */
  notes?: string;
  
  /** Auditoría */
  audit: {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  };
}

// Input Types
export interface CreateMaintenanceRequestInput {
  buildingId: string;
  unitId?: string;
  type?: MaintenanceType;
  category: MaintenanceCategory;
  priority?: MaintenancePriority;
  title: string;
  description: string;
  location: string;
  requester: MaintenanceRequest['requester'];
  attachments?: MaintenanceRequest['attachments'];
  preferredDate?: string;
  preferredTimeSlot?: MaintenanceRequest['preferredTimeSlot'];
}

export interface UpdateMaintenanceRequestInput {
  category?: MaintenanceCategory;
  priority?: MaintenancePriority;
  title?: string;
  description?: string;
  location?: string;
  preferredDate?: string;
  preferredTimeSlot?: MaintenanceRequest['preferredTimeSlot'];
  internalNotes?: string;
  attachments?: MaintenanceRequest['attachments'];
}

export interface MaintenanceFilters {
  buildingId?: string;
  unitId?: string;
  type?: MaintenanceType | MaintenanceType[];
  category?: MaintenanceCategory | MaintenanceCategory[];
  priority?: MaintenancePriority | MaintenancePriority[];
  status?: MaintenanceStatus | MaintenanceStatus[];
  requesterId?: string;
  assignedProviderId?: string;
  assignedStaffId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
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

const REQUESTS_KEY = 'aquarela_maintenance_requests_v2';
const PROVIDERS_KEY = 'aquarela_service_providers_v2';
const TICKET_COUNTER_KEY = 'aquarela_maintenance_counter';

function getStoredRequests(): MaintenanceRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[MaintenanceService] Failed to read requests:', e);
    return [];
  }
}

function saveRequests(list: MaintenanceRequest[]): void {
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[MaintenanceService] Failed to save requests:', e);
  }
}

function getStoredProviders(): ServiceProvider[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[MaintenanceService] Failed to read providers:', e);
    return [];
  }
}

function saveProviders(list: ServiceProvider[]): void {
  try {
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[MaintenanceService] Failed to save providers:', e);
  }
}

function generateTicketNumber(): string {
  const counter = parseInt(localStorage.getItem(TICKET_COUNTER_KEY) || '0', 10) + 1;
  localStorage.setItem(TICKET_COUNTER_KEY, counter.toString());
  const year = new Date().getFullYear();
  return `MNT-${year}-${counter.toString().padStart(5, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createAuditContext(buildingId: string): AuditContext {
  return {
    buildingId,
    source: 'web',
  };
}

function getPriorityOrder(priority: MaintenancePriority): number {
  const order: Record<MaintenancePriority, number> = {
    emergency: 0,
    urgent: 1,
    high: 2,
    normal: 3,
    low: 4,
  };
  return order[priority];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE REQUEST CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una nueva solicitud de mantenimiento.
 */
export async function createMaintenanceRequest(
  input: CreateMaintenanceRequestInput,
  actor: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  if (!input.title?.trim()) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El título es requerido' },
    };
  }
  
  if (!input.description?.trim()) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'La descripción es requerida' },
    };
  }
  
  const now = nowISO();
  const ticketNumber = generateTicketNumber();
  
  const request: MaintenanceRequest = {
    id: ticketNumber, // Usar el ticket number como ID
    buildingId: input.buildingId,
    unitId: input.unitId,
    type: input.type || 'request',
    category: input.category,
    priority: input.priority || 'normal',
    status: 'pending',
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location,
    requester: input.requester,
    attachments: input.attachments || [],
    preferredDate: input.preferredDate,
    preferredTimeSlot: input.preferredTimeSlot,
    timeline: [
      {
        timestamp: now,
        status: 'pending',
        comment: 'Solicitud creada',
        userId: actor.userId,
        userName: actor.userName,
      },
    ],
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
  
  const list = getStoredRequests();
  list.unshift(request);
  saveRequests(list);
  
  await auditCreate(
    'maintenance_request',
    sanitizeForAudit(request as unknown as Record<string, unknown>),
    actor,
    createAuditContext(input.buildingId),
    `Solicitud ${ticketNumber}: ${request.title}`
  );
  
  console.log(`[MaintenanceService] Created request: ${ticketNumber}`);
  
  return { success: true, data: request };
}

/**
 * Obtiene una solicitud por ID.
 */
export function getMaintenanceRequest(id: string): MaintenanceRequest | null {
  return getStoredRequests().find(r => r.id === id) || null;
}

/**
 * Lista solicitudes con filtros.
 */
export function listMaintenanceRequests(filters: MaintenanceFilters = {}): MaintenanceRequest[] {
  let list = getStoredRequests();
  
  if (filters.buildingId) {
    list = list.filter(r => r.buildingId === filters.buildingId);
  }
  
  if (filters.unitId) {
    list = list.filter(r => r.unitId === filters.unitId);
  }
  
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    list = list.filter(r => types.includes(r.type));
  }
  
  if (filters.category) {
    const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
    list = list.filter(r => categories.includes(r.category));
  }
  
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    list = list.filter(r => priorities.includes(r.priority));
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(r => statuses.includes(r.status));
  }
  
  if (filters.requesterId) {
    list = list.filter(r => r.requester.userId === filters.requesterId);
  }
  
  if (filters.assignedProviderId) {
    list = list.filter(r => r.assignedProvider?.id === filters.assignedProviderId);
  }
  
  if (filters.assignedStaffId) {
    list = list.filter(r => r.assignedStaff?.userId === filters.assignedStaffId);
  }
  
  if (filters.dateFrom) {
    list = list.filter(r => r.audit.createdAt >= filters.dateFrom!);
  }
  
  if (filters.dateTo) {
    list = list.filter(r => r.audit.createdAt <= filters.dateTo!);
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    list = list.filter(r =>
      r.id.toLowerCase().includes(search) ||
      r.title.toLowerCase().includes(search) ||
      r.description.toLowerCase().includes(search) ||
      r.requester.name.toLowerCase().includes(search)
    );
  }
  
  // Ordenar por prioridad y fecha
  return list.sort((a, b) => {
    const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.audit.createdAt).getTime() - new Date(a.audit.createdAt).getTime();
  });
}

/**
 * Lista solicitudes pendientes de un edificio.
 */
export function getPendingRequests(buildingId: string): MaintenanceRequest[] {
  return listMaintenanceRequests({
    buildingId,
    status: ['pending', 'approved', 'in_progress'],
  });
}

/**
 * Lista solicitudes de un usuario.
 */
export function getUserRequests(userId: string): MaintenanceRequest[] {
  return listMaintenanceRequests({ requesterId: userId });
}

/**
 * Actualiza una solicitud.
 */
export async function updateMaintenanceRequest(
  id: string,
  updates: UpdateMaintenanceRequestInput,
  actor: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  const list = getStoredRequests();
  const index = list.findIndex(r => r.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Solicitud no encontrada' },
    };
  }
  
  const existing = list[index];
  const previousState = JSON.parse(JSON.stringify(existing)) as MaintenanceRequest;
  
  // Aplicar actualizaciones
  if (updates.category !== undefined) existing.category = updates.category;
  if (updates.priority !== undefined) existing.priority = updates.priority;
  if (updates.title !== undefined) existing.title = updates.title;
  if (updates.description !== undefined) existing.description = updates.description;
  if (updates.location !== undefined) existing.location = updates.location;
  if (updates.preferredDate !== undefined) existing.preferredDate = updates.preferredDate;
  if (updates.preferredTimeSlot !== undefined) existing.preferredTimeSlot = updates.preferredTimeSlot;
  if (updates.internalNotes !== undefined) existing.internalNotes = updates.internalNotes;
  if (updates.attachments !== undefined) existing.attachments = updates.attachments;
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveRequests(list);
  
  await auditUpdate(
    'maintenance_request',
    id,
    sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    sanitizeForAudit(existing as unknown as Record<string, unknown>),
    actor,
    createAuditContext(existing.buildingId),
    `Solicitud ${id}`
  );
  
  return { success: true, data: existing };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cambia el estado de una solicitud.
 */
async function changeStatus(
  id: string,
  newStatus: MaintenanceStatus,
  comment: string | undefined,
  actor: AuditActor,
  additionalUpdates?: Partial<MaintenanceRequest>
): Promise<OperationResult<MaintenanceRequest>> {
  const list = getStoredRequests();
  const index = list.findIndex(r => r.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Solicitud no encontrada' },
    };
  }
  
  const request = list[index];
  const previousStatus = request.status;
  const now = nowISO();
  
  request.status = newStatus;
  request.timeline.push({
    timestamp: now,
    status: newStatus,
    comment,
    userId: actor.userId,
    userName: actor.userName,
  });
  
  // Aplicar actualizaciones adicionales
  if (additionalUpdates) {
    Object.assign(request, additionalUpdates);
  }
  
  request.audit.updatedAt = now;
  request.audit.updatedBy = actor.userId;
  request.audit.updatedByName = actor.userName;
  request.audit.version++;
  
  // Campos específicos por estado
  if (newStatus === 'approved') {
    request.audit.approvedAt = now;
    request.audit.approvedBy = actor.userId;
  }
  if (newStatus === 'completed') {
    request.audit.completedAt = now;
    request.audit.completedBy = actor.userId;
  }
  
  list[index] = request;
  saveRequests(list);
  
  await audit({
    action: 'update',
    entityType: 'maintenance_request',
    entityId: id,
    entityName: `Solicitud ${id}`,
    actor,
    context: createAuditContext(request.buildingId),
    description: `Estado: ${previousStatus} → ${newStatus}${comment ? `: ${comment}` : ''}`,
    tags: ['status-change', 'maintenance'],
    severity: newStatus === 'rejected' || newStatus === 'cancelled' ? 'high' : 'medium',
  });
  
  return { success: true, data: request };
}

/**
 * Aprueba una solicitud.
 */
export async function approveRequest(
  id: string,
  comment?: string,
  actor?: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  if (!actor) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Actor requerido' },
    };
  }
  return changeStatus(id, 'approved', comment || 'Solicitud aprobada', actor);
}

/**
 * Rechaza una solicitud.
 */
export async function rejectRequest(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  return changeStatus(id, 'rejected', reason, actor);
}

/**
 * Inicia el trabajo en una solicitud.
 */
export async function startWork(
  id: string,
  actor: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  return changeStatus(id, 'in_progress', 'Trabajo iniciado', actor);
}

/**
 * Pone en espera una solicitud.
 */
export async function putOnHold(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  return changeStatus(id, 'on_hold', reason, actor);
}

/**
 * Completa una solicitud.
 */
export async function completeRequest(
  id: string,
  finalCost: MaintenanceRequest['finalCost'],
  comment?: string,
  actor?: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  if (!actor) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Actor requerido' },
    };
  }
  return changeStatus(
    id,
    'completed',
    comment || 'Trabajo completado',
    actor,
    { finalCost }
  );
}

/**
 * Cancela una solicitud.
 */
export async function cancelRequest(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  return changeStatus(id, 'cancelled', reason, actor);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asigna un proveedor a una solicitud.
 */
export async function assignProvider(
  requestId: string,
  provider: MaintenanceRequest['assignedProvider'],
  scheduledDate?: string,
  scheduledTime?: string,
  actor?: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  if (!actor) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Actor requerido' },
    };
  }
  
  const list = getStoredRequests();
  const index = list.findIndex(r => r.id === requestId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Solicitud no encontrada' },
    };
  }
  
  const request = list[index];
  const now = nowISO();
  
  request.assignedProvider = provider;
  if (scheduledDate) request.scheduledDate = scheduledDate;
  if (scheduledTime) request.scheduledTime = scheduledTime;
  
  request.timeline.push({
    timestamp: now,
    status: request.status,
    comment: `Asignado a proveedor: ${provider?.name}${scheduledDate ? ` para ${scheduledDate}` : ''}`,
    userId: actor.userId,
    userName: actor.userName,
  });
  
  request.audit.updatedAt = now;
  request.audit.updatedBy = actor.userId;
  request.audit.updatedByName = actor.userName;
  request.audit.version++;
  
  list[index] = request;
  saveRequests(list);
  
  await audit({
    action: 'update',
    entityType: 'maintenance_request',
    entityId: requestId,
    entityName: `Solicitud ${requestId}`,
    actor,
    context: createAuditContext(request.buildingId),
    description: `Proveedor asignado: ${provider?.name}`,
    tags: ['assignment', 'maintenance'],
  });
  
  return { success: true, data: request };
}

/**
 * Asigna personal interno a una solicitud.
 */
export async function assignStaff(
  requestId: string,
  staff: MaintenanceRequest['assignedStaff'],
  actor: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  const list = getStoredRequests();
  const index = list.findIndex(r => r.id === requestId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Solicitud no encontrada' },
    };
  }
  
  const request = list[index];
  const now = nowISO();
  
  request.assignedStaff = staff;
  
  request.timeline.push({
    timestamp: now,
    status: request.status,
    comment: `Asignado a personal: ${staff?.name}`,
    userId: actor.userId,
    userName: actor.userName,
  });
  
  request.audit.updatedAt = now;
  request.audit.updatedBy = actor.userId;
  request.audit.updatedByName = actor.userName;
  request.audit.version++;
  
  list[index] = request;
  saveRequests(list);
  
  return { success: true, data: request };
}

/**
 * Agrega estimación de costos.
 */
export async function addEstimate(
  requestId: string,
  estimates: MaintenanceRequest['estimates'],
  actor: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  const list = getStoredRequests();
  const index = list.findIndex(r => r.id === requestId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Solicitud no encontrada' },
    };
  }
  
  const request = list[index];
  const now = nowISO();
  
  request.estimates = estimates;
  
  request.timeline.push({
    timestamp: now,
    status: request.status,
    comment: `Estimación agregada: ${estimates?.currency} ${estimates?.totalCost}`,
    userId: actor.userId,
    userName: actor.userName,
  });
  
  request.audit.updatedAt = now;
  request.audit.updatedBy = actor.userId;
  request.audit.updatedByName = actor.userName;
  request.audit.version++;
  
  list[index] = request;
  saveRequests(list);
  
  return { success: true, data: request };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Califica un trabajo completado.
 */
export async function rateWork(
  requestId: string,
  score: number,
  comment?: string,
  actor?: AuditActor
): Promise<OperationResult<MaintenanceRequest>> {
  if (score < 1 || score > 5) {
    return {
      success: false,
      error: { code: 'INVALID_SCORE', message: 'La calificación debe ser entre 1 y 5' },
    };
  }
  
  const list = getStoredRequests();
  const index = list.findIndex(r => r.id === requestId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Solicitud no encontrada' },
    };
  }
  
  const request = list[index];
  
  if (request.status !== 'completed') {
    return {
      success: false,
      error: { code: 'NOT_COMPLETED', message: 'Solo se pueden calificar trabajos completados' },
    };
  }
  
  request.rating = {
    score,
    comment,
    ratedAt: nowISO(),
  };
  
  list[index] = request;
  saveRequests(list);
  
  // Actualizar rating del proveedor si hay uno asignado
  if (request.assignedProvider) {
    updateProviderRating(request.assignedProvider.id);
  }
  
  return { success: true, data: request };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea un proveedor de servicios.
 */
export async function createProvider(
  input: Omit<ServiceProvider, 'id' | 'audit' | 'avgRating' | 'totalJobs'>,
  actor: AuditActor
): Promise<OperationResult<ServiceProvider>> {
  const now = nowISO();
  
  const provider: ServiceProvider = {
    id: generateUUID(),
    ...input,
    avgRating: 0,
    totalJobs: 0,
    audit: {
      createdAt: now,
      createdBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    },
  };
  
  const list = getStoredProviders();
  list.push(provider);
  saveProviders(list);
  
  return { success: true, data: provider };
}

/**
 * Obtiene un proveedor por ID.
 */
export function getProvider(id: string): ServiceProvider | null {
  return getStoredProviders().find(p => p.id === id) || null;
}

/**
 * Lista proveedores de un edificio.
 */
export function listProviders(buildingId: string, activeOnly = true): ServiceProvider[] {
  let list = getStoredProviders().filter(p => p.buildingId === buildingId);
  
  if (activeOnly) {
    list = list.filter(p => p.isActive);
  }
  
  return list.sort((a, b) => b.avgRating - a.avgRating);
}

/**
 * Lista proveedores por categoría.
 */
export function getProvidersByCategory(
  buildingId: string,
  category: MaintenanceCategory
): ServiceProvider[] {
  return listProviders(buildingId).filter(p =>
    p.categories.includes(category)
  );
}

/**
 * Actualiza el rating promedio de un proveedor.
 */
function updateProviderRating(providerId: string): void {
  const requests = getStoredRequests().filter(r =>
    r.assignedProvider?.id === providerId &&
    r.rating
  );
  
  if (requests.length === 0) return;
  
  const providers = getStoredProviders();
  const index = providers.findIndex(p => p.id === providerId);
  
  if (index === -1) return;
  
  const totalScore = requests.reduce((sum, r) => sum + (r.rating?.score || 0), 0);
  providers[index].avgRating = totalScore / requests.length;
  providers[index].totalJobs = requests.length;
  
  saveProviders(providers);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene estadísticas de mantenimiento de un edificio.
 */
export function getMaintenanceStatistics(
  buildingId: string,
  dateFrom?: string,
  dateTo?: string
): {
  total: number;
  byStatus: Record<MaintenanceStatus, number>;
  byCategory: Record<MaintenanceCategory, number>;
  byPriority: Record<MaintenancePriority, number>;
  avgResolutionTime: number; // en días
  avgRating: number;
  totalCost: number;
} {
  let requests = listMaintenanceRequests({ buildingId });
  
  if (dateFrom) {
    requests = requests.filter(r => r.audit.createdAt >= dateFrom);
  }
  if (dateTo) {
    requests = requests.filter(r => r.audit.createdAt <= dateTo);
  }
  
  const stats = {
    total: requests.length,
    byStatus: {} as Record<MaintenanceStatus, number>,
    byCategory: {} as Record<MaintenanceCategory, number>,
    byPriority: {} as Record<MaintenancePriority, number>,
    avgResolutionTime: 0,
    avgRating: 0,
    totalCost: 0,
  };
  
  let completedCount = 0;
  let totalResolutionDays = 0;
  let ratedCount = 0;
  let totalRating = 0;
  
  for (const r of requests) {
    stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
    stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
    stats.byPriority[r.priority] = (stats.byPriority[r.priority] || 0) + 1;
    
    if (r.status === 'completed' && r.audit.completedAt) {
      completedCount++;
      const created = new Date(r.audit.createdAt);
      const completed = new Date(r.audit.completedAt);
      totalResolutionDays += (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      
      if (r.finalCost) {
        stats.totalCost += r.finalCost.totalCost;
      }
    }
    
    if (r.rating) {
      ratedCount++;
      totalRating += r.rating.score;
    }
  }
  
  stats.avgResolutionTime = completedCount > 0
    ? Math.round((totalResolutionDays / completedCount) * 10) / 10
    : 0;
  
  stats.avgRating = ratedCount > 0
    ? Math.round((totalRating / ratedCount) * 10) / 10
    : 0;
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Requests CRUD
  createMaintenanceRequest,
  getMaintenanceRequest,
  listMaintenanceRequests,
  getPendingRequests,
  getUserRequests,
  updateMaintenanceRequest,
  
  // Status
  approveRequest,
  rejectRequest,
  startWork,
  putOnHold,
  completeRequest,
  cancelRequest,
  
  // Assignment
  assignProvider,
  assignStaff,
  addEstimate,
  
  // Rating
  rateWork,
  
  // Providers
  createProvider,
  getProvider,
  listProviders,
  getProvidersByCategory,
  
  // Statistics
  getMaintenanceStatistics,
};
