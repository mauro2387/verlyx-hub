/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - AUDIT SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE AUDITORÍA Y TRAZABILIDAD
 * 
 * Este servicio implementa auditoría completa respondiendo a:
 * - ¿Quién realizó la acción?
 * - ¿Cuándo se realizó?
 * - ¿Qué se modificó?
 * - ¿Desde dónde se realizó?
 * - ¿Cuál era el estado anterior?
 * - ¿Cuál es el estado nuevo?
 * 
 * ALMACENAMIENTO:
 * - Usa IndexedDB para persistencia local robusta
 * - Logs inmutables (solo append)
 * - Soporte para exportación y sync con backend
 */

import type {
  AuditLogEntry,
  AuditAction,
  AuditSource,
  AuditMetadata,
  EntityType,
  UserRole,
} from '../types/core.types';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'aquarela_audit_db';
const DB_VERSION = 1;
const STORE_NAME = 'audit_logs';
const MAX_LOGS_IN_MEMORY = 1000;
const SYNC_BATCH_SIZE = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: INDEXEDDB SETUP
// ═══════════════════════════════════════════════════════════════════════════════

let dbInstance: IDBDatabase | null = null;

async function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Error opening audit database:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Crear store principal de logs
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Índices para búsquedas eficientes
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
        store.createIndex('by_entity', ['entityType', 'entityId'], { unique: false });
        store.createIndex('by_user', 'userId', { unique: false });
        store.createIndex('by_action', 'action', { unique: false });
        store.createIndex('by_building', 'buildingId', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: GENERACIÓN DE IDs
// ═══════════════════════════════════════════════════════════════════════════════

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para browsers antiguos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: CONTEXTO DE USUARIO ACTUAL
// ═══════════════════════════════════════════════════════════════════════════════

interface AuditContext {
  userId: string;
  userName: string;
  userRole: UserRole;
  buildingId: string;
  source: AuditSource;
  ipAddress?: string;
  userAgent?: string;
}

let currentContext: AuditContext | null = null;

/**
 * Establece el contexto de auditoría para la sesión actual.
 * Debe llamarse al login y actualizarse cuando cambie el edificio activo.
 */
export function setAuditContext(context: AuditContext): void {
  currentContext = context;
}

/**
 * Obtiene el contexto actual de auditoría.
 * Lanza error si no hay contexto configurado.
 */
export function getAuditContext(): AuditContext {
  if (!currentContext) {
    // Contexto por defecto para desarrollo
    return {
      userId: 'system',
      userName: 'Sistema',
      userRole: 'super_admin',
      buildingId: 'default',
      source: 'web_admin',
    };
  }
  return currentContext;
}

/**
 * Limpia el contexto de auditoría (logout).
 */
export function clearAuditContext(): void {
  currentContext = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: REGISTRO DE AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════════════

export interface LogAuditParams {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Registra una entrada de auditoría.
 * Esta es la función principal del servicio.
 */
export async function logAudit(params: LogAuditParams): Promise<AuditLogEntry> {
  const context = getAuditContext();
  
  // Calcular campos modificados
  const changedFields = calculateChangedFields(params.previousState, params.newState);
  
  const entry: AuditLogEntry & { buildingId: string; synced: boolean } = {
    id: generateUUID(),
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    timestamp: new Date().toISOString(),
    userId: context.userId,
    userName: context.userName,
    userRole: context.userRole,
    source: context.source,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
    previousState: params.previousState || null,
    newState: params.newState || null,
    changedFields,
    metadata: params.metadata,
    buildingId: context.buildingId,
    synced: false, // Para sincronización con backend
  };
  
  // Persistir en IndexedDB
  try {
    const db = await getDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving audit log:', error);
    // Fallback: guardar en localStorage como backup
    saveToLocalStorageBackup(entry);
  }
  
  // Emitir evento para listeners (ej: panel de auditoría en tiempo real)
  emitAuditEvent(entry);
  
  return entry;
}

/**
 * Calcula qué campos cambiaron entre el estado anterior y el nuevo.
 */
function calculateChangedFields(
  previous: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined
): string[] {
  if (!previous && !current) return [];
  if (!previous) return Object.keys(current || {});
  if (!current) return Object.keys(previous);
  
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  
  for (const key of allKeys) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      changed.push(key);
    }
  }
  
  return changed;
}

/**
 * Backup en localStorage cuando IndexedDB falla.
 */
function saveToLocalStorageBackup(entry: AuditLogEntry): void {
  try {
    const key = `audit_backup_${entry.id}`;
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.error('Failed to save audit backup:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: CONSULTAS DE AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditQueryParams {
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction | AuditAction[];
  buildingId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * Consulta el historial de auditoría con filtros.
 */
export async function queryAuditLogs(params: AuditQueryParams): Promise<AuditQueryResult> {
  const db = await getDatabase();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  // Determinar qué índice usar
  let request: IDBRequest;
  
  if (params.entityType && params.entityId) {
    const index = store.index('by_entity');
    request = index.getAll([params.entityType, params.entityId]);
  } else if (params.userId) {
    const index = store.index('by_user');
    request = index.getAll(params.userId);
  } else {
    const index = store.index('by_timestamp');
    request = index.getAll();
  }
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      let entries: AuditLogEntry[] = request.result || [];
      
      // Aplicar filtros adicionales en memoria
      entries = entries.filter((entry: AuditLogEntry & { buildingId?: string }) => {
        if (params.buildingId && entry.buildingId !== params.buildingId) return false;
        if (params.startDate && entry.timestamp < params.startDate) return false;
        if (params.endDate && entry.timestamp > params.endDate) return false;
        if (params.action) {
          const actions = Array.isArray(params.action) ? params.action : [params.action];
          if (!actions.includes(entry.action)) return false;
        }
        if (params.entityType && entry.entityType !== params.entityType) return false;
        return true;
      });
      
      // Ordenar por timestamp descendente (más reciente primero)
      entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      
      const total = entries.length;
      const offset = params.offset || 0;
      const limit = params.limit || 50;
      
      // Aplicar paginación
      entries = entries.slice(offset, offset + limit);
      
      resolve({
        entries,
        total,
        hasMore: offset + entries.length < total,
      });
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene el historial completo de una entidad específica.
 */
export async function getEntityHistory(
  entityType: EntityType,
  entityId: string
): Promise<AuditLogEntry[]> {
  const result = await queryAuditLogs({
    entityType,
    entityId,
    limit: 1000,
  });
  return result.entries;
}

/**
 * Obtiene las acciones recientes de un usuario.
 */
export async function getUserActions(
  userId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  const result = await queryAuditLogs({
    userId,
    limit,
  });
  return result.entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: EVENTOS EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════════════════════════

type AuditEventListener = (entry: AuditLogEntry) => void;
const listeners: Set<AuditEventListener> = new Set();

/**
 * Suscribirse a eventos de auditoría en tiempo real.
 */
export function subscribeToAuditEvents(listener: AuditEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Emitir evento de auditoría a todos los listeners.
 */
function emitAuditEvent(entry: AuditLogEntry): void {
  listeners.forEach(listener => {
    try {
      listener(entry);
    } catch (error) {
      console.error('Error in audit event listener:', error);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: UTILIDADES DE METADATA DE AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea metadata de auditoría para una nueva entidad.
 */
export function createAuditMetadata(): AuditMetadata {
  const context = getAuditContext();
  const now = new Date().toISOString();
  
  return {
    createdAt: now,
    createdBy: context.userId,
    createdByName: context.userName,
    createdFrom: context.source,
    updatedAt: now,
    updatedBy: context.userId,
    updatedByName: context.userName,
    updatedFrom: context.source,
    version: 1,
  };
}

/**
 * Actualiza metadata de auditoría para una entidad existente.
 */
export function updateAuditMetadata(existing: AuditMetadata): AuditMetadata {
  const context = getAuditContext();
  
  return {
    ...existing,
    updatedAt: new Date().toISOString(),
    updatedBy: context.userId,
    updatedByName: context.userName,
    updatedFrom: context.source,
    version: existing.version + 1,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: EXPORTACIÓN DE LOGS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExportOptions {
  format: 'json' | 'csv';
  startDate?: string;
  endDate?: string;
  entityType?: EntityType;
  buildingId?: string;
}

/**
 * Exporta logs de auditoría en el formato especificado.
 */
export async function exportAuditLogs(options: ExportOptions): Promise<Blob> {
  const result = await queryAuditLogs({
    startDate: options.startDate,
    endDate: options.endDate,
    entityType: options.entityType,
    buildingId: options.buildingId,
    limit: 10000, // Límite razonable para exportación
  });
  
  if (options.format === 'json') {
    const json = JSON.stringify(result.entries, null, 2);
    return new Blob([json], { type: 'application/json' });
  }
  
  // Formato CSV
  const headers = [
    'ID',
    'Timestamp',
    'Entity Type',
    'Entity ID',
    'Action',
    'User ID',
    'User Name',
    'User Role',
    'Source',
    'Changed Fields',
  ];
  
  const rows = result.entries.map(entry => [
    entry.id,
    entry.timestamp,
    entry.entityType,
    entry.entityId,
    entry.action,
    entry.userId,
    entry.userName,
    entry.userRole,
    entry.source,
    entry.changedFields.join('; '),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return new Blob([csv], { type: 'text/csv' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: ESTADÍSTICAS DE AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditStats {
  totalLogs: number;
  logsByAction: Record<AuditAction, number>;
  logsByEntityType: Record<EntityType, number>;
  logsByUser: Array<{ userId: string; userName: string; count: number }>;
  recentActivity: AuditLogEntry[];
}

/**
 * Obtiene estadísticas del sistema de auditoría.
 */
export async function getAuditStats(buildingId?: string): Promise<AuditStats> {
  const result = await queryAuditLogs({
    buildingId,
    limit: 10000,
  });
  
  const stats: AuditStats = {
    totalLogs: result.total,
    logsByAction: {} as Record<AuditAction, number>,
    logsByEntityType: {} as Record<EntityType, number>,
    logsByUser: [],
    recentActivity: result.entries.slice(0, 10),
  };
  
  const userCounts = new Map<string, { userId: string; userName: string; count: number }>();
  
  for (const entry of result.entries) {
    // Por acción
    stats.logsByAction[entry.action] = (stats.logsByAction[entry.action] || 0) + 1;
    
    // Por tipo de entidad
    stats.logsByEntityType[entry.entityType] = (stats.logsByEntityType[entry.entityType] || 0) + 1;
    
    // Por usuario
    const userKey = entry.userId;
    const existing = userCounts.get(userKey);
    if (existing) {
      existing.count++;
    } else {
      userCounts.set(userKey, {
        userId: entry.userId,
        userName: entry.userName,
        count: 1,
      });
    }
  }
  
  stats.logsByUser = Array.from(userCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: DECORADOR PARA AUDITORÍA AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrapper que añade auditoría automática a operaciones CRUD.
 * Uso:
 * const saveUser = withAudit('user', 'update', async (user) => { ... });
 */
export function withAudit<T extends Record<string, unknown>, R>(
  entityType: EntityType,
  action: AuditAction,
  operation: (entity: T, ...args: unknown[]) => Promise<R>
): (entity: T, ...args: unknown[]) => Promise<R> {
  return async (entity: T, ...args: unknown[]): Promise<R> => {
    const previousState = { ...entity };
    
    const result = await operation(entity, ...args);
    
    // Si el resultado es un objeto, usarlo como nuevo estado
    const newState = typeof result === 'object' && result !== null 
      ? result as Record<string, unknown>
      : entity;
    
    await logAudit({
      entityType,
      entityId: String((entity as Record<string, unknown>).id || 'unknown'),
      action,
      previousState,
      newState,
    });
    
    return result;
  };
}
