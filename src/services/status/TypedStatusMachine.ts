/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - TYPED STATUS MACHINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Estados tipados por entidad con validación de transiciones.
 * NO MÁS `status: string` genérico.
 */

import type { EntityType } from '../repository/DataAccessLayer';

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS TYPES POR ENTIDAD
// ═══════════════════════════════════════════════════════════════════════════════

/** Estados de AccessAuthorization */
export type AccessAuthorizationStatus = 
  | 'draft'              // Borrador
  | 'pending_approval'   // Pendiente de aprobación
  | 'approved'           // Aprobado
  | 'rejected'           // Rechazado
  | 'active'             // Activo (en uso)
  | 'expired'            // Expirado por tiempo
  | 'revoked'            // Revocado manualmente
  | 'cancelled';         // Cancelado

/** Estados de Reservation */
export type ReservationStatus = 
  | 'pending'            // Pendiente de confirmación
  | 'confirmed'          // Confirmada
  | 'checked_in'         // En progreso (huésped llegó)
  | 'checked_out'        // Finalizada
  | 'cancelled'          // Cancelada por propietario
  | 'no_show'            // No se presentó
  | 'rejected';          // Rechazada por admin

/** Estados de Task */
export type TaskStatus = 
  | 'pending'            // Pendiente de asignación
  | 'assigned'           // Asignada
  | 'in_progress'        // En progreso
  | 'paused'             // Pausada
  | 'completed'          // Completada
  | 'verified'           // Verificada por supervisor
  | 'cancelled';         // Cancelada

/** Estados de Suggestion/Complaint */
export type SuggestionStatus = 
  | 'new'                // Nueva
  | 'under_review'       // En revisión
  | 'in_progress'        // En proceso de resolución
  | 'resolved'           // Resuelta
  | 'closed'             // Cerrada
  | 'rejected';          // Rechazada

/** Estados de CV/Application */
export type CVStatus = 
  | 'received'           // Recibido
  | 'under_review'       // En revisión
  | 'shortlisted'        // Preseleccionado
  | 'interview'          // En entrevista
  | 'hired'              // Contratado
  | 'rejected';          // Rechazado

/** Estados de Payment */
export type PaymentStatus = 
  | 'pending'            // Pendiente
  | 'processing'         // Procesando
  | 'completed'          // Completado
  | 'failed'             // Fallido
  | 'refunded'           // Reembolsado
  | 'cancelled';         // Cancelado

/** Estados de Automation Rule */
export type AutomationRuleStatus = 
  | 'draft'              // Borrador
  | 'active'             // Activa
  | 'paused'             // Pausada
  | 'disabled';          // Deshabilitada

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE MAP: EntityType -> StatusType
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityStatusMap {
  access_authorization: AccessAuthorizationStatus;
  reservation: ReservationStatus;
  task: TaskStatus;
  suggestion: SuggestionStatus;
  cv_application: CVStatus;
  payment: PaymentStatus;
  automation_rule: AutomationRuleStatus;
  
  // Entidades sin estados (usar never)
  user: never;
  unit: never;
  building: never;
  amenity: never;
}

export type StatusForEntity<E extends keyof EntityStatusMap> = EntityStatusMap[E];

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSICIONES VÁLIDAS
// ═══════════════════════════════════════════════════════════════════════════════

type TransitionMap<S extends string> = {
  [K in S]?: S[];
};

const ACCESS_AUTH_TRANSITIONS: TransitionMap<AccessAuthorizationStatus> = {
  draft: ['pending_approval', 'cancelled'],
  pending_approval: ['approved', 'rejected'],
  approved: ['active', 'cancelled'],
  active: ['expired', 'revoked'],
  rejected: ['draft'], // Puede volver a borrador para editar
  // expired, revoked, cancelled son finales
};

const RESERVATION_TRANSITIONS: TransitionMap<ReservationStatus> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out'],
  // checked_out, cancelled, no_show, rejected son finales
};

const TASK_TRANSITIONS: TransitionMap<TaskStatus> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['paused', 'completed', 'cancelled'],
  paused: ['in_progress', 'cancelled'],
  completed: ['verified'],
  // verified, cancelled son finales
};

const SUGGESTION_TRANSITIONS: TransitionMap<SuggestionStatus> = {
  new: ['under_review', 'rejected'],
  under_review: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  // closed, rejected son finales
};

const CV_TRANSITIONS: TransitionMap<CVStatus> = {
  received: ['under_review', 'rejected'],
  under_review: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected'],
  interview: ['hired', 'rejected'],
  // hired, rejected son finales
};

const PAYMENT_TRANSITIONS: TransitionMap<PaymentStatus> = {
  pending: ['processing', 'cancelled'],
  processing: ['completed', 'failed'],
  completed: ['refunded'],
  failed: ['pending'], // Retry
  // refunded, cancelled son finales
};

const AUTOMATION_TRANSITIONS: TransitionMap<AutomationRuleStatus> = {
  draft: ['active'],
  active: ['paused', 'disabled'],
  paused: ['active', 'disabled'],
  disabled: ['draft'], // Puede volver a borrador para editar
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

type EntityTypeWithStatus = keyof {
  [K in keyof EntityStatusMap as EntityStatusMap[K] extends never ? never : K]: EntityStatusMap[K];
};

const TRANSITION_MAPS: Record<EntityTypeWithStatus, TransitionMap<string>> = {
  access_authorization: ACCESS_AUTH_TRANSITIONS,
  reservation: RESERVATION_TRANSITIONS,
  task: TASK_TRANSITIONS,
  suggestion: SUGGESTION_TRANSITIONS,
  cv_application: CV_TRANSITIONS,
  payment: PAYMENT_TRANSITIONS,
  automation_rule: AUTOMATION_TRANSITIONS,
};

export interface TransitionValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Valida si una transición de estado es válida.
 */
export function isValidTransition<E extends EntityTypeWithStatus>(
  entityType: E,
  fromStatus: EntityStatusMap[E],
  toStatus: EntityStatusMap[E]
): TransitionValidation {
  const transitions = TRANSITION_MAPS[entityType];
  
  if (!transitions) {
    return { valid: false, reason: `Unknown entity type: ${entityType}` };
  }
  
  const allowedNext = transitions[fromStatus as string];
  
  if (!allowedNext) {
    return { 
      valid: false, 
      reason: `State '${fromStatus}' is terminal and cannot transition` 
    };
  }
  
  if (!allowedNext.includes(toStatus as string)) {
    return { 
      valid: false, 
      reason: `Invalid transition: ${fromStatus} -> ${toStatus}. Allowed: ${allowedNext.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/**
 * Obtiene los estados siguientes válidos desde un estado dado.
 */
export function getValidNextStates<E extends EntityTypeWithStatus>(
  entityType: E,
  currentStatus: EntityStatusMap[E]
): EntityStatusMap[E][] {
  const transitions = TRANSITION_MAPS[entityType];
  
  if (!transitions) {
    return [];
  }
  
  return (transitions[currentStatus as string] || []) as EntityStatusMap[E][];
}

/**
 * Verifica si un estado es terminal (sin transiciones posibles).
 */
export function isTerminalState<E extends EntityTypeWithStatus>(
  entityType: E,
  status: EntityStatusMap[E]
): boolean {
  const transitions = TRANSITION_MAPS[entityType];
  
  if (!transitions) {
    return true;
  }
  
  const allowedNext = transitions[status as string];
  return !allowedNext || allowedNext.length === 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatusMetadata {
  label: string;
  labelEn: string;
  color: string;
  icon?: string;
  description?: string;
}

type StatusMetadataMap<S extends string> = {
  [K in S]: StatusMetadata;
};

export const ACCESS_AUTH_STATUS_META: StatusMetadataMap<AccessAuthorizationStatus> = {
  draft: {
    label: 'Borrador',
    labelEn: 'Draft',
    color: 'gray',
    icon: 'edit',
    description: 'Autorización en edición, no enviada',
  },
  pending_approval: {
    label: 'Pendiente de Aprobación',
    labelEn: 'Pending Approval',
    color: 'yellow',
    icon: 'clock',
    description: 'Esperando aprobación de recepción',
  },
  approved: {
    label: 'Aprobada',
    labelEn: 'Approved',
    color: 'blue',
    icon: 'check',
    description: 'Autorización aprobada, pendiente de activación',
  },
  rejected: {
    label: 'Rechazada',
    labelEn: 'Rejected',
    color: 'red',
    icon: 'x',
    description: 'Autorización rechazada',
  },
  active: {
    label: 'Activa',
    labelEn: 'Active',
    color: 'green',
    icon: 'check-circle',
    description: 'Autorización vigente y utilizable',
  },
  expired: {
    label: 'Expirada',
    labelEn: 'Expired',
    color: 'gray',
    icon: 'clock',
    description: 'Autorización expirada por tiempo',
  },
  revoked: {
    label: 'Revocada',
    labelEn: 'Revoked',
    color: 'red',
    icon: 'ban',
    description: 'Autorización revocada manualmente',
  },
  cancelled: {
    label: 'Cancelada',
    labelEn: 'Cancelled',
    color: 'gray',
    icon: 'x-circle',
    description: 'Autorización cancelada',
  },
};

export const RESERVATION_STATUS_META: StatusMetadataMap<ReservationStatus> = {
  pending: {
    label: 'Pendiente',
    labelEn: 'Pending',
    color: 'yellow',
    icon: 'clock',
  },
  confirmed: {
    label: 'Confirmada',
    labelEn: 'Confirmed',
    color: 'green',
    icon: 'check',
  },
  checked_in: {
    label: 'Check-In',
    labelEn: 'Checked In',
    color: 'blue',
    icon: 'arrow-down-circle',
  },
  checked_out: {
    label: 'Check-Out',
    labelEn: 'Checked Out',
    color: 'gray',
    icon: 'arrow-up-circle',
  },
  cancelled: {
    label: 'Cancelada',
    labelEn: 'Cancelled',
    color: 'red',
    icon: 'x-circle',
  },
  no_show: {
    label: 'No Show',
    labelEn: 'No Show',
    color: 'orange',
    icon: 'alert-circle',
  },
  rejected: {
    label: 'Rechazada',
    labelEn: 'Rejected',
    color: 'red',
    icon: 'x',
  },
};

export const TASK_STATUS_META: StatusMetadataMap<TaskStatus> = {
  pending: {
    label: 'Pendiente',
    labelEn: 'Pending',
    color: 'yellow',
    icon: 'clock',
  },
  assigned: {
    label: 'Asignada',
    labelEn: 'Assigned',
    color: 'blue',
    icon: 'user',
  },
  in_progress: {
    label: 'En Progreso',
    labelEn: 'In Progress',
    color: 'blue',
    icon: 'play',
  },
  paused: {
    label: 'Pausada',
    labelEn: 'Paused',
    color: 'orange',
    icon: 'pause',
  },
  completed: {
    label: 'Completada',
    labelEn: 'Completed',
    color: 'green',
    icon: 'check',
  },
  verified: {
    label: 'Verificada',
    labelEn: 'Verified',
    color: 'green',
    icon: 'check-circle',
  },
  cancelled: {
    label: 'Cancelada',
    labelEn: 'Cancelled',
    color: 'gray',
    icon: 'x-circle',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene metadata de un status.
 */
export function getStatusMeta<E extends EntityTypeWithStatus>(
  entityType: E,
  status: EntityStatusMap[E]
): StatusMetadata | null {
  switch (entityType) {
    case 'access_authorization':
      return ACCESS_AUTH_STATUS_META[status as AccessAuthorizationStatus];
    case 'reservation':
      return RESERVATION_STATUS_META[status as ReservationStatus];
    case 'task':
      return TASK_STATUS_META[status as TaskStatus];
    default:
      return null;
  }
}

/**
 * Obtiene color Tailwind para un status.
 */
export function getStatusColor(color: string): string {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  
  return colorMap[color] || colorMap.gray;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  isValidTransition,
  getValidNextStates,
  isTerminalState,
  getStatusMeta,
  getStatusColor,
};
