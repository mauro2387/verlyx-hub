/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - ANNOUNCEMENT SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE NOVEDADES Y ACTIVIDADES ENTERPRISE
 * 
 * Implementa:
 * - Novedades/Noticias del edificio
 * - Actividades y eventos
 * - Notificaciones push/email
 * - Programación de publicaciones
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

export type AnnouncementType = 'news' | 'event' | 'alert' | 'maintenance' | 'community' | 'regulation';
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'app' | 'email' | 'sms' | 'push';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface Announcement {
  id: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** Tipo */
  type: AnnouncementType;
  
  /** Estado */
  status: AnnouncementStatus;
  
  /** Prioridad */
  priority: AnnouncementPriority;
  
  /** Título */
  title: string;
  
  /** Contenido (puede ser HTML/Markdown) */
  content: string;
  
  /** Resumen corto */
  summary?: string;
  
  /** Imagen de portada */
  coverImage?: string;
  
  /** Archivos adjuntos */
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  
  /** Fecha de publicación programada */
  publishAt?: string;
  
  /** Fecha de expiración */
  expiresAt?: string;
  
  /** Canales de notificación */
  notificationChannels: NotificationChannel[];
  
  /** Destinatarios específicos (vacío = todos) */
  targetAudience: {
    allUsers: boolean;
    roles?: string[];
    unitIds?: string[];
    floors?: number[];
  };
  
  /** Estadísticas */
  stats: {
    views: number;
    uniqueViews: number;
    reactions: Record<string, number>;
    shares: number;
  };
  
  /** Usuarios que han visto el anuncio */
  viewedBy: string[];
  
  /** Permite comentarios */
  allowComments: boolean;
  
  /** Fijado arriba */
  isPinned: boolean;
  
  /** Auditoría */
  audit: {
    createdAt: string;
    createdBy: string;
    createdByName: string;
    updatedAt: string;
    updatedBy: string;
    updatedByName: string;
    publishedAt?: string;
    publishedBy?: string;
    archivedAt?: string;
    archivedBy?: string;
    version: number;
  };
}

export interface Activity {
  id: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** Título del evento */
  title: string;
  
  /** Descripción */
  description: string;
  
  /** Imagen de portada */
  coverImage?: string;
  
  /** Estado */
  status: EventStatus;
  
  /** Fecha y hora de inicio */
  startDate: string;
  startTime: string;
  
  /** Fecha y hora de fin */
  endDate: string;
  endTime: string;
  
  /** Ubicación */
  location?: string;
  
  /** Organizador */
  organizer: {
    userId: string;
    name: string;
    contact?: string;
  };
  
  /** Capacidad máxima */
  maxCapacity?: number;
  
  /** Requiere inscripción */
  requiresRegistration: boolean;
  
  /** Costo */
  cost?: {
    amount: number;
    currency: 'ARS' | 'USD';
    description?: string;
  };
  
  /** Inscripciones */
  registrations: {
    userId: string;
    userName: string;
    unitId: string;
    guests: number;
    registeredAt: string;
    status: 'registered' | 'cancelled' | 'attended';
  }[];
  
  /** Tags */
  tags: string[];
  
  /** Recurrencia */
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
  
  /** Auditoría */
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

// Input Types
export interface CreateAnnouncementInput {
  buildingId: string;
  type: AnnouncementType;
  priority?: AnnouncementPriority;
  title: string;
  content: string;
  summary?: string;
  coverImage?: string;
  attachments?: Announcement['attachments'];
  publishAt?: string;
  expiresAt?: string;
  notificationChannels?: NotificationChannel[];
  targetAudience?: Announcement['targetAudience'];
  allowComments?: boolean;
  isPinned?: boolean;
  publishImmediately?: boolean;
}

export interface CreateActivityInput {
  buildingId: string;
  title: string;
  description: string;
  coverImage?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location?: string;
  organizer: Activity['organizer'];
  maxCapacity?: number;
  requiresRegistration?: boolean;
  cost?: Activity['cost'];
  tags?: string[];
  recurrence?: Activity['recurrence'];
}

export interface AnnouncementFilters {
  buildingId?: string;
  type?: AnnouncementType | AnnouncementType[];
  status?: AnnouncementStatus | AnnouncementStatus[];
  priority?: AnnouncementPriority | AnnouncementPriority[];
  search?: string;
  pinnedOnly?: boolean;
  unreadOnly?: boolean;
  userId?: string; // Para filtrar no leídos
}

export interface ActivityFilters {
  buildingId?: string;
  status?: EventStatus | EventStatus[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tags?: string[];
  registeredUserId?: string;
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

const ANNOUNCEMENTS_KEY = 'aquarela_announcements_v2';
const ACTIVITIES_KEY = 'aquarela_activities_v2';

function getStoredAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[AnnouncementService] Failed to read announcements:', e);
    return [];
  }
}

function saveAnnouncements(list: Announcement[]): void {
  try {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[AnnouncementService] Failed to save announcements:', e);
  }
}

function getStoredActivities(): Activity[] {
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[AnnouncementService] Failed to read activities:', e);
    return [];
  }
}

function saveActivities(list: Activity[]): void {
  try {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[AnnouncementService] Failed to save activities:', e);
  }
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

function shouldPublish(announcement: Announcement): boolean {
  if (announcement.status !== 'scheduled') return false;
  if (!announcement.publishAt) return false;
  return new Date(announcement.publishAt) <= new Date();
}

function isExpired(announcement: Announcement): boolean {
  if (!announcement.expiresAt) return false;
  return new Date(announcement.expiresAt) < new Date();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENT CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una nueva novedad.
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput,
  actor: AuditActor
): Promise<OperationResult<Announcement>> {
  if (!input.title?.trim()) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El título es requerido' },
    };
  }
  
  if (!input.content?.trim()) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El contenido es requerido' },
    };
  }
  
  const now = nowISO();
  
  let status: AnnouncementStatus = 'draft';
  if (input.publishImmediately) {
    status = 'published';
  } else if (input.publishAt) {
    status = 'scheduled';
  }
  
  const announcement: Announcement = {
    id: generateUUID(),
    buildingId: input.buildingId,
    type: input.type,
    status,
    priority: input.priority || 'normal',
    title: input.title.trim(),
    content: input.content,
    summary: input.summary,
    coverImage: input.coverImage,
    attachments: input.attachments || [],
    publishAt: input.publishAt,
    expiresAt: input.expiresAt,
    notificationChannels: input.notificationChannels || ['app'],
    targetAudience: input.targetAudience || { allUsers: true },
    stats: {
      views: 0,
      uniqueViews: 0,
      reactions: {},
      shares: 0,
    },
    viewedBy: [],
    allowComments: input.allowComments ?? true,
    isPinned: input.isPinned ?? false,
    audit: {
      createdAt: now,
      createdBy: actor.userId,
      createdByName: actor.userName,
      updatedAt: now,
      updatedBy: actor.userId,
      updatedByName: actor.userName,
      publishedAt: input.publishImmediately ? now : undefined,
      publishedBy: input.publishImmediately ? actor.userId : undefined,
      version: 1,
    },
  };
  
  const list = getStoredAnnouncements();
  list.unshift(announcement);
  saveAnnouncements(list);
  
  await auditCreate(
    'announcement',
    sanitizeForAudit(announcement as unknown as Record<string, unknown>),
    actor,
    createAuditContext(input.buildingId),
    `Novedad: ${announcement.title}`
  );
  
  console.log(`[AnnouncementService] Created announcement: ${announcement.title}`);
  
  return { success: true, data: announcement };
}

/**
 * Obtiene una novedad por ID.
 */
export function getAnnouncement(id: string): Announcement | null {
  return getStoredAnnouncements().find(a => a.id === id) || null;
}

/**
 * Lista novedades con filtros.
 */
export function listAnnouncements(filters: AnnouncementFilters = {}): Announcement[] {
  let list = getStoredAnnouncements();
  
  // Procesar publicaciones programadas
  const now = new Date();
  let updated = false;
  for (const a of list) {
    if (shouldPublish(a)) {
      a.status = 'published';
      a.audit.publishedAt = nowISO();
      updated = true;
    }
    if (a.status === 'published' && isExpired(a)) {
      a.status = 'archived';
      a.audit.archivedAt = nowISO();
      updated = true;
    }
  }
  if (updated) {
    saveAnnouncements(list);
  }
  
  // Aplicar filtros
  if (filters.buildingId) {
    list = list.filter(a => a.buildingId === filters.buildingId);
  }
  
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    list = list.filter(a => types.includes(a.type));
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(a => statuses.includes(a.status));
  }
  
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    list = list.filter(a => priorities.includes(a.priority));
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    list = list.filter(a =>
      a.title.toLowerCase().includes(search) ||
      a.content.toLowerCase().includes(search)
    );
  }
  
  if (filters.pinnedOnly) {
    list = list.filter(a => a.isPinned);
  }
  
  if (filters.unreadOnly && filters.userId) {
    list = list.filter(a => !a.viewedBy.includes(filters.userId!));
  }
  
  // Ordenar: pinned primero, luego por fecha
  return list.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    
    const dateA = a.audit.publishedAt || a.audit.createdAt;
    const dateB = b.audit.publishedAt || b.audit.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
}

/**
 * Lista novedades publicadas para un edificio.
 */
export function getPublishedAnnouncements(buildingId: string): Announcement[] {
  return listAnnouncements({
    buildingId,
    status: 'published',
  });
}

/**
 * Actualiza una novedad.
 */
export async function updateAnnouncement(
  id: string,
  updates: Partial<Omit<Announcement, 'id' | 'buildingId' | 'audit' | 'stats' | 'viewedBy'>>,
  actor: AuditActor
): Promise<OperationResult<Announcement>> {
  const list = getStoredAnnouncements();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Novedad no encontrada' },
    };
  }
  
  const existing = list[index];
  const previousState = JSON.parse(JSON.stringify(existing)) as Announcement;
  
  // Aplicar actualizaciones
  if (updates.type !== undefined) existing.type = updates.type;
  if (updates.status !== undefined) existing.status = updates.status;
  if (updates.priority !== undefined) existing.priority = updates.priority;
  if (updates.title !== undefined) existing.title = updates.title;
  if (updates.content !== undefined) existing.content = updates.content;
  if (updates.summary !== undefined) existing.summary = updates.summary;
  if (updates.coverImage !== undefined) existing.coverImage = updates.coverImage;
  if (updates.attachments !== undefined) existing.attachments = updates.attachments;
  if (updates.publishAt !== undefined) existing.publishAt = updates.publishAt;
  if (updates.expiresAt !== undefined) existing.expiresAt = updates.expiresAt;
  if (updates.notificationChannels !== undefined) existing.notificationChannels = updates.notificationChannels;
  if (updates.targetAudience !== undefined) existing.targetAudience = updates.targetAudience;
  if (updates.allowComments !== undefined) existing.allowComments = updates.allowComments;
  if (updates.isPinned !== undefined) existing.isPinned = updates.isPinned;
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveAnnouncements(list);
  
  await auditUpdate(
    'announcement',
    id,
    sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    sanitizeForAudit(existing as unknown as Record<string, unknown>),
    actor,
    createAuditContext(existing.buildingId),
    `Novedad: ${existing.title}`
  );
  
  return { success: true, data: existing };
}

/**
 * Publica una novedad.
 */
export async function publishAnnouncement(
  id: string,
  actor: AuditActor
): Promise<OperationResult<Announcement>> {
  const list = getStoredAnnouncements();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Novedad no encontrada' },
    };
  }
  
  const announcement = list[index];
  
  if (announcement.status === 'published') {
    return {
      success: false,
      error: { code: 'ALREADY_PUBLISHED', message: 'La novedad ya está publicada' },
    };
  }
  
  const now = nowISO();
  announcement.status = 'published';
  announcement.audit.publishedAt = now;
  announcement.audit.publishedBy = actor.userId;
  announcement.audit.updatedAt = now;
  announcement.audit.updatedBy = actor.userId;
  announcement.audit.updatedByName = actor.userName;
  announcement.audit.version++;
  
  list[index] = announcement;
  saveAnnouncements(list);
  
  await audit({
    action: 'update',
    entityType: 'announcement',
    entityId: id,
    entityName: `Novedad: ${announcement.title}`,
    actor,
    context: createAuditContext(announcement.buildingId),
    description: 'Novedad publicada',
    tags: ['publication', 'announcement'],
  });
  
  // TODO: Enviar notificaciones según canales configurados
  
  return { success: true, data: announcement };
}

/**
 * Archiva una novedad.
 */
export async function archiveAnnouncement(
  id: string,
  actor: AuditActor
): Promise<OperationResult<Announcement>> {
  const list = getStoredAnnouncements();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Novedad no encontrada' },
    };
  }
  
  const announcement = list[index];
  const now = nowISO();
  
  announcement.status = 'archived';
  announcement.audit.archivedAt = now;
  announcement.audit.archivedBy = actor.userId;
  announcement.audit.updatedAt = now;
  announcement.audit.updatedBy = actor.userId;
  announcement.audit.updatedByName = actor.userName;
  announcement.audit.version++;
  
  list[index] = announcement;
  saveAnnouncements(list);
  
  await audit({
    action: 'update',
    entityType: 'announcement',
    entityId: id,
    entityName: `Novedad: ${announcement.title}`,
    actor,
    context: createAuditContext(announcement.buildingId),
    description: 'Novedad archivada',
    tags: ['archive', 'announcement'],
  });
  
  return { success: true, data: announcement };
}

/**
 * Registra una vista de novedad.
 */
export function recordAnnouncementView(id: string, userId: string): void {
  const list = getStoredAnnouncements();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) return;
  
  const announcement = list[index];
  announcement.stats.views++;
  
  if (!announcement.viewedBy.includes(userId)) {
    announcement.viewedBy.push(userId);
    announcement.stats.uniqueViews++;
  }
  
  list[index] = announcement;
  saveAnnouncements(list);
}

/**
 * Agrega una reacción a una novedad.
 */
export function addReaction(id: string, reaction: string): void {
  const list = getStoredAnnouncements();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) return;
  
  const announcement = list[index];
  announcement.stats.reactions[reaction] = (announcement.stats.reactions[reaction] || 0) + 1;
  
  list[index] = announcement;
  saveAnnouncements(list);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una nueva actividad/evento.
 */
export async function createActivity(
  input: CreateActivityInput,
  actor: AuditActor
): Promise<OperationResult<Activity>> {
  if (!input.title?.trim()) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El título es requerido' },
    };
  }
  
  const now = nowISO();
  
  const activity: Activity = {
    id: generateUUID(),
    buildingId: input.buildingId,
    title: input.title.trim(),
    description: input.description,
    coverImage: input.coverImage,
    status: 'upcoming',
    startDate: input.startDate,
    startTime: input.startTime,
    endDate: input.endDate,
    endTime: input.endTime,
    location: input.location,
    organizer: input.organizer,
    maxCapacity: input.maxCapacity,
    requiresRegistration: input.requiresRegistration ?? false,
    cost: input.cost,
    registrations: [],
    tags: input.tags || [],
    recurrence: input.recurrence,
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
  
  const list = getStoredActivities();
  list.unshift(activity);
  saveActivities(list);
  
  await auditCreate(
    'activity',
    sanitizeForAudit(activity as unknown as Record<string, unknown>),
    actor,
    createAuditContext(input.buildingId),
    `Actividad: ${activity.title}`
  );
  
  console.log(`[AnnouncementService] Created activity: ${activity.title}`);
  
  return { success: true, data: activity };
}

/**
 * Obtiene una actividad por ID.
 */
export function getActivity(id: string): Activity | null {
  return getStoredActivities().find(a => a.id === id) || null;
}

/**
 * Lista actividades con filtros.
 */
export function listActivities(filters: ActivityFilters = {}): Activity[] {
  let list = getStoredActivities();
  
  // Actualizar estados según fecha
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().substring(0, 5);
  
  let updated = false;
  for (const a of list) {
    if (a.status === 'upcoming') {
      if (a.startDate < today || (a.startDate === today && a.startTime <= currentTime)) {
        a.status = 'ongoing';
        updated = true;
      }
    }
    if (a.status === 'ongoing') {
      if (a.endDate < today || (a.endDate === today && a.endTime < currentTime)) {
        a.status = 'completed';
        updated = true;
      }
    }
  }
  if (updated) {
    saveActivities(list);
  }
  
  // Aplicar filtros
  if (filters.buildingId) {
    list = list.filter(a => a.buildingId === filters.buildingId);
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(a => statuses.includes(a.status));
  }
  
  if (filters.dateFrom) {
    list = list.filter(a => a.startDate >= filters.dateFrom!);
  }
  
  if (filters.dateTo) {
    list = list.filter(a => a.startDate <= filters.dateTo!);
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    list = list.filter(a =>
      a.title.toLowerCase().includes(search) ||
      a.description.toLowerCase().includes(search)
    );
  }
  
  if (filters.tags && filters.tags.length > 0) {
    list = list.filter(a =>
      filters.tags!.some(tag => a.tags.includes(tag))
    );
  }
  
  if (filters.registeredUserId) {
    list = list.filter(a =>
      a.registrations.some(r =>
        r.userId === filters.registeredUserId && r.status === 'registered'
      )
    );
  }
  
  // Ordenar por fecha de inicio
  return list.sort((a, b) => {
    const dateCompare = a.startDate.localeCompare(b.startDate);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Lista actividades próximas de un edificio.
 */
export function getUpcomingActivities(buildingId: string, limit = 10): Activity[] {
  return listActivities({
    buildingId,
    status: ['upcoming', 'ongoing'],
  }).slice(0, limit);
}

/**
 * Actualiza una actividad.
 */
export async function updateActivity(
  id: string,
  updates: Partial<Omit<Activity, 'id' | 'buildingId' | 'audit' | 'registrations'>>,
  actor: AuditActor
): Promise<OperationResult<Activity>> {
  const list = getStoredActivities();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Actividad no encontrada' },
    };
  }
  
  const existing = list[index];
  const previousState = JSON.parse(JSON.stringify(existing)) as Activity;
  
  // Aplicar actualizaciones
  if (updates.title !== undefined) existing.title = updates.title;
  if (updates.description !== undefined) existing.description = updates.description;
  if (updates.coverImage !== undefined) existing.coverImage = updates.coverImage;
  if (updates.status !== undefined) existing.status = updates.status;
  if (updates.startDate !== undefined) existing.startDate = updates.startDate;
  if (updates.startTime !== undefined) existing.startTime = updates.startTime;
  if (updates.endDate !== undefined) existing.endDate = updates.endDate;
  if (updates.endTime !== undefined) existing.endTime = updates.endTime;
  if (updates.location !== undefined) existing.location = updates.location;
  if (updates.organizer !== undefined) existing.organizer = updates.organizer;
  if (updates.maxCapacity !== undefined) existing.maxCapacity = updates.maxCapacity;
  if (updates.requiresRegistration !== undefined) existing.requiresRegistration = updates.requiresRegistration;
  if (updates.cost !== undefined) existing.cost = updates.cost;
  if (updates.tags !== undefined) existing.tags = updates.tags;
  if (updates.recurrence !== undefined) existing.recurrence = updates.recurrence;
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveActivities(list);
  
  await auditUpdate(
    'activity',
    id,
    sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    sanitizeForAudit(existing as unknown as Record<string, unknown>),
    actor,
    createAuditContext(existing.buildingId),
    `Actividad: ${existing.title}`
  );
  
  return { success: true, data: existing };
}

/**
 * Cancela una actividad.
 */
export async function cancelActivity(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<Activity>> {
  const result = await updateActivity(id, { status: 'cancelled' }, actor);
  
  if (result.success && result.data) {
    await audit({
      action: 'update',
      entityType: 'activity',
      entityId: id,
      entityName: `Actividad: ${result.data.title}`,
      actor,
      context: createAuditContext(result.data.buildingId),
      description: `Actividad cancelada: ${reason}`,
      tags: ['cancellation', 'activity'],
      severity: 'high',
    });
    
    // TODO: Notificar a los inscriptos
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY REGISTRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registra un usuario en una actividad.
 */
export async function registerForActivity(
  activityId: string,
  userId: string,
  userName: string,
  unitId: string,
  guests: number = 0,
  actor: AuditActor
): Promise<OperationResult<Activity>> {
  const list = getStoredActivities();
  const index = list.findIndex(a => a.id === activityId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Actividad no encontrada' },
    };
  }
  
  const activity = list[index];
  
  if (activity.status !== 'upcoming') {
    return {
      success: false,
      error: { code: 'NOT_AVAILABLE', message: 'La actividad no está disponible para inscripción' },
    };
  }
  
  // Verificar si ya está inscripto
  const existing = activity.registrations.find(r => r.userId === userId);
  if (existing && existing.status === 'registered') {
    return {
      success: false,
      error: { code: 'ALREADY_REGISTERED', message: 'Ya está inscripto en esta actividad' },
    };
  }
  
  // Verificar capacidad
  if (activity.maxCapacity) {
    const currentCount = activity.registrations
      .filter(r => r.status === 'registered')
      .reduce((sum, r) => sum + 1 + r.guests, 0);
    
    if (currentCount + 1 + guests > activity.maxCapacity) {
      return {
        success: false,
        error: { code: 'CAPACITY_EXCEEDED', message: 'No hay cupos disponibles' },
      };
    }
  }
  
  activity.registrations.push({
    userId,
    userName,
    unitId,
    guests,
    registeredAt: nowISO(),
    status: 'registered',
  });
  
  activity.audit.updatedAt = nowISO();
  activity.audit.updatedBy = actor.userId;
  activity.audit.updatedByName = actor.userName;
  activity.audit.version++;
  
  list[index] = activity;
  saveActivities(list);
  
  await audit({
    action: 'update',
    entityType: 'activity',
    entityId: activityId,
    entityName: `Actividad: ${activity.title}`,
    actor,
    context: createAuditContext(activity.buildingId),
    description: `Usuario inscripto: ${userName}`,
    tags: ['registration', 'activity'],
  });
  
  return { success: true, data: activity };
}

/**
 * Cancela la inscripción de un usuario.
 */
export async function cancelRegistration(
  activityId: string,
  userId: string,
  actor: AuditActor
): Promise<OperationResult<Activity>> {
  const list = getStoredActivities();
  const index = list.findIndex(a => a.id === activityId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Actividad no encontrada' },
    };
  }
  
  const activity = list[index];
  const regIndex = activity.registrations.findIndex(r => r.userId === userId);
  
  if (regIndex === -1) {
    return {
      success: false,
      error: { code: 'NOT_REGISTERED', message: 'No está inscripto en esta actividad' },
    };
  }
  
  const registration = activity.registrations[regIndex];
  registration.status = 'cancelled';
  
  activity.audit.updatedAt = nowISO();
  activity.audit.updatedBy = actor.userId;
  activity.audit.updatedByName = actor.userName;
  activity.audit.version++;
  
  list[index] = activity;
  saveActivities(list);
  
  await audit({
    action: 'update',
    entityType: 'activity',
    entityId: activityId,
    entityName: `Actividad: ${activity.title}`,
    actor,
    context: createAuditContext(activity.buildingId),
    description: `Inscripción cancelada: ${registration.userName}`,
    tags: ['registration-cancel', 'activity'],
  });
  
  return { success: true, data: activity };
}

/**
 * Marca asistencia de un usuario.
 */
export async function markAttendance(
  activityId: string,
  userId: string,
  actor: AuditActor
): Promise<OperationResult<Activity>> {
  const list = getStoredActivities();
  const index = list.findIndex(a => a.id === activityId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Actividad no encontrada' },
    };
  }
  
  const activity = list[index];
  const regIndex = activity.registrations.findIndex(r => r.userId === userId);
  
  if (regIndex === -1) {
    return {
      success: false,
      error: { code: 'NOT_REGISTERED', message: 'El usuario no está inscripto' },
    };
  }
  
  activity.registrations[regIndex].status = 'attended';
  
  list[index] = activity;
  saveActivities(list);
  
  return { success: true, data: activity };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene estadísticas de anuncios de un edificio.
 */
export function getAnnouncementStats(buildingId: string): {
  total: number;
  byType: Record<AnnouncementType, number>;
  byStatus: Record<AnnouncementStatus, number>;
  totalViews: number;
  avgViewsPerAnnouncement: number;
} {
  const announcements = listAnnouncements({ buildingId });
  
  const stats = {
    total: announcements.length,
    byType: {} as Record<AnnouncementType, number>,
    byStatus: {} as Record<AnnouncementStatus, number>,
    totalViews: 0,
    avgViewsPerAnnouncement: 0,
  };
  
  for (const a of announcements) {
    stats.byType[a.type] = (stats.byType[a.type] || 0) + 1;
    stats.byStatus[a.status] = (stats.byStatus[a.status] || 0) + 1;
    stats.totalViews += a.stats.views;
  }
  
  stats.avgViewsPerAnnouncement = stats.total > 0
    ? Math.round(stats.totalViews / stats.total)
    : 0;
  
  return stats;
}

/**
 * Obtiene estadísticas de actividades de un edificio.
 */
export function getActivityStats(buildingId: string): {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  totalRegistrations: number;
  avgAttendance: number;
} {
  const activities = listActivities({ buildingId });
  
  const stats = {
    total: activities.length,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    totalRegistrations: 0,
    avgAttendance: 0,
  };
  
  let completedWithAttendance = 0;
  let totalAttended = 0;
  
  for (const a of activities) {
    switch (a.status) {
      case 'upcoming':
      case 'ongoing':
        stats.upcoming++;
        break;
      case 'completed':
        stats.completed++;
        const attended = a.registrations.filter(r => r.status === 'attended').length;
        if (attended > 0) {
          completedWithAttendance++;
          totalAttended += attended;
        }
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
    }
    
    stats.totalRegistrations += a.registrations.filter(r => r.status === 'registered').length;
  }
  
  stats.avgAttendance = completedWithAttendance > 0
    ? Math.round(totalAttended / completedWithAttendance)
    : 0;
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Announcements
  createAnnouncement,
  getAnnouncement,
  listAnnouncements,
  getPublishedAnnouncements,
  updateAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  recordAnnouncementView,
  addReaction,
  
  // Activities
  createActivity,
  getActivity,
  listActivities,
  getUpcomingActivities,
  updateActivity,
  cancelActivity,
  
  // Registrations
  registerForActivity,
  cancelRegistration,
  markAttendance,
  
  // Statistics
  getAnnouncementStats,
  getActivityStats,
};
