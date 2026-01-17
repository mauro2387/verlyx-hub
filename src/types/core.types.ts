/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - ENTERPRISE TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SISTEMA DE TIPOS CORE - FUNDACIÓN ARQUITECTURAL
 * 
 * Este archivo define la estructura de datos canónica para todo el sistema.
 * Cualquier modificación requiere análisis de impacto en:
 * - Persistencia (localStorage/IndexedDB/API)
 * - Componentes de UI
 * - Motor de automatizaciones
 * - Sistema de auditoría
 * 
 * CONVENCIONES:
 * - Todos los IDs son strings UUID v4
 * - Todas las fechas son ISO 8601 strings
 * - Estados usan enums tipados
 * - Campos de auditoría son obligatorios
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: ENTIDADES BASE Y AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Metadata de auditoría presente en TODAS las entidades del sistema.
 * Responde a: quién, cuándo, qué, desde dónde.
 */
export interface AuditMetadata {
  createdAt: string;           // ISO 8601
  createdBy: string;           // User ID
  createdByName: string;       // Nombre para display
  createdFrom: AuditSource;    // Origen de la operación
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
  updatedFrom: AuditSource;
  version: number;             // Optimistic locking
}

export type AuditSource = 
  | 'web_admin'
  | 'web_owner'
  | 'web_reception'
  | 'web_staff'
  | 'mobile_app'
  | 'api_integration'
  | 'automation_engine'
  | 'system_scheduled'
  | 'bulk_import';

/**
 * Registro de cambio individual para historial de auditoría.
 */
export interface AuditLogEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  source: AuditSource;
  ipAddress?: string;
  userAgent?: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  changedFields: string[];
  metadata?: Record<string, unknown>;
}

export type EntityType = 
  | 'building'
  | 'unit'
  | 'user'
  | 'resident'
  | 'access_authorization'
  | 'reservation'
  | 'payment'
  | 'expense_statement'
  | 'maintenance_request'
  | 'task'
  | 'notification'
  | 'automation_rule'
  | 'staff_member'
  | 'visitor_log'
  | 'document'
  | 'announcement'
  | 'survey'
  | 'experience';

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'soft_delete'
  | 'restore'
  | 'status_change'
  | 'assignment_change'
  | 'approval'
  | 'rejection'
  | 'expiration'
  | 'revocation'
  | 'login'
  | 'logout'
  | 'password_change'
  | 'bulk_operation'
  | 'export'
  | 'import';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: GESTIÓN DE EDIFICIOS (MULTI-BUILDING)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Building {
  id: string;
  code: string;                    // Código único corto (ej: "AQR-001")
  name: string;
  legalName: string;               // Razón social para documentos
  address: Address;
  contactInfo: ContactInfo;
  settings: BuildingSettings;
  financialConfig: FinancialConfig;
  status: BuildingStatus;
  audit: AuditMetadata;
}

export interface Address {
  street: string;
  number: string;
  floor?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ContactInfo {
  primaryPhone: string;
  secondaryPhone?: string;
  email: string;
  emergencyPhone: string;
  adminEmail: string;
}

export interface BuildingSettings {
  timezone: string;                // IANA timezone
  locale: string;                  // es-UY, es-AR, etc.
  dateFormat: string;
  timeFormat: '12h' | '24h';
  reservationAdvanceDays: number;  // Días máximos para reservar
  guestPolicyDefault: GuestPolicy;
  maintenanceAutoAssign: boolean;
  requireAccessApproval: boolean;
  accessDefaultDuration: number;   // Horas por defecto para accesos
}

export interface FinancialConfig {
  currency: string;                // ISO 4217 (UYU, USD, ARS)
  expenseDay: number;              // Día del mes para generar expensas
  paymentDueDay: number;           // Día de vencimiento
  lateFeePercentage: number;       // Recargo por mora (%)
  lateFeeGraceDays: number;        // Días de gracia
  accountTypes: ExpenseAccountType[];
}

export type ExpenseAccountType = {
  id: string;
  name: string;
  code: string;
  description: string;
  isDefault: boolean;
};

export type BuildingStatus = 'active' | 'inactive' | 'suspended' | 'pending_setup';

export type GuestPolicy = 'liberal' | 'moderate' | 'strict';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: UNIDADES / APARTAMENTOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface Unit {
  id: string;
  buildingId: string;
  identifier: string;              // "1205", "PH-A", etc.
  floor: number;
  type: UnitType;
  area: number;                    // m²
  rooms: number;
  bathrooms: number;
  parkingSpots: ParkingSpot[];
  storageUnits: StorageUnit[];
  status: UnitStatus;
  ownershipType: OwnershipType;
  currentResidents: ResidentAssignment[];
  expenseCoefficient: number;      // Coeficiente para cálculo de expensas
  audit: AuditMetadata;
}

export type UnitType = 
  | 'apartment'
  | 'penthouse'
  | 'duplex'
  | 'studio'
  | 'commercial'
  | 'office';

export type UnitStatus = 
  | 'occupied'
  | 'vacant'
  | 'under_renovation'
  | 'for_sale'
  | 'for_rent';

export type OwnershipType = 'owner' | 'renter' | 'corporate';

export interface ParkingSpot {
  id: string;
  identifier: string;              // "P-45"
  type: 'covered' | 'uncovered' | 'motorcycle' | 'bicycle';
  level?: string;
}

export interface StorageUnit {
  id: string;
  identifier: string;
  area: number;
  level?: string;
}

export interface ResidentAssignment {
  residentId: string;
  relationship: 'owner' | 'primary_tenant' | 'family_member' | 'authorized_occupant';
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: USUARIOS Y ROLES
// ═══════════════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  buildingIds: string[];           // Multi-building support
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  role: UserRole;
  permissions: Permission[];       // Permisos granulares adicionales
  status: UserStatus;
  profileImage?: string;
  preferences: UserPreferences;
  lastLogin?: string;
  lastActivity?: string;
  passwordChangedAt?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  audit: AuditMetadata;
}

export type DocumentType = 'CI' | 'DNI' | 'passport' | 'RUT' | 'other';

export type UserRole = 
  | 'super_admin'                  // Acceso total multi-edificio
  | 'building_admin'               // Admin de un edificio específico
  | 'assistant_admin'              // Admin con permisos reducidos
  | 'owner'                        // Propietario
  | 'tenant'                       // Inquilino
  | 'staff_supervisor'             // Supervisor de personal
  | 'staff_maintenance'            // Personal de mantenimiento
  | 'staff_cleaning'               // Personal de limpieza
  | 'staff_security'               // Personal de seguridad
  | 'reception'                    // Recepcionista
  | 'accountant'                   // Contador (solo finanzas)
  | 'auditor';                     // Auditor (solo lectura)

export type Permission = 
  | 'buildings.read' | 'buildings.write' | 'buildings.delete'
  | 'units.read' | 'units.write' | 'units.delete'
  | 'users.read' | 'users.write' | 'users.delete' | 'users.change_password'
  | 'access.read' | 'access.write' | 'access.approve' | 'access.revoke'
  | 'reservations.read' | 'reservations.write' | 'reservations.approve' | 'reservations.cancel'
  | 'payments.read' | 'payments.write' | 'payments.void'
  | 'expenses.read' | 'expenses.write' | 'expenses.close_period'
  | 'maintenance.read' | 'maintenance.write' | 'maintenance.assign' | 'maintenance.close'
  | 'staff.read' | 'staff.write' | 'staff.schedule'
  | 'reports.view' | 'reports.export'
  | 'automations.read' | 'automations.write' | 'automations.execute'
  | 'audit.read' | 'audit.export'
  | 'settings.read' | 'settings.write';

export type UserStatus = 
  | 'pending_approval'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'locked';

export interface UserPreferences {
  language: string;
  notificationEmail: boolean;
  notificationPush: boolean;
  notificationSms: boolean;
  theme: 'light' | 'dark' | 'system';
  dashboardLayout?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: AUTORIZACIONES DE ACCESO (CRITICAL SUBSYSTEM)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FLUJO DE ESTADOS DE ACCESO:
 * 
 * pending_approval → approved → active → [expired | revoked | suspended]
 *                 ↘ rejected
 * 
 * suspended → active (reactivación)
 * revoked → (terminal, no se puede reactivar)
 * expired → (terminal, requiere nueva autorización)
 */
export interface AccessAuthorization {
  id: string;
  buildingId: string;
  unitId: string;
  requestedBy: string;             // User ID del solicitante
  requestedByName: string;
  
  // Datos del visitante
  visitor: VisitorInfo;
  
  // Configuración de acceso
  type: AccessType;
  validFrom: string;               // ISO 8601
  validUntil: string;              // ISO 8601
  accessSchedule?: AccessSchedule; // Restricciones horarias opcionales
  
  // Estado y workflow
  status: AccessStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  revokedBy?: string;
  revokedByName?: string;
  revokedAt?: string;
  revocationReason?: string;
  suspendedBy?: string;
  suspendedByName?: string;
  suspendedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  
  // Uso y tracking
  usageCount: number;
  maxUsages?: number;              // null = ilimitado
  lastUsedAt?: string;
  usageLog: AccessUsageEntry[];
  
  // Datos adicionales
  vehicleInfo?: VehicleInfo;
  observations?: string;
  internalNotes?: string;          // Solo visible para admin/recepción
  attachments: Attachment[];
  
  // QR/Código de acceso
  accessCode?: string;
  qrCodeUrl?: string;
  
  audit: AuditMetadata;
}

export interface VisitorInfo {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone?: string;
  email?: string;
  company?: string;
  relationship: VisitorRelationship;
  photo?: string;
}

export type VisitorRelationship = 
  | 'family'
  | 'friend'
  | 'service_provider'
  | 'delivery'
  | 'contractor'
  | 'real_estate_agent'
  | 'medical'
  | 'government'
  | 'other';

export type AccessType = 
  | 'single_visit'                 // Una sola visita
  | 'multiple_visits'              // Múltiples visitas con fecha fin
  | 'recurring_weekly'             // Visitas recurrentes (ej: empleada doméstica)
  | 'recurring_monthly'
  | 'permanent'                    // Sin fecha de vencimiento
  | 'emergency';                   // Acceso de emergencia (médicos, etc.)

export type AccessStatus = 
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'revoked'
  | 'suspended';

export interface AccessSchedule {
  allowedDays: DayOfWeek[];
  startTime: string;               // HH:MM
  endTime: string;                 // HH:MM
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface AccessUsageEntry {
  timestamp: string;
  action: 'entry' | 'exit';
  registeredBy: string;
  registeredByName: string;
  notes?: string;
}

export interface VehicleInfo {
  licensePlate: string;
  brand?: string;
  model?: string;
  color?: string;
  type: 'car' | 'motorcycle' | 'truck' | 'bicycle' | 'other';
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: GESTIÓN FINANCIERA
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExpenseStatement {
  id: string;
  buildingId: string;
  unitId: string;
  period: string;                  // "2026-01"
  issueDate: string;
  dueDate: string;
  
  // Conceptos
  items: ExpenseItem[];
  credits: ExpenseCredit[];
  
  // Totales
  subtotal: number;
  creditsTotal: number;
  previousBalance: number;
  lateFee: number;
  total: number;
  
  // Estado
  status: ExpenseStatementStatus;
  paidAmount: number;
  remainingAmount: number;
  
  // Pagos asociados
  payments: PaymentReference[];
  
  audit: AuditMetadata;
}

export interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  isFixed: boolean;               // Gasto fijo vs. proporcional
}

export interface ExpenseCredit {
  id: string;
  description: string;
  amount: number;                 // Siempre negativo
  reason: string;
}

export type ExpenseStatementStatus = 
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'in_dispute'
  | 'cancelled';

export interface Payment {
  id: string;
  buildingId: string;
  unitId: string;
  expenseStatementId?: string;
  
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference: string;              // Número de recibo/transferencia
  
  paymentDate: string;
  processedDate: string;
  
  status: PaymentStatus;
  voidedBy?: string;
  voidedAt?: string;
  voidReason?: string;
  
  notes?: string;
  attachments: Attachment[];
  
  audit: AuditMetadata;
}

export type PaymentMethod = 
  | 'cash'
  | 'bank_transfer'
  | 'credit_card'
  | 'debit_card'
  | 'check'
  | 'digital_wallet'
  | 'auto_debit';

export type PaymentStatus = 
  | 'pending'
  | 'processed'
  | 'confirmed'
  | 'rejected'
  | 'voided';

export interface PaymentReference {
  paymentId: string;
  amount: number;
  date: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: RESERVAS Y AMENIDADES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Amenity {
  id: string;
  buildingId: string;
  name: string;
  description: string;
  type: AmenityType;
  capacity: number;
  location: string;
  
  // Configuración
  schedule: AmenitySchedule;
  pricing: AmenityPricing;
  rules: string[];
  requiresApproval: boolean;
  advanceBookingDays: number;
  maxDurationHours: number;
  
  // Estado
  status: AmenityStatus;
  maintenanceSchedule?: MaintenanceWindow[];
  
  images: string[];
  
  audit: AuditMetadata;
}

export type AmenityType = 
  | 'pool'
  | 'gym'
  | 'bbq'
  | 'event_room'
  | 'tennis_court'
  | 'paddle_court'
  | 'spa'
  | 'sauna'
  | 'rooftop'
  | 'coworking'
  | 'cinema'
  | 'kids_room'
  | 'other';

export interface AmenitySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  slots?: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
  maxCapacity?: number;
}

export interface AmenityPricing {
  isFree: boolean;
  pricePerHour?: number;
  pricePerSlot?: number;
  depositRequired?: number;
  currency: string;
}

export type AmenityStatus = 'active' | 'inactive' | 'maintenance' | 'closed_season';

export interface MaintenanceWindow {
  startDate: string;
  endDate: string;
  reason: string;
}

export interface Reservation {
  id: string;
  buildingId: string;
  amenityId: string;
  unitId: string;
  userId: string;
  userName: string;
  
  date: string;
  startTime: string;
  endTime: string;
  
  guestCount: number;
  guests?: GuestInfo[];
  
  status: ReservationStatus;
  approvedBy?: string;
  approvedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  
  pricing: {
    amount: number;
    deposit: number;
    currency: string;
    isPaid: boolean;
    paymentId?: string;
  };
  
  notes?: string;
  specialRequests?: string;
  
  // Check-in/out
  checkedInAt?: string;
  checkedInBy?: string;
  checkedOutAt?: string;
  checkedOutBy?: string;
  
  audit: AuditMetadata;
}

export type ReservationStatus = 
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface GuestInfo {
  name: string;
  relationship?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: MANTENIMIENTO Y TAREAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MaintenanceRequest {
  id: string;
  buildingId: string;
  unitId?: string;                 // null = área común
  requestedBy: string;
  requestedByName: string;
  
  title: string;
  description: string;
  category: MaintenanceCategory;
  subcategory?: string;
  location: string;
  
  priority: Priority;
  status: MaintenanceStatus;
  
  // Asignación
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  assignedBy?: string;
  
  // Tiempos
  estimatedDuration?: number;      // Minutos
  scheduledDate?: string;
  scheduledTime?: string;
  startedAt?: string;
  completedAt?: string;
  
  // Resolución
  resolution?: string;
  resolutionNotes?: string;
  
  // Rating
  rating?: number;
  ratingFeedback?: string;
  ratedAt?: string;
  
  // Materiales y costos
  materials?: MaintenanceMaterial[];
  laborHours?: number;
  totalCost?: number;
  
  attachments: Attachment[];
  
  // Clasificación IA
  aiClassification?: {
    category: string;
    confidence: number;
    suggestedPriority: Priority;
    estimatedTime: string;
  };
  
  audit: AuditMetadata;
}

export type MaintenanceCategory = 
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'carpentry'
  | 'painting'
  | 'appliances'
  | 'security'
  | 'cleaning'
  | 'landscaping'
  | 'structural'
  | 'common_areas'
  | 'elevator'
  | 'other';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type MaintenanceStatus = 
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'pending_parts'
  | 'pending_approval'
  | 'completed'
  | 'verified'
  | 'cancelled';

export interface MaintenanceMaterial {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Task {
  id: string;
  buildingId: string;
  
  title: string;
  description: string;
  type: TaskType;
  
  // Relaciones
  maintenanceRequestId?: string;
  reservationId?: string;
  
  // Asignación
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  
  priority: Priority;
  status: TaskStatus;
  
  // Fechas
  dueDate: string;
  dueTime?: string;
  startedAt?: string;
  completedAt?: string;
  
  // Ubicación
  location?: string;
  unitId?: string;
  
  // Completitud
  completionNotes?: string;
  attachments: Attachment[];
  
  audit: AuditMetadata;
}

export type TaskType = 
  | 'maintenance'
  | 'inspection'
  | 'cleaning'
  | 'delivery'
  | 'reservation_prep'
  | 'follow_up'
  | 'administrative'
  | 'other';

export type TaskStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'overdue';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: PERSONAL / STAFF
// ═══════════════════════════════════════════════════════════════════════════════

export interface StaffMember {
  id: string;
  userId: string;                  // Referencia al User
  buildingIds: string[];
  
  employeeCode: string;
  department: StaffDepartment;
  position: string;
  
  // Horario
  schedule: StaffSchedule;
  currentShift?: Shift;
  
  // Estado
  status: StaffStatus;
  availability: StaffAvailability;
  
  // Métricas
  tasksCompleted: number;
  averageRating: number;
  efficiency: number;              // Porcentaje
  
  // Skills
  skills: string[];
  certifications: Certification[];
  
  // Contacto de emergencia
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  
  audit: AuditMetadata;
}

export type StaffDepartment = 
  | 'maintenance'
  | 'cleaning'
  | 'security'
  | 'reception'
  | 'administration'
  | 'landscaping';

export interface StaffSchedule {
  regularShifts: RegularShift[];
  exceptions: ScheduleException[];
}

export interface RegularShift {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface ScheduleException {
  date: string;
  type: 'day_off' | 'vacation' | 'sick_leave' | 'special_shift';
  shift?: {
    startTime: string;
    endTime: string;
  };
}

export interface Shift {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed';
}

export type StaffStatus = 'active' | 'on_leave' | 'terminated';

export type StaffAvailability = 'available' | 'busy' | 'on_break' | 'offline';

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  documentUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Notification {
  id: string;
  buildingId: string;
  
  // Destinatarios
  targetType: NotificationTargetType;
  targetIds: string[];             // User IDs o 'all'
  
  // Contenido
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  
  // Canales
  channels: NotificationChannel[];
  
  // Estado por destinatario
  deliveryStatus: DeliveryStatus[];
  
  // Scheduling
  scheduledFor?: string;
  sentAt?: string;
  expiresAt?: string;
  
  // Acción
  actionUrl?: string;
  actionLabel?: string;
  
  audit: AuditMetadata;
}

export type NotificationTargetType = 
  | 'all_building'
  | 'all_owners'
  | 'all_tenants'
  | 'specific_users'
  | 'specific_units'
  | 'staff';

export type NotificationType = 
  | 'payment_reminder'
  | 'payment_received'
  | 'payment_overdue'
  | 'access_approved'
  | 'access_expiring'
  | 'access_expired'
  | 'reservation_confirmed'
  | 'reservation_reminder'
  | 'maintenance_update'
  | 'maintenance_completed'
  | 'announcement'
  | 'emergency'
  | 'survey'
  | 'document_available'
  | 'task_assigned'
  | 'task_reminder';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'whatsapp';

export interface DeliveryStatus {
  userId: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: VISITANTES (REGISTRO EN TIEMPO REAL)
// ═══════════════════════════════════════════════════════════════════════════════

export interface VisitorLog {
  id: string;
  buildingId: string;
  
  // Visitante
  visitorName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone?: string;
  company?: string;
  
  // Destino
  unitId: string;
  unitIdentifier: string;
  residentName: string;
  
  // Visita
  purpose: VisitPurpose;
  purposeDetails?: string;
  
  // Tiempos
  entryTime: string;
  expectedExitTime?: string;
  actualExitTime?: string;
  
  // Estado
  status: VisitorLogStatus;
  
  // Acceso relacionado
  accessAuthorizationId?: string;
  
  // Vehículo
  vehicleInfo?: VehicleInfo;
  parkingAssigned?: string;
  
  // Personal
  registeredBy: string;
  registeredByName: string;
  exitRegisteredBy?: string;
  exitRegisteredByName?: string;
  
  // Notas
  notes?: string;
  
  audit: AuditMetadata;
}

export type VisitPurpose = 
  | 'personal'
  | 'delivery'
  | 'service'
  | 'contractor'
  | 'real_estate'
  | 'medical'
  | 'government'
  | 'event'
  | 'other';

export type VisitorLogStatus = 
  | 'inside'
  | 'exited'
  | 'denied_entry';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: DOCUMENTOS Y COMUNICACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Announcement {
  id: string;
  buildingId: string;
  
  type: AnnouncementType;
  title: string;
  content: string;
  summary?: string;
  
  // Visibilidad
  visibility: AnnouncementVisibility;
  targetUnits?: string[];
  
  // Publicación
  status: AnnouncementStatus;
  publishedAt?: string;
  expiresAt?: string;
  isPinned: boolean;
  
  // Interacción
  requiresAcknowledgment: boolean;
  acknowledgments: Acknowledgment[];
  
  attachments: Attachment[];
  
  audit: AuditMetadata;
}

export type AnnouncementType = 
  | 'general'
  | 'maintenance'
  | 'security'
  | 'event'
  | 'emergency'
  | 'financial'
  | 'rules_update';

export type AnnouncementVisibility = 'all' | 'owners_only' | 'specific_units';

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface Acknowledgment {
  userId: string;
  userName: string;
  acknowledgedAt: string;
}

export interface Survey {
  id: string;
  buildingId: string;
  
  title: string;
  description: string;
  
  questions: SurveyQuestion[];
  
  // Configuración
  isAnonymous: boolean;
  allowMultipleResponses: boolean;
  
  // Fechas
  startDate: string;
  endDate: string;
  
  // Estado
  status: SurveyStatus;
  
  // Resultados
  responseCount: number;
  responses: SurveyResponse[];
  
  audit: AuditMetadata;
}

export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';

export interface SurveyQuestion {
  id: string;
  type: 'text' | 'single_choice' | 'multiple_choice' | 'rating' | 'scale';
  question: string;
  options?: string[];
  isRequired: boolean;
  order: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId?: string;                 // null si anónimo
  unitId?: string;
  answers: SurveyAnswer[];
  submittedAt: string;
}

export interface SurveyAnswer {
  questionId: string;
  value: string | string[] | number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: UTILIDADES Y HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resultado paginado estándar para todas las listas
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filtros base para queries
 */
export interface BaseFilters {
  search?: string;
  status?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  buildingId?: string;
  unitId?: string;
}

/**
 * Resultado de operación estándar
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Estado de carga para UI
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}
