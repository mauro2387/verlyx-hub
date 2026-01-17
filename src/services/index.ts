/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - SERVICE BARREL EXPORTS + API CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Exports centralizados de todos los servicios enterprise.
 * Incluye contrato de API para cuando se implemente el backend.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DATA ACCESS LAYER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // UUID
  generateUUID,
  isValidUUID,
  
  // Dates
  nowISO,
  nowUTC,
  parseDate,
  compareDates,
  isDateInRange,
  addHours,
  addDays,
  
  // Diff
  deepDiff,
  type DiffEntry,
  
  // Repository
  createRepository,
  type IRepository,
  type QueryOptions,
  type EntityType,
} from './repository/DataAccessLayer';

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Safe interpolation
  interpolateText,
  
  // Safe calculations
  evaluateExpression,
  executeCalculation,
  parseCalculationExpression,
  type CalculationExpression,
  type CalculationResult,
  
  // Formatting
  formatCurrency,
  formatDate as formatTemplateDate,
} from './templates/TemplateEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS MACHINE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Validation
  isValidTransition,
  getValidNextStates,
  isTerminalState,
  
  // Metadata
  getStatusMeta,
  getStatusColor,
  
  // Types
  type AccessAuthorizationStatus,
  type ReservationStatus,
  type TaskStatus,
  type SuggestionStatus,
  type CVStatus,
  type PaymentStatus,
  type AutomationRuleStatus,
  type EntityStatusMap,
  type StatusForEntity,
  type StatusMetadata,
  
  // Metadata maps
  ACCESS_AUTH_STATUS_META,
  RESERVATION_STATUS_META,
  TASK_STATUS_META,
} from './status/TypedStatusMachine';

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Core
  audit,
  auditCreate,
  auditUpdate,
  auditDelete,
  auditStatusChange,
  
  // Query
  queryAudit,
  getEntityHistory,
  getUserActivity,
  
  // Utilities
  sanitizeForAudit,
  calculateSeverity,
  
  // Types
  type AuditRecord,
  type AuditAction,
  type AuditSeverity,
  type AuditActor,
  type AuditContext,
  type AuditParams,
  type AuditQuery,
} from './audit/DeepAuditService';

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESS SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // CRUD
  createAccessAuthorization,
  getAccessAuthorization,
  getAccessAuthorizationByCode,
  queryAccessAuthorizations,
  updateAccessAuthorization,
  
  // Status transitions
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
  
  // Types
  type AccessAuthorization,
  type AuthorizedPerson,
  type VehicleInfo,
  type AccessType,
  type AccessScope,
  type StatusHistoryEntry,
  type VisitRegistration,
  type CreateAccessAuthorizationInput,
  type UpdateAccessAuthorizationInput,
  type AccessAuthorizationQuery,
} from './access/RefactoredAccessService';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTOMATION ENGINE (REFACTORED)
// ═══════════════════════════════════════════════════════════════════════════════

// Idempotent Engine utilities
export {
  // Idempotency
  generateIdempotencyKey,
  generateEventKey,
  getExistingExecution,
  createIdempotentExecution,
  updateExecution,
  completeExecution,
  scheduleRetry,
  
  // Locking
  acquireLock,
  releaseLock,
  extendLock,
  
  // Rate limiting
  checkRateLimit,
  
  // Event deduplication
  isEventDuplicate,
  markEventProcessed,
  
  // Action execution
  executeActionWithRateLimit,
  
  // Types
  type IdempotentExecution,
  type ProcessedEvent,
  type ExecutionLock,
  type RateLimitEntry,
  type ActionResult,
} from './automation/IdempotentEngine';

// Refactored Automation Service
export {
  // Rule management
  getAllRules,
  getRulesByBuilding,
  getRule,
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
  
  // Execution
  executeRule,
  processEvent,
  processScheduledRules,
  
  // History
  getExecutionHistory,
  getRuleStats,
} from './automation/RefactoredAutomationService';

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDING SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
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
  addAccountType,
  removeAccountType,
  
  // Statistics
  getBuildingStatistics,
  
  // Types
  type Building,
  type BuildingAddress,
  type BuildingContact,
  type BuildingConfiguration,
  type AccountConfiguration,
  type BuildingStatus,
  type Currency,
  type AccountType as BuildingAccountType,
  type CreateBuildingInput,
  type UpdateBuildingInput,
} from './building/BuildingService';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
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
  
  // Types
  type Unit,
  type UnitOwner,
  type UnitTenant,
  type UnitType,
  type UnitStatus,
  type OccupancyStatus,
  type CreateUnitInput,
  type UpdateUnitInput,
  type UnitFilters,
} from './unit/UnitService';

// ═══════════════════════════════════════════════════════════════════════════════
// USER SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
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
  
  // Types
  type User,
  type UserRole,
  type UserStatus as AppUserStatus,
  type UserPermissions,
  type UserProfile,
  type UserSettings,
  type UnitAssociation,
  type LoginHistory,
  type CreateUserInput,
  type UpdateUserInput,
  type UserFilters,
} from './user/UserService';

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Transactions
  createCharge,
  createAdjustment,
  listTransactions,
  
  // Payments
  recordPayment,
  confirmPayment,
  rejectPayment,
  listPayments,
  getPayment,
  getPaymentByReceipt,
  
  // Statements
  generateAccountStatement,
  getAccountHistory,
  
  // Debt
  calculateDebtSummary,
  listBuildingDebts,
  listOverdueUnits,
  
  // Bulk
  generateBulkCharges,
  
  // Stats
  getBuildingFinancialStats,
  
  // Types
  type Transaction,
  type Payment,
  type AccountStatement,
  type DebtSummary,
  type TransactionType,
  type PaymentMethod,
  type PaymentStatus as FinancialPaymentStatus,
  type AccountType as FinancialAccountType,
  type DebtStatus,
  type CreateChargeInput,
  type RecordPaymentInput,
  type TransactionFilters,
  type PaymentFilters,
} from './financial/FinancialService';

// ═══════════════════════════════════════════════════════════════════════════════
// RESERVATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
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
  
  // Types
  type Amenity,
  type AmenityType,
  type AmenityStatus,
  type Reservation,
  type ReservationStatus as BookingStatus,
  type TimeSlot,
  type PricingConfig,
  type BookingRules,
  type AvailabilitySlot,
  type CreateAmenityInput,
  type CreateReservationInput,
  type ReservationFilters as BookingFilters,
} from './reservation/ReservationService';

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
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
  
  // Types
  type Announcement,
  type AnnouncementType,
  type AnnouncementStatus,
  type AnnouncementPriority,
  type Activity,
  type EventStatus,
  type CreateAnnouncementInput,
  type CreateActivityInput,
  type AnnouncementFilters,
  type ActivityFilters,
} from './announcement/AnnouncementService';

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export {
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
  
  // Types
  type MaintenanceRequest,
  type ServiceProvider,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceStatus,
  type MaintenanceType,
  type CreateMaintenanceRequestInput,
  type UpdateMaintenanceRequestInput,
  type MaintenanceFilters,
} from './maintenance/MaintenanceService';

// ═══════════════════════════════════════════════════════════════════════════════
// API CONTRACT (Para implementación futura del backend)
// ═══════════════════════════════════════════════════════════════════════════════

// Import types for API contract definition
import type {
  AccessAuthorization as AA,
  CreateAccessAuthorizationInput as CreateInput,
  UpdateAccessAuthorizationInput as UpdateInput,
  AccessAuthorizationQuery as AAQuery,
  VisitRegistration as Visit,
} from './access/RefactoredAccessService';

import type {
  AuditQuery as AQ,
  AuditRecord as AR,
} from './audit/DeepAuditService';

/**
 * Contrato de API REST que debe implementar el backend.
 * El frontend usa el Repository Pattern para abstraer esto.
 */
export interface APIEndpoints {
  // Access Authorizations
  'POST /api/v1/access-authorizations': {
    body: CreateInput;
    response: AA;
  };
  'GET /api/v1/access-authorizations/:id': {
    params: { id: string };
    response: AA;
  };
  'GET /api/v1/access-authorizations': {
    query: AAQuery;
    response: { items: AA[]; total: number };
  };
  'PATCH /api/v1/access-authorizations/:id': {
    params: { id: string };
    body: UpdateInput;
    response: AA;
  };
  'POST /api/v1/access-authorizations/:id/submit': {
    params: { id: string };
    response: AA;
  };
  'POST /api/v1/access-authorizations/:id/approve': {
    params: { id: string };
    body?: { notes?: string };
    response: AA;
  };
  'POST /api/v1/access-authorizations/:id/reject': {
    params: { id: string };
    body: { reason: string };
    response: AA;
  };
  
  // Audit
  'GET /api/v1/audit': {
    query: AQ;
    response: { records: AR[]; total: number };
  };
  'GET /api/v1/audit/entity/:type/:id': {
    params: { type: string; id: string };
    response: AR[];
  };
  
  // Visits
  'POST /api/v1/visits/check-in': {
    body: { authorizationId: string; notes?: string };
    response: { visit: Visit; authorization: AA };
  };
  'POST /api/v1/visits/:id/check-out': {
    params: { id: string };
    body?: { notes?: string };
    response: Visit;
  };
}

/**
 * Headers requeridos en todas las requests.
 */
export interface RequiredHeaders {
  'Authorization': string;          // Bearer token
  'X-Building-ID': string;          // ID del edificio actual
  'X-Request-ID'?: string;          // Para trazabilidad
  'X-Idempotency-Key'?: string;     // Para operaciones POST/PUT
}

/**
 * Formato estándar de respuesta de error.
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, string[]>; // Errores de validación por campo
  requestId?: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS OF TYPES FROM ORIGINAL FILES (si existen)
// ═══════════════════════════════════════════════════════════════════════════════

// Estos imports pueden fallar si los archivos originales no existen
// En ese caso, comentar las líneas

// export type { AutomationRule, AutomationAction, AutomationExecution } from '../types/automation.types';
// export type { User, Unit, Building, Amenity } from '../types/core.types';
