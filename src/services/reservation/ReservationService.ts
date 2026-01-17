/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - RESERVATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE GESTIÓN DE RESERVAS ENTERPRISE
 * 
 * Implementa:
 * - CRUD de amenities/servicios reservables
 * - Gestión de reservas con conflictos
 * - Precios y configuración de horarios
 * - Validación de disponibilidad
 * - Cancelaciones con políticas
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

export type AmenityType =
  | 'pool'
  | 'gym'
  | 'sauna'
  | 'bbq'
  | 'party_room'
  | 'meeting_room'
  | 'tennis'
  | 'paddle'
  | 'playground'
  | 'laundry'
  | 'other';

export type AmenityStatus = 'active' | 'inactive' | 'maintenance';
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PricingType = 'free' | 'per_hour' | 'per_block' | 'per_day' | 'fixed';

export interface TimeSlot {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isEnabled: boolean;
}

export interface PricingConfig {
  type: PricingType;
  amount: number;
  currency: 'ARS' | 'USD';
  
  /** Duración del bloque en minutos (para per_block) */
  blockDuration?: number;
  
  /** Depósito requerido */
  depositRequired: boolean;
  depositAmount?: number;
  
  /** Recargos */
  weekendSurcharge?: number;
  holidaySurcharge?: number;
}

export interface BookingRules {
  /** Anticipación mínima para reservar (en horas) */
  minAdvanceHours: number;
  
  /** Anticipación máxima para reservar (en días) */
  maxAdvanceDays: number;
  
  /** Duración mínima de reserva (en minutos) */
  minDuration: number;
  
  /** Duración máxima de reserva (en minutos) */
  maxDuration: number;
  
  /** Máximo de reservas activas por unidad */
  maxActivePerUnit: number;
  
  /** Máximo de reservas por día por unidad */
  maxPerDayPerUnit: number;
  
  /** Requiere aprobación de admin */
  requiresApproval: boolean;
  
  /** Horas para cancelación gratuita */
  freeCancellationHours: number;
  
  /** Solo propietarios pueden reservar */
  ownersOnly: boolean;
  
  /** Capacidad máxima de personas */
  maxCapacity?: number;
}

export interface Amenity {
  id: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** Nombre */
  name: string;
  
  /** Descripción */
  description?: string;
  
  /** Tipo */
  type: AmenityType;
  
  /** Estado */
  status: AmenityStatus;
  
  /** Ubicación (piso, sector) */
  location?: string;
  
  /** Horarios disponibles */
  schedule: TimeSlot[];
  
  /** Configuración de precios */
  pricing: PricingConfig;
  
  /** Reglas de reserva */
  rules: BookingRules;
  
  /** Imágenes */
  images: string[];
  
  /** Instrucciones de uso */
  instructions?: string;
  
  /** Contacto para emergencias */
  emergencyContact?: string;
  
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

export interface Reservation {
  id: string;
  
  /** ID del amenity */
  amenityId: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** ID de la unidad */
  unitId: string;
  
  /** ID del usuario que reserva */
  userId: string;
  
  /** Nombre del usuario (denormalizado) */
  userName: string;
  
  /** Fecha de la reserva */
  date: string; // YYYY-MM-DD
  
  /** Hora de inicio */
  startTime: string; // HH:mm
  
  /** Hora de fin */
  endTime: string; // HH:mm
  
  /** Estado */
  status: ReservationStatus;
  
  /** Cantidad de personas */
  guestCount?: number;
  
  /** Notas */
  notes?: string;
  
  /** Monto total */
  totalAmount: number;
  
  /** Depósito */
  depositAmount?: number;
  depositPaid: boolean;
  depositReturned: boolean;
  
  /** Auditoría */
  audit: {
    createdAt: string;
    createdBy: string;
    createdByName: string;
    confirmedAt?: string;
    confirmedBy?: string;
    cancelledAt?: string;
    cancelledBy?: string;
    cancelReason?: string;
    completedAt?: string;
  };
}

// Input Types
export interface CreateAmenityInput {
  buildingId: string;
  name: string;
  description?: string;
  type: AmenityType;
  location?: string;
  schedule?: TimeSlot[];
  pricing?: Partial<PricingConfig>;
  rules?: Partial<BookingRules>;
  images?: string[];
  instructions?: string;
  emergencyContact?: string;
}

export interface CreateReservationInput {
  amenityId: string;
  unitId: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount?: number;
  notes?: string;
}

export interface ReservationFilters {
  amenityId?: string;
  buildingId?: string;
  unitId?: string;
  userId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: ReservationStatus | ReservationStatus[];
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
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

const AMENITIES_KEY = 'aquarela_amenities_v2';
const RESERVATIONS_KEY = 'aquarela_reservations_v2';

function getStoredAmenities(): Amenity[] {
  try {
    const raw = localStorage.getItem(AMENITIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[ReservationService] Failed to read amenities:', e);
    return [];
  }
}

function saveAmenities(list: Amenity[]): void {
  try {
    localStorage.setItem(AMENITIES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[ReservationService] Failed to save amenities:', e);
  }
}

function getStoredReservations(): Reservation[] {
  try {
    const raw = localStorage.getItem(RESERVATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[ReservationService] Failed to read reservations:', e);
    return [];
  }
}

function saveReservations(list: Reservation[]): void {
  try {
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[ReservationService] Failed to save reservations:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

function getDefaultSchedule(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  // Lunes a Viernes: 8:00 - 22:00
  for (let day = 1; day <= 5; day++) {
    slots.push({
      dayOfWeek: day,
      startTime: '08:00',
      endTime: '22:00',
      isEnabled: true,
    });
  }
  // Sábado y Domingo: 9:00 - 20:00
  for (const day of [0, 6]) {
    slots.push({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '20:00',
      isEnabled: true,
    });
  }
  return slots;
}

function getDefaultPricing(): PricingConfig {
  return {
    type: 'free',
    amount: 0,
    currency: 'ARS',
    depositRequired: false,
  };
}

function getDefaultRules(): BookingRules {
  return {
    minAdvanceHours: 24,
    maxAdvanceDays: 30,
    minDuration: 60,
    maxDuration: 240,
    maxActivePerUnit: 2,
    maxPerDayPerUnit: 1,
    requiresApproval: false,
    freeCancellationHours: 24,
    ownersOnly: false,
  };
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

function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function timeToMinutes(time: string): number {
  return parseTime(time);
}

function calculateDurationMinutes(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  
  return s1 < e2 && s2 < e1;
}

function calculatePrice(
  amenity: Amenity,
  startTime: string,
  endTime: string,
  date: string
): number {
  const { pricing } = amenity;
  
  if (pricing.type === 'free') return 0;
  if (pricing.type === 'fixed') return pricing.amount;
  
  const durationMinutes = calculateDurationMinutes(startTime, endTime);
  let price = 0;
  
  switch (pricing.type) {
    case 'per_hour':
      price = (durationMinutes / 60) * pricing.amount;
      break;
    case 'per_block':
      const blocks = Math.ceil(durationMinutes / (pricing.blockDuration || 60));
      price = blocks * pricing.amount;
      break;
    case 'per_day':
      price = pricing.amount;
      break;
  }
  
  // Aplicar recargos
  const dayOfWeek = getDayOfWeek(date);
  if ((dayOfWeek === 0 || dayOfWeek === 6) && pricing.weekendSurcharge) {
    price += (price * pricing.weekendSurcharge) / 100;
  }
  
  return Math.round(price * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AMENITY CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea un nuevo amenity.
 */
export async function createAmenity(
  input: CreateAmenityInput,
  actor: AuditActor
): Promise<OperationResult<Amenity>> {
  if (!input.name?.trim()) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El nombre es requerido' },
    };
  }
  
  const now = nowISO();
  
  const amenity: Amenity = {
    id: generateUUID(),
    buildingId: input.buildingId,
    name: input.name.trim(),
    description: input.description,
    type: input.type,
    status: 'active',
    location: input.location,
    schedule: input.schedule || getDefaultSchedule(),
    pricing: { ...getDefaultPricing(), ...input.pricing },
    rules: { ...getDefaultRules(), ...input.rules },
    images: input.images || [],
    instructions: input.instructions,
    emergencyContact: input.emergencyContact,
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
  
  const list = getStoredAmenities();
  list.unshift(amenity);
  saveAmenities(list);
  
  await auditCreate(
    'amenity',
    sanitizeForAudit(amenity as unknown as Record<string, unknown>),
    actor,
    createAuditContext(input.buildingId),
    `Amenity ${amenity.name}`
  );
  
  console.log(`[ReservationService] Created amenity: ${amenity.name}`);
  
  return { success: true, data: amenity };
}

/**
 * Obtiene un amenity por ID.
 */
export function getAmenity(id: string): Amenity | null {
  return getStoredAmenities().find(a => a.id === id) || null;
}

/**
 * Lista amenities de un edificio.
 */
export function listAmenities(buildingId: string, activeOnly = true): Amenity[] {
  let list = getStoredAmenities().filter(a => a.buildingId === buildingId);
  
  if (activeOnly) {
    list = list.filter(a => a.status === 'active');
  }
  
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Actualiza un amenity.
 */
export async function updateAmenity(
  id: string,
  updates: Partial<Omit<Amenity, 'id' | 'buildingId' | 'audit'>>,
  actor: AuditActor
): Promise<OperationResult<Amenity>> {
  const list = getStoredAmenities();
  const index = list.findIndex(a => a.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Amenity no encontrado' },
    };
  }
  
  const existing = list[index];
  const previousState = JSON.parse(JSON.stringify(existing)) as Amenity;
  
  // Aplicar actualizaciones
  if (updates.name !== undefined) existing.name = updates.name;
  if (updates.description !== undefined) existing.description = updates.description;
  if (updates.type !== undefined) existing.type = updates.type;
  if (updates.status !== undefined) existing.status = updates.status;
  if (updates.location !== undefined) existing.location = updates.location;
  if (updates.schedule !== undefined) existing.schedule = updates.schedule;
  if (updates.pricing !== undefined) existing.pricing = { ...existing.pricing, ...updates.pricing };
  if (updates.rules !== undefined) existing.rules = { ...existing.rules, ...updates.rules };
  if (updates.images !== undefined) existing.images = updates.images;
  if (updates.instructions !== undefined) existing.instructions = updates.instructions;
  if (updates.emergencyContact !== undefined) existing.emergencyContact = updates.emergencyContact;
  
  existing.audit.updatedAt = nowISO();
  existing.audit.updatedBy = actor.userId;
  existing.audit.updatedByName = actor.userName;
  existing.audit.version++;
  
  list[index] = existing;
  saveAmenities(list);
  
  await auditUpdate(
    'amenity',
    id,
    sanitizeForAudit(previousState as unknown as Record<string, unknown>),
    sanitizeForAudit(existing as unknown as Record<string, unknown>),
    actor,
    createAuditContext(existing.buildingId),
    `Amenity ${existing.name}`
  );
  
  return { success: true, data: existing };
}

/**
 * Desactiva un amenity.
 */
export async function deactivateAmenity(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<Amenity>> {
  const result = await updateAmenity(id, { status: 'inactive' }, actor);
  
  if (result.success && result.data) {
    await audit({
      action: 'update',
      entityType: 'amenity',
      entityId: id,
      entityName: `Amenity ${result.data.name}`,
      actor,
      context: createAuditContext(result.data.buildingId),
      description: `Desactivado: ${reason}`,
      tags: ['deactivation', 'amenity'],
      severity: 'high',
    });
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene la disponibilidad de un amenity para una fecha.
 */
export function getAvailability(
  amenityId: string,
  date: string
): AvailabilitySlot[] {
  const amenity = getAmenity(amenityId);
  if (!amenity) return [];
  
  const dayOfWeek = getDayOfWeek(date);
  const daySchedule = amenity.schedule.find(s => s.dayOfWeek === dayOfWeek);
  
  if (!daySchedule || !daySchedule.isEnabled) {
    return [{
      startTime: '00:00',
      endTime: '23:59',
      available: false,
      reason: 'Cerrado este día',
    }];
  }
  
  // Obtener reservas existentes para este día
  const reservations = getStoredReservations().filter(r =>
    r.amenityId === amenityId &&
    r.date === date &&
    (r.status === 'confirmed' || r.status === 'pending')
  );
  
  const slots: AvailabilitySlot[] = [];
  const slotDuration = amenity.rules.minDuration || 60;
  
  let currentTime = parseTime(daySchedule.startTime);
  const endTime = parseTime(daySchedule.endTime);
  
  while (currentTime + slotDuration <= endTime) {
    const slotStart = `${Math.floor(currentTime / 60).toString().padStart(2, '0')}:${(currentTime % 60).toString().padStart(2, '0')}`;
    const slotEnd = `${Math.floor((currentTime + slotDuration) / 60).toString().padStart(2, '0')}:${((currentTime + slotDuration) % 60).toString().padStart(2, '0')}`;
    
    // Verificar si hay conflicto con reservas existentes
    const conflict = reservations.find(r =>
      timesOverlap(r.startTime, r.endTime, slotStart, slotEnd)
    );
    
    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      available: !conflict,
      reason: conflict ? 'Ya reservado' : undefined,
    });
    
    currentTime += slotDuration;
  }
  
  return slots;
}

/**
 * Verifica si un horario específico está disponible.
 */
export function isSlotAvailable(
  amenityId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: string
): { available: boolean; reason?: string } {
  const amenity = getAmenity(amenityId);
  if (!amenity) {
    return { available: false, reason: 'Amenity no encontrado' };
  }
  
  if (amenity.status !== 'active') {
    return { available: false, reason: 'Amenity no disponible' };
  }
  
  // Verificar día de la semana
  const dayOfWeek = getDayOfWeek(date);
  const daySchedule = amenity.schedule.find(s => s.dayOfWeek === dayOfWeek);
  
  if (!daySchedule || !daySchedule.isEnabled) {
    return { available: false, reason: 'Cerrado este día' };
  }
  
  // Verificar horario dentro del rango permitido
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  const scheduleStart = parseTime(daySchedule.startTime);
  const scheduleEnd = parseTime(daySchedule.endTime);
  
  if (startMinutes < scheduleStart || endMinutes > scheduleEnd) {
    return { available: false, reason: `Fuera del horario (${daySchedule.startTime} - ${daySchedule.endTime})` };
  }
  
  // Verificar duración
  const duration = endMinutes - startMinutes;
  if (duration < amenity.rules.minDuration) {
    return { available: false, reason: `Duración mínima: ${amenity.rules.minDuration} minutos` };
  }
  if (duration > amenity.rules.maxDuration) {
    return { available: false, reason: `Duración máxima: ${amenity.rules.maxDuration} minutos` };
  }
  
  // Verificar conflictos con otras reservas
  const reservations = getStoredReservations().filter(r =>
    r.amenityId === amenityId &&
    r.date === date &&
    (r.status === 'confirmed' || r.status === 'pending') &&
    r.id !== excludeReservationId
  );
  
  const conflict = reservations.find(r =>
    timesOverlap(r.startTime, r.endTime, startTime, endTime)
  );
  
  if (conflict) {
    return { available: false, reason: `Conflicto con reserva existente (${conflict.startTime} - ${conflict.endTime})` };
  }
  
  return { available: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESERVATION CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una nueva reserva.
 */
export async function createReservation(
  input: CreateReservationInput,
  actor: AuditActor
): Promise<OperationResult<Reservation>> {
  const amenity = getAmenity(input.amenityId);
  if (!amenity) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Amenity no encontrado' },
    };
  }
  
  // Verificar disponibilidad
  const availability = isSlotAvailable(
    input.amenityId,
    input.date,
    input.startTime,
    input.endTime
  );
  
  if (!availability.available) {
    return {
      success: false,
      error: { code: 'NOT_AVAILABLE', message: availability.reason || 'Horario no disponible' },
    };
  }
  
  // Verificar anticipación mínima
  const reservationDate = new Date(`${input.date}T${input.startTime}`);
  const now = new Date();
  const hoursUntil = (reservationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntil < amenity.rules.minAdvanceHours) {
    return {
      success: false,
      error: {
        code: 'TOO_SOON',
        message: `Debe reservar con al menos ${amenity.rules.minAdvanceHours} horas de anticipación`,
      },
    };
  }
  
  // Verificar anticipación máxima
  const daysUntil = hoursUntil / 24;
  if (daysUntil > amenity.rules.maxAdvanceDays) {
    return {
      success: false,
      error: {
        code: 'TOO_FAR',
        message: `No puede reservar con más de ${amenity.rules.maxAdvanceDays} días de anticipación`,
      },
    };
  }
  
  // Verificar límite de reservas activas por unidad
  const activeReservations = getStoredReservations().filter(r =>
    r.unitId === input.unitId &&
    r.amenityId === input.amenityId &&
    (r.status === 'confirmed' || r.status === 'pending') &&
    r.date >= new Date().toISOString().split('T')[0]
  );
  
  if (activeReservations.length >= amenity.rules.maxActivePerUnit) {
    return {
      success: false,
      error: {
        code: 'LIMIT_REACHED',
        message: `Máximo ${amenity.rules.maxActivePerUnit} reservas activas por unidad`,
      },
    };
  }
  
  // Verificar límite por día
  const sameDayReservations = activeReservations.filter(r => r.date === input.date);
  if (sameDayReservations.length >= amenity.rules.maxPerDayPerUnit) {
    return {
      success: false,
      error: {
        code: 'DAILY_LIMIT',
        message: `Máximo ${amenity.rules.maxPerDayPerUnit} reserva(s) por día`,
      },
    };
  }
  
  // Calcular precio
  const totalAmount = calculatePrice(amenity, input.startTime, input.endTime, input.date);
  
  const nowISO_ = nowISO();
  
  const reservation: Reservation = {
    id: generateUUID(),
    amenityId: input.amenityId,
    buildingId: amenity.buildingId,
    unitId: input.unitId,
    userId: input.userId,
    userName: input.userName,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    status: amenity.rules.requiresApproval ? 'pending' : 'confirmed',
    guestCount: input.guestCount,
    notes: input.notes,
    totalAmount,
    depositAmount: amenity.pricing.depositRequired ? amenity.pricing.depositAmount : undefined,
    depositPaid: false,
    depositReturned: false,
    audit: {
      createdAt: nowISO_,
      createdBy: actor.userId,
      createdByName: actor.userName,
      confirmedAt: amenity.rules.requiresApproval ? undefined : nowISO_,
    },
  };
  
  const list = getStoredReservations();
  list.unshift(reservation);
  saveReservations(list);
  
  await auditCreate(
    'reservation',
    sanitizeForAudit(reservation as unknown as Record<string, unknown>),
    actor,
    createAuditContext(amenity.buildingId),
    `Reserva ${amenity.name} ${input.date} ${input.startTime}-${input.endTime}`
  );
  
  console.log(`[ReservationService] Created reservation: ${amenity.name} on ${input.date}`);
  
  return { success: true, data: reservation };
}

/**
 * Obtiene una reserva por ID.
 */
export function getReservation(id: string): Reservation | null {
  return getStoredReservations().find(r => r.id === id) || null;
}

/**
 * Lista reservas con filtros.
 */
export function listReservations(filters: ReservationFilters = {}): Reservation[] {
  let list = getStoredReservations();
  
  if (filters.amenityId) {
    list = list.filter(r => r.amenityId === filters.amenityId);
  }
  
  if (filters.buildingId) {
    list = list.filter(r => r.buildingId === filters.buildingId);
  }
  
  if (filters.unitId) {
    list = list.filter(r => r.unitId === filters.unitId);
  }
  
  if (filters.userId) {
    list = list.filter(r => r.userId === filters.userId);
  }
  
  if (filters.date) {
    list = list.filter(r => r.date === filters.date);
  }
  
  if (filters.dateFrom) {
    list = list.filter(r => r.date >= filters.dateFrom!);
  }
  
  if (filters.dateTo) {
    list = list.filter(r => r.date <= filters.dateTo!);
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(r => statuses.includes(r.status));
  }
  
  return list.sort((a, b) => {
    // Ordenar por fecha y hora
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Lista reservas de un usuario.
 */
export function getUserReservations(userId: string, upcomingOnly = false): Reservation[] {
  let list = listReservations({ userId });
  
  if (upcomingOnly) {
    const today = new Date().toISOString().split('T')[0];
    list = list.filter(r =>
      r.date >= today &&
      (r.status === 'confirmed' || r.status === 'pending')
    );
  }
  
  return list;
}

/**
 * Lista reservas de una unidad.
 */
export function getUnitReservations(unitId: string, upcomingOnly = false): Reservation[] {
  let list = listReservations({ unitId });
  
  if (upcomingOnly) {
    const today = new Date().toISOString().split('T')[0];
    list = list.filter(r =>
      r.date >= today &&
      (r.status === 'confirmed' || r.status === 'pending')
    );
  }
  
  return list;
}

/**
 * Confirma una reserva pendiente.
 */
export async function confirmReservation(
  id: string,
  actor: AuditActor
): Promise<OperationResult<Reservation>> {
  const list = getStoredReservations();
  const index = list.findIndex(r => r.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Reserva no encontrada' },
    };
  }
  
  const reservation = list[index];
  
  if (reservation.status !== 'pending') {
    return {
      success: false,
      error: { code: 'INVALID_STATUS', message: `No se puede confirmar una reserva ${reservation.status}` },
    };
  }
  
  // Verificar que sigue disponible
  const availability = isSlotAvailable(
    reservation.amenityId,
    reservation.date,
    reservation.startTime,
    reservation.endTime,
    reservation.id
  );
  
  if (!availability.available) {
    return {
      success: false,
      error: { code: 'CONFLICT', message: 'El horario ya no está disponible' },
    };
  }
  
  reservation.status = 'confirmed';
  reservation.audit.confirmedAt = nowISO();
  reservation.audit.confirmedBy = actor.userId;
  
  list[index] = reservation;
  saveReservations(list);
  
  await audit({
    action: 'update',
    entityType: 'reservation',
    entityId: id,
    entityName: `Reserva ${reservation.date}`,
    actor,
    context: createAuditContext(reservation.buildingId),
    description: 'Reserva confirmada',
    tags: ['confirmation', 'reservation'],
  });
  
  return { success: true, data: reservation };
}

/**
 * Cancela una reserva.
 */
export async function cancelReservation(
  id: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<Reservation>> {
  const list = getStoredReservations();
  const index = list.findIndex(r => r.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Reserva no encontrada' },
    };
  }
  
  const reservation = list[index];
  
  if (reservation.status === 'cancelled' || reservation.status === 'completed') {
    return {
      success: false,
      error: { code: 'INVALID_STATUS', message: `No se puede cancelar una reserva ${reservation.status}` },
    };
  }
  
  // Verificar política de cancelación
  const amenity = getAmenity(reservation.amenityId);
  const reservationDate = new Date(`${reservation.date}T${reservation.startTime}`);
  const now = new Date();
  const hoursUntil = (reservationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  let penaltyApplied = false;
  if (amenity && hoursUntil < amenity.rules.freeCancellationHours) {
    penaltyApplied = true;
    // Aquí se podría aplicar una penalización
  }
  
  reservation.status = 'cancelled';
  reservation.audit.cancelledAt = nowISO();
  reservation.audit.cancelledBy = actor.userId;
  reservation.audit.cancelReason = reason;
  
  list[index] = reservation;
  saveReservations(list);
  
  await audit({
    action: 'update',
    entityType: 'reservation',
    entityId: id,
    entityName: `Reserva ${reservation.date}`,
    actor,
    context: createAuditContext(reservation.buildingId),
    description: `Reserva cancelada: ${reason}${penaltyApplied ? ' (fuera del período de cancelación gratuita)' : ''}`,
    tags: ['cancellation', 'reservation'],
    severity: penaltyApplied ? 'high' : 'medium',
  });
  
  return { success: true, data: reservation };
}

/**
 * Marca una reserva como completada.
 */
export async function completeReservation(
  id: string,
  actor: AuditActor
): Promise<OperationResult<Reservation>> {
  const list = getStoredReservations();
  const index = list.findIndex(r => r.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Reserva no encontrada' },
    };
  }
  
  const reservation = list[index];
  
  if (reservation.status !== 'confirmed') {
    return {
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Solo se pueden completar reservas confirmadas' },
    };
  }
  
  reservation.status = 'completed';
  reservation.audit.completedAt = nowISO();
  
  list[index] = reservation;
  saveReservations(list);
  
  return { success: true, data: reservation };
}

/**
 * Marca una reserva como no-show.
 */
export async function markNoShow(
  id: string,
  actor: AuditActor
): Promise<OperationResult<Reservation>> {
  const list = getStoredReservations();
  const index = list.findIndex(r => r.id === id);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Reserva no encontrada' },
    };
  }
  
  const reservation = list[index];
  
  if (reservation.status !== 'confirmed') {
    return {
      success: false,
      error: { code: 'INVALID_STATUS', message: 'Solo se pueden marcar como no-show reservas confirmadas' },
    };
  }
  
  reservation.status = 'no_show';
  
  list[index] = reservation;
  saveReservations(list);
  
  await audit({
    action: 'update',
    entityType: 'reservation',
    entityId: id,
    entityName: `Reserva ${reservation.date}`,
    actor,
    context: createAuditContext(reservation.buildingId),
    description: 'Reserva marcada como no-show',
    tags: ['no-show', 'reservation'],
    severity: 'medium',
  });
  
  return { success: true, data: reservation };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene estadísticas de reservas por amenity.
 */
export function getAmenityStatistics(
  amenityId: string,
  dateFrom?: string,
  dateTo?: string
): {
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  noShow: number;
  revenue: number;
  occupancyRate: number;
} {
  let reservations = listReservations({ amenityId });
  
  if (dateFrom) {
    reservations = reservations.filter(r => r.date >= dateFrom);
  }
  if (dateTo) {
    reservations = reservations.filter(r => r.date <= dateTo);
  }
  
  const stats = {
    total: reservations.length,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    noShow: 0,
    revenue: 0,
    occupancyRate: 0,
  };
  
  for (const r of reservations) {
    switch (r.status) {
      case 'confirmed':
      case 'pending':
        stats.confirmed++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'completed':
        stats.completed++;
        stats.revenue += r.totalAmount;
        break;
      case 'no_show':
        stats.noShow++;
        break;
    }
  }
  
  // Calcular tasa de ocupación (simplificado)
  const usedSlots = stats.completed + stats.confirmed;
  stats.occupancyRate = stats.total > 0 ? (usedSlots / stats.total) * 100 : 0;
  
  return stats;
}

/**
 * Obtiene estadísticas de reservas por edificio.
 */
export function getBuildingReservationStats(
  buildingId: string,
  dateFrom?: string,
  dateTo?: string
): {
  totalReservations: number;
  byAmenity: Record<string, number>;
  byStatus: Record<ReservationStatus, number>;
  totalRevenue: number;
} {
  let reservations = listReservations({ buildingId });
  
  if (dateFrom) {
    reservations = reservations.filter(r => r.date >= dateFrom);
  }
  if (dateTo) {
    reservations = reservations.filter(r => r.date <= dateTo);
  }
  
  const stats = {
    totalReservations: reservations.length,
    byAmenity: {} as Record<string, number>,
    byStatus: {} as Record<ReservationStatus, number>,
    totalRevenue: 0,
  };
  
  for (const r of reservations) {
    stats.byAmenity[r.amenityId] = (stats.byAmenity[r.amenityId] || 0) + 1;
    stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
    
    if (r.status === 'completed') {
      stats.totalRevenue += r.totalAmount;
    }
  }
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Amenities
  createAmenity,
  getAmenity,
  listAmenities,
  updateAmenity,
  deactivateAmenity,
  
  // Availability
  getAvailability,
  isSlotAvailable,
  
  // Reservations
  createReservation,
  getReservation,
  listReservations,
  getUserReservations,
  getUnitReservations,
  confirmReservation,
  cancelReservation,
  completeReservation,
  markNoShow,
  
  // Statistics
  getAmenityStatistics,
  getBuildingReservationStats,
  
  // Helpers
  calculatePrice,
};
