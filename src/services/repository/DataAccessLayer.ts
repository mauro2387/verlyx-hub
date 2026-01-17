/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - DATA ACCESS LAYER (REPOSITORY PATTERN)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Capa de abstracción para persistencia.
 * Permite cambiar de localStorage a API/PostgreSQL sin modificar servicios.
 * 
 * IMPORTANTE: localStorage es SOLO para desarrollo local.
 * En producción esto se reemplaza por llamadas a API REST/GraphQL.
 */

import type { AuditMetadata } from '../../types/core.types';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS BASE
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityType = 
  | 'access_authorization'
  | 'building'
  | 'unit'
  | 'user'
  | 'expense_statement'
  | 'payment'
  | 'reservation'
  | 'maintenance_request'
  | 'task'
  | 'notification'
  | 'automation_rule'
  | 'automation_execution'
  | 'visitor_log'
  | 'announcement'
  | 'survey'
  | 'audit_log'
  | 'visit_registration'
  | 'processed_event'
  | 'execution_lock'
  | 'rate_limit';

export interface BaseEntity {
  id: string;
  audit?: AuditMetadata;  // Optional for backwards compatibility
}

export interface QueryOptions<T> {
  where?: Partial<T> | ((item: T) => boolean);
  orderBy?: keyof T | { field: keyof T; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TransactionContext {
  id: string;
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    entityType: EntityType;
    entityId: string;
    data?: unknown;
  }>;
  committed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UUID GENERATION (REAL UUID V4)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera UUID v4 real usando crypto API.
 * Fallback para browsers antiguos.
 */
export function generateUUID(): string {
  // Usar crypto.randomUUID si está disponible (browsers modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: generar UUID v4 manualmente con crypto.getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    
    // Set version (4) and variant (RFC4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  
  // Último fallback (NO recomendado para producción)
  console.warn('[DAL] crypto API not available, using Math.random fallback');
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Valida que un string sea UUID v4 válido
 */
export function isValidUUID(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE UTILITIES (TIMEZONE-AWARE)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEZONE = 'America/Montevideo';

/**
 * Parsea fecha de forma segura, siempre retorna timestamp UTC.
 */
export function parseDate(input: string | Date | number): number {
  if (typeof input === 'number') {
    return input;
  }
  
  if (input instanceof Date) {
    return input.getTime();
  }
  
  // String ISO o similar
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${input}`);
  }
  
  return parsed.getTime();
}

/**
 * Compara dos fechas de forma segura.
 * Retorna: -1 si a < b, 0 si iguales, 1 si a > b
 */
export function compareDates(a: string | Date | number, b: string | Date | number): number {
  const timeA = parseDate(a);
  const timeB = parseDate(b);
  
  if (timeA < timeB) return -1;
  if (timeA > timeB) return 1;
  return 0;
}

/**
 * Verifica si una fecha está dentro de un rango.
 */
export function isDateInRange(
  date: string | Date | number,
  from: string | Date | number | null,
  to: string | Date | number | null
): boolean {
  const timestamp = parseDate(date);
  
  if (from !== null && timestamp < parseDate(from)) {
    return false;
  }
  
  if (to !== null && timestamp > parseDate(to)) {
    return false;
  }
  
  return true;
}

/**
 * Obtiene timestamp actual en UTC.
 */
export function nowUTC(): number {
  return Date.now();
}

/**
 * Obtiene ISO string actual.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Agrega días a una fecha.
 */
export function addDays(date: string | Date | number, days: number): Date {
  const result = new Date(parseDate(date));
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Agrega horas a una fecha.
 */
export function addHours(date: string | Date | number, hours: number): Date {
  const result = new Date(parseDate(date));
  result.setTime(result.getTime() + hours * 60 * 60 * 1000);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP DIFF UTILITY (PARA AUDITORÍA)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiffEntry {
  path: string;
  operation: 'add' | 'remove' | 'change';
  oldValue?: unknown;
  newValue?: unknown;
  // Aliases for compatibility
  before?: unknown;
  after?: unknown;
}

/**
 * Calcula diff profundo entre dos objetos.
 * Retorna array de cambios con paths completos.
 */
export function deepDiff(
  oldObj: Record<string, unknown> | null | undefined,
  newObj: Record<string, unknown> | null | undefined,
  basePath = ''
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  
  // Handle null/undefined cases
  if (oldObj === null || oldObj === undefined) {
    if (newObj === null || newObj === undefined) {
      return diffs;
    }
    // Todo es nuevo
    for (const key of Object.keys(newObj)) {
      const path = basePath ? `${basePath}.${key}` : key;
      const value = newObj[key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        diffs.push(...deepDiff(null, value as Record<string, unknown>, path));
      } else {
        diffs.push({ path, operation: 'add', newValue: value });
      }
    }
    return diffs;
  }
  
  if (newObj === null || newObj === undefined) {
    // Todo fue removido
    for (const key of Object.keys(oldObj)) {
      const path = basePath ? `${basePath}.${key}` : key;
      diffs.push({ path, operation: 'remove', oldValue: oldObj[key] });
    }
    return diffs;
  }
  
  // Comparar keys
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  
  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    
    // Key solo en old
    if (!(key in newObj)) {
      diffs.push({ path, operation: 'remove', oldValue: oldVal });
      continue;
    }
    
    // Key solo en new
    if (!(key in oldObj)) {
      diffs.push({ path, operation: 'add', newValue: newVal });
      continue;
    }
    
    // Ambos existen, comparar
    if (typeof oldVal !== typeof newVal) {
      diffs.push({ path, operation: 'change', oldValue: oldVal, newValue: newVal });
      continue;
    }
    
    if (oldVal === null || newVal === null) {
      if (oldVal !== newVal) {
        diffs.push({ path, operation: 'change', oldValue: oldVal, newValue: newVal });
      }
      continue;
    }
    
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      // Comparación simple de arrays
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffs.push({ path, operation: 'change', oldValue: oldVal, newValue: newVal });
      }
      continue;
    }
    
    if (typeof oldVal === 'object' && typeof newVal === 'object') {
      // Recursión para objetos anidados
      diffs.push(...deepDiff(
        oldVal as Record<string, unknown>,
        newVal as Record<string, unknown>,
        path
      ));
      continue;
    }
    
    // Valores primitivos
    if (oldVal !== newVal) {
      diffs.push({ path, operation: 'change', oldValue: oldVal, newValue: newVal });
    }
  }
  
  return diffs;
}

/**
 * Obtiene solo los paths que cambiaron.
 */
export function getChangedPaths(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null
): string[] {
  return deepDiff(oldObj, newObj).map(d => d.path);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface del repositorio. 
 * Implementaciones: LocalStorageRepository (dev), APIRepository (prod)
 */
export interface IRepository<T extends BaseEntity> {
  // CRUD básico
  findById(id: string): Promise<T | null>;
  findOne(query: QueryOptions<T>): Promise<T | null>;
  findMany(query?: QueryOptions<T>): Promise<T[]>;
  findPaginated(page: number, pageSize: number, query?: QueryOptions<T>): Promise<PaginatedResponse<T>>;
  
  create(data: Omit<T, 'id'> & { id?: string }): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  
  // Bulk operations
  createMany(items: Array<Omit<T, 'id'>>): Promise<T[]>;
  updateMany(ids: string[], data: Partial<T>): Promise<T[]>;
  deleteMany(ids: string[]): Promise<void>;
  
  // Utilities
  count(query?: QueryOptions<T>): Promise<number>;
  exists(id: string): Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE REPOSITORY (DESARROLLO)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Implementación de repositorio usando localStorage.
 * ⚠️ SOLO PARA DESARROLLO LOCAL - No usar en producción.
 */
export class LocalStorageRepository<T extends BaseEntity> implements IRepository<T> {
  private readonly storageKey: string;
  private readonly entityType: EntityType;
  
  constructor(entityType: EntityType) {
    this.entityType = entityType;
    this.storageKey = `aquarela_${entityType}_v2`;
  }
  
  private getAll(): T[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error(`[Repository:${this.entityType}] Read error:`, e);
      return [];
    }
  }
  
  private saveAll(items: T[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (e) {
      console.error(`[Repository:${this.entityType}] Write error:`, e);
      throw new Error('Storage write failed');
    }
  }
  
  private applyQuery(items: T[], query?: QueryOptions<T>): T[] {
    if (!query) return items;
    
    let result = [...items];
    
    // Filter
    if (query.where) {
      if (typeof query.where === 'function') {
        result = result.filter(query.where);
      } else {
        const conditions = query.where as Partial<T>;
        result = result.filter(item => {
          for (const [key, value] of Object.entries(conditions)) {
            if ((item as Record<string, unknown>)[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }
    }
    
    // Sort
    if (query.orderBy) {
      let field: string;
      let direction: 'asc' | 'desc';
      
      if (typeof query.orderBy === 'string') {
        field = query.orderBy;
        direction = 'asc';
      } else if (typeof query.orderBy === 'object' && query.orderBy !== null && 'field' in query.orderBy) {
        field = query.orderBy.field as string;
        direction = query.orderBy.direction || 'asc';
      } else {
        field = String(query.orderBy);
        direction = 'asc';
      }
      
      result.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[field];
        const bVal = (b as Record<string, unknown>)[field];
        
        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return direction === 'asc' ? -1 : 1;
        if (bVal == null) return direction === 'asc' ? 1 : -1;
        
        // Compare as strings for safety
        const aStr = String(aVal);
        const bStr = String(bVal);
        
        if (aStr < bStr) return direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    // Pagination
    if (query.offset !== undefined) {
      result = result.slice(query.offset);
    }
    
    if (query.limit !== undefined) {
      result = result.slice(0, query.limit);
    }
    
    return result;
  }
  
  async findById(id: string): Promise<T | null> {
    const items = this.getAll();
    return items.find(item => item.id === id) || null;
  }
  
  async findOne(query: QueryOptions<T>): Promise<T | null> {
    const items = this.applyQuery(this.getAll(), { ...query, limit: 1 });
    return items[0] || null;
  }
  
  async findMany(query?: QueryOptions<T>): Promise<T[]> {
    return this.applyQuery(this.getAll(), query);
  }
  
  async findPaginated(page: number, pageSize: number, query?: QueryOptions<T>): Promise<PaginatedResponse<T>> {
    const allFiltered = this.applyQuery(this.getAll(), { ...query, limit: undefined, offset: undefined });
    const total = allFiltered.length;
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const data = allFiltered.slice(offset, offset + pageSize);
    
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
  
  async create(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    const items = this.getAll();
    
    const newItem = {
      ...data,
      id: data.id || generateUUID(),
    } as T;
    
    // Validar que no exista
    if (items.some(item => item.id === newItem.id)) {
      throw new Error(`Entity with id ${newItem.id} already exists`);
    }
    
    items.unshift(newItem);
    this.saveAll(items);
    
    return newItem;
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Entity with id ${id} not found`);
    }
    
    const updated = {
      ...items[index],
      ...data,
      id, // No permitir cambiar ID
    } as T;
    
    items[index] = updated;
    this.saveAll(items);
    
    return updated;
  }
  
  async delete(id: string): Promise<void> {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Entity with id ${id} not found`);
    }
    
    items.splice(index, 1);
    this.saveAll(items);
  }
  
  async createMany(dataList: Array<Omit<T, 'id'>>): Promise<T[]> {
    const items = this.getAll();
    const newItems: T[] = [];
    
    for (const data of dataList) {
      const newItem = {
        ...data,
        id: generateUUID(),
      } as T;
      newItems.push(newItem);
    }
    
    items.unshift(...newItems);
    this.saveAll(items);
    
    return newItems;
  }
  
  async updateMany(ids: string[], data: Partial<T>): Promise<T[]> {
    const items = this.getAll();
    const updated: T[] = [];
    
    for (const id of ids) {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...data, id };
        updated.push(items[index]);
      }
    }
    
    this.saveAll(items);
    return updated;
  }
  
  async deleteMany(ids: string[]): Promise<void> {
    const items = this.getAll().filter(item => !ids.includes(item.id));
    this.saveAll(items);
  }
  
  async count(query?: QueryOptions<T>): Promise<number> {
    return this.applyQuery(this.getAll(), { ...query, limit: undefined, offset: undefined }).length;
  }
  
  async exists(id: string): Promise<boolean> {
    return this.getAll().some(item => item.id === id);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API REPOSITORY (PRODUCCIÓN - STUB)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Implementación de repositorio usando API REST.
 * TODO: Implementar cuando exista backend.
 */
export class APIRepository<T extends BaseEntity> implements IRepository<T> {
  private readonly baseUrl: string;
  private readonly entityType: EntityType;
  
  constructor(entityType: EntityType, baseUrl: string) {
    this.entityType = entityType;
    this.baseUrl = `${baseUrl}/${entityType.replace('_', '-')}`;
  }
  
  private async request<R>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<R> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add auth header
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  async findById(id: string): Promise<T | null> {
    try {
      return await this.request<T>('GET', `/${id}`);
    } catch {
      return null;
    }
  }
  
  async findOne(query: QueryOptions<T>): Promise<T | null> {
    const results = await this.findMany({ ...query, limit: 1 });
    return results[0] || null;
  }
  
  async findMany(query?: QueryOptions<T>): Promise<T[]> {
    const params = new URLSearchParams();
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.offset) params.set('offset', String(query.offset));
    // TODO: Handle where and orderBy
    
    return this.request<T[]>('GET', `?${params.toString()}`);
  }
  
  async findPaginated(page: number, pageSize: number, query?: QueryOptions<T>): Promise<PaginatedResponse<T>> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    
    return this.request<PaginatedResponse<T>>('GET', `?${params.toString()}`);
  }
  
  async create(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    return this.request<T>('POST', '', data);
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.request<T>('PATCH', `/${id}`, data);
  }
  
  async delete(id: string): Promise<void> {
    await this.request<void>('DELETE', `/${id}`);
  }
  
  async createMany(items: Array<Omit<T, 'id'>>): Promise<T[]> {
    return this.request<T[]>('POST', '/bulk', items);
  }
  
  async updateMany(ids: string[], data: Partial<T>): Promise<T[]> {
    return this.request<T[]>('PATCH', '/bulk', { ids, data });
  }
  
  async deleteMany(ids: string[]): Promise<void> {
    await this.request<void>('DELETE', '/bulk', { ids });
  }
  
  async count(query?: QueryOptions<T>): Promise<number> {
    const result = await this.request<{ count: number }>('GET', '/count');
    return result.count;
  }
  
  async exists(id: string): Promise<boolean> {
    try {
      await this.request<void>('HEAD', `/${id}`);
      return true;
    } catch {
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

type RepositoryMode = 'local' | 'api';

// Configuración global - cambiar a 'api' en producción
const REPOSITORY_MODE: RepositoryMode = 'local';
const API_BASE_URL = (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3001/api';

/**
 * Factory para crear repositorios según el modo configurado.
 */
export function createRepository<T extends BaseEntity>(
  entityType: EntityType
): IRepository<T> {
  if (REPOSITORY_MODE === 'api') {
    return new APIRepository<T>(entityType, API_BASE_URL);
  }
  
  return new LocalStorageRepository<T>(entityType);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  generateUUID,
  isValidUUID,
  parseDate,
  compareDates,
  isDateInRange,
  nowUTC,
  nowISO,
  addDays,
  addHours,
  deepDiff,
  getChangedPaths,
  createRepository,
};
