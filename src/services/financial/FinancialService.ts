/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA BUILDING MANAGEMENT SYSTEM - FINANCIAL SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SERVICIO DE GESTIÓN FINANCIERA ENTERPRISE
 * 
 * Implementa:
 * - Estados de cuenta (expensas)
 * - Gestión de pagos y cobranzas
 * - Movimientos y transacciones
 * - Deudas pendientes con mora
 * - Filtros por unidad, período, moneda
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

export type Currency = 'ARS' | 'USD' | 'EUR';
export type TransactionType = 'charge' | 'payment' | 'adjustment' | 'interest' | 'discount';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'debit_card' | 'other';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'refunded';
export type AccountType = 'expensas_ordinarias' | 'expensas_extraordinarias' | 'fondos' | 'servicios' | 'multas';
export type DebtStatus = 'current' | 'overdue' | 'in_arrangement' | 'legal_action';

export interface Transaction {
  id: string;
  
  /** ID de la unidad */
  unitId: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** Tipo de cuenta */
  accountType: AccountType;
  
  /** Tipo de transacción */
  type: TransactionType;
  
  /** Descripción */
  description: string;
  
  /** Período (YYYY-MM) */
  period: string;
  
  /** Moneda */
  currency: Currency;
  
  /** Monto (positivo = cargo, negativo = pago/descuento) */
  amount: number;
  
  /** Balance después de esta transacción */
  balanceAfter: number;
  
  /** Fecha de vencimiento (para cargos) */
  dueDate?: string;
  
  /** Referencia externa (nro recibo, etc) */
  externalRef?: string;
  
  /** Notas */
  notes?: string;
  
  /** Auditoría */
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface Payment {
  id: string;
  
  /** ID de la unidad */
  unitId: string;
  
  /** ID del edificio */
  buildingId: string;
  
  /** Transacciones asociadas (pagos parciales) */
  transactionIds: string[];
  
  /** Moneda */
  currency: Currency;
  
  /** Monto total del pago */
  amount: number;
  
  /** Método de pago */
  paymentMethod: PaymentMethod;
  
  /** Estado */
  status: PaymentStatus;
  
  /** Fecha del pago */
  paymentDate: string;
  
  /** Número de recibo */
  receiptNumber: string;
  
  /** Número de cheque (si aplica) */
  checkNumber?: string;
  
  /** Banco (si aplica) */
  bankName?: string;
  
  /** Referencia de transferencia */
  transferRef?: string;
  
  /** Imagen del comprobante */
  proofImageUrl?: string;
  
  /** Notas */
  notes?: string;
  
  /** Auditoría */
  audit: {
    createdAt: string;
    createdBy: string;
    createdByName: string;
    confirmedAt?: string;
    confirmedBy?: string;
    confirmedByName?: string;
    rejectedAt?: string;
    rejectedBy?: string;
    rejectReason?: string;
  };
}

export interface AccountStatement {
  unitId: string;
  buildingId: string;
  period: string;
  
  openingBalance: number;
  closingBalance: number;
  
  charges: number;
  payments: number;
  adjustments: number;
  
  transactions: Transaction[];
  
  currency: Currency;
  
  generatedAt: string;
}

export interface DebtSummary {
  unitId: string;
  buildingId: string;
  
  totalDebt: number;
  currentDebt: number;
  overdueDebt: number;
  overdueMonths: number;
  
  status: DebtStatus;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  
  currency: Currency;
  
  periodBreakdown: {
    period: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
  }[];
}

// Input Types
export interface CreateChargeInput {
  unitId: string;
  buildingId: string;
  accountType: AccountType;
  description: string;
  amount: number;
  currency: Currency;
  period: string;
  dueDate: string;
  externalRef?: string;
  notes?: string;
}

export interface RecordPaymentInput {
  unitId: string;
  buildingId: string;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  checkNumber?: string;
  bankName?: string;
  transferRef?: string;
  proofImageUrl?: string;
  notes?: string;
  applyToOldestFirst?: boolean;
}

export interface TransactionFilters {
  unitId?: string;
  buildingId?: string;
  accountType?: AccountType | AccountType[];
  type?: TransactionType | TransactionType[];
  period?: string;
  periodFrom?: string;
  periodTo?: string;
  currency?: Currency;
}

export interface PaymentFilters {
  unitId?: string;
  buildingId?: string;
  status?: PaymentStatus | PaymentStatus[];
  paymentMethod?: PaymentMethod | PaymentMethod[];
  dateFrom?: string;
  dateTo?: string;
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

const TRANSACTIONS_KEY = 'aquarela_transactions_v2';
const PAYMENTS_KEY = 'aquarela_payments_v2';
const RECEIPT_COUNTER_KEY = 'aquarela_receipt_counter';

function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[FinancialService] Failed to read transactions:', e);
    return [];
  }
}

function saveTransactions(list: Transaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[FinancialService] Failed to save transactions:', e);
  }
}

function getStoredPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[FinancialService] Failed to read payments:', e);
    return [];
  }
}

function savePayments(list: Payment[]): void {
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[FinancialService] Failed to save payments:', e);
  }
}

function generateReceiptNumber(): string {
  const counter = parseInt(localStorage.getItem(RECEIPT_COUNTER_KEY) || '0', 10) + 1;
  localStorage.setItem(RECEIPT_COUNTER_KEY, counter.toString());
  const year = new Date().getFullYear();
  return `REC-${year}-${counter.toString().padStart(6, '0')}`;
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

function calculateCurrentBalance(unitId: string, currency: Currency): number {
  const transactions = getStoredTransactions()
    .filter(t => t.unitId === unitId && t.currency === currency)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  if (transactions.length === 0) return 0;
  return transactions[transactions.length - 1].balanceAfter;
}

function formatCurrency(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    ARS: '$',
    USD: 'US$',
    EUR: '€',
  };
  return `${symbols[currency]} ${amount.toFixed(2)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea un cargo (expensa, multa, etc).
 */
export async function createCharge(
  input: CreateChargeInput,
  actor: AuditActor
): Promise<OperationResult<Transaction>> {
  if (input.amount <= 0) {
    return {
      success: false,
      error: { code: 'INVALID_AMOUNT', message: 'El monto debe ser mayor a 0' },
    };
  }
  
  const currentBalance = calculateCurrentBalance(input.unitId, input.currency);
  const now = nowISO();
  
  const transaction: Transaction = {
    id: generateUUID(),
    unitId: input.unitId,
    buildingId: input.buildingId,
    accountType: input.accountType,
    type: 'charge',
    description: input.description,
    period: input.period,
    currency: input.currency,
    amount: input.amount,
    balanceAfter: currentBalance + input.amount,
    dueDate: input.dueDate,
    externalRef: input.externalRef,
    notes: input.notes,
    createdAt: now,
    createdBy: actor.userId,
    createdByName: actor.userName,
  };
  
  const list = getStoredTransactions();
  list.unshift(transaction);
  saveTransactions(list);
  
  await auditCreate(
    'transaction',
    sanitizeForAudit(transaction as unknown as Record<string, unknown>),
    actor,
    createAuditContext(input.buildingId),
    `Cargo ${input.accountType}: ${formatCurrency(input.amount, input.currency)}`
  );
  
  console.log(`[FinancialService] Created charge: ${formatCurrency(input.amount, input.currency)} for unit ${input.unitId}`);
  
  return { success: true, data: transaction };
}

/**
 * Crea un ajuste (positivo o negativo).
 */
export async function createAdjustment(
  unitId: string,
  buildingId: string,
  amount: number,
  currency: Currency,
  description: string,
  period: string,
  actor: AuditActor
): Promise<OperationResult<Transaction>> {
  const currentBalance = calculateCurrentBalance(unitId, currency);
  const now = nowISO();
  
  const transaction: Transaction = {
    id: generateUUID(),
    unitId,
    buildingId,
    accountType: 'expensas_ordinarias', // Ajustes van a cuenta general
    type: 'adjustment',
    description: `Ajuste: ${description}`,
    period,
    currency,
    amount, // Puede ser positivo (cargo adicional) o negativo (descuento)
    balanceAfter: currentBalance + amount,
    createdAt: now,
    createdBy: actor.userId,
    createdByName: actor.userName,
  };
  
  const list = getStoredTransactions();
  list.unshift(transaction);
  saveTransactions(list);
  
  await auditCreate(
    'transaction',
    sanitizeForAudit(transaction as unknown as Record<string, unknown>),
    actor,
    createAuditContext(buildingId),
    `Ajuste: ${formatCurrency(amount, currency)}`
  );
  
  return { success: true, data: transaction };
}

/**
 * Lista transacciones con filtros.
 */
export function listTransactions(filters: TransactionFilters = {}): Transaction[] {
  let list = getStoredTransactions();
  
  if (filters.unitId) {
    list = list.filter(t => t.unitId === filters.unitId);
  }
  
  if (filters.buildingId) {
    list = list.filter(t => t.buildingId === filters.buildingId);
  }
  
  if (filters.accountType) {
    const types = Array.isArray(filters.accountType) ? filters.accountType : [filters.accountType];
    list = list.filter(t => types.includes(t.accountType));
  }
  
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    list = list.filter(t => types.includes(t.type));
  }
  
  if (filters.period) {
    list = list.filter(t => t.period === filters.period);
  }
  
  if (filters.periodFrom) {
    list = list.filter(t => t.period >= filters.periodFrom!);
  }
  
  if (filters.periodTo) {
    list = list.filter(t => t.period <= filters.periodTo!);
  }
  
  if (filters.currency) {
    list = list.filter(t => t.currency === filters.currency);
  }
  
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registra un pago.
 */
export async function recordPayment(
  input: RecordPaymentInput,
  actor: AuditActor
): Promise<OperationResult<Payment>> {
  if (input.amount <= 0) {
    return {
      success: false,
      error: { code: 'INVALID_AMOUNT', message: 'El monto debe ser mayor a 0' },
    };
  }
  
  const now = nowISO();
  const receiptNumber = generateReceiptNumber();
  
  // Crear transacción de pago
  const currentBalance = calculateCurrentBalance(input.unitId, input.currency);
  
  const paymentTransaction: Transaction = {
    id: generateUUID(),
    unitId: input.unitId,
    buildingId: input.buildingId,
    accountType: 'expensas_ordinarias',
    type: 'payment',
    description: `Pago recibo ${receiptNumber}`,
    period: new Date().toISOString().substring(0, 7), // YYYY-MM
    currency: input.currency,
    amount: -input.amount, // Negativo porque reduce el saldo
    balanceAfter: currentBalance - input.amount,
    externalRef: receiptNumber,
    notes: input.notes,
    createdAt: now,
    createdBy: actor.userId,
    createdByName: actor.userName,
  };
  
  const transactions = getStoredTransactions();
  transactions.unshift(paymentTransaction);
  saveTransactions(transactions);
  
  // Crear registro de pago
  const payment: Payment = {
    id: generateUUID(),
    unitId: input.unitId,
    buildingId: input.buildingId,
    transactionIds: [paymentTransaction.id],
    currency: input.currency,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    status: 'pending', // Requiere confirmación
    paymentDate: input.paymentDate,
    receiptNumber,
    checkNumber: input.checkNumber,
    bankName: input.bankName,
    transferRef: input.transferRef,
    proofImageUrl: input.proofImageUrl,
    notes: input.notes,
    audit: {
      createdAt: now,
      createdBy: actor.userId,
      createdByName: actor.userName,
    },
  };
  
  const payments = getStoredPayments();
  payments.unshift(payment);
  savePayments(payments);
  
  await auditCreate(
    'payment',
    sanitizeForAudit(payment as unknown as Record<string, unknown>),
    actor,
    createAuditContext(input.buildingId),
    `Pago ${receiptNumber}: ${formatCurrency(input.amount, input.currency)}`
  );
  
  console.log(`[FinancialService] Recorded payment: ${receiptNumber} for ${formatCurrency(input.amount, input.currency)}`);
  
  return { success: true, data: payment };
}

/**
 * Confirma un pago.
 */
export async function confirmPayment(
  paymentId: string,
  actor: AuditActor
): Promise<OperationResult<Payment>> {
  const payments = getStoredPayments();
  const index = payments.findIndex(p => p.id === paymentId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Pago no encontrado' },
    };
  }
  
  const payment = payments[index];
  
  if (payment.status !== 'pending') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `No se puede confirmar un pago en estado ${payment.status}`,
      },
    };
  }
  
  const now = nowISO();
  payment.status = 'confirmed';
  payment.audit.confirmedAt = now;
  payment.audit.confirmedBy = actor.userId;
  payment.audit.confirmedByName = actor.userName;
  
  payments[index] = payment;
  savePayments(payments);
  
  await audit({
    action: 'update',
    entityType: 'payment',
    entityId: paymentId,
    entityName: `Pago ${payment.receiptNumber}`,
    actor,
    context: createAuditContext(payment.buildingId),
    description: 'Pago confirmado',
    tags: ['payment', 'confirmation'],
  });
  
  return { success: true, data: payment };
}

/**
 * Rechaza un pago.
 */
export async function rejectPayment(
  paymentId: string,
  reason: string,
  actor: AuditActor
): Promise<OperationResult<Payment>> {
  const payments = getStoredPayments();
  const index = payments.findIndex(p => p.id === paymentId);
  
  if (index === -1) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Pago no encontrado' },
    };
  }
  
  const payment = payments[index];
  
  if (payment.status !== 'pending') {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `No se puede rechazar un pago en estado ${payment.status}`,
      },
    };
  }
  
  const now = nowISO();
  payment.status = 'rejected';
  payment.audit.rejectedAt = now;
  payment.audit.rejectedBy = actor.userId;
  payment.audit.rejectReason = reason;
  
  payments[index] = payment;
  savePayments(payments);
  
  // Revertir la transacción
  const transactions = getStoredTransactions();
  for (const txId of payment.transactionIds) {
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex !== -1) {
      const tx = transactions[txIndex];
      // Crear transacción de reversión
      const currentBalance = calculateCurrentBalance(payment.unitId, payment.currency);
      const reversal: Transaction = {
        id: generateUUID(),
        unitId: payment.unitId,
        buildingId: payment.buildingId,
        accountType: tx.accountType,
        type: 'adjustment',
        description: `Reversión pago rechazado ${payment.receiptNumber}: ${reason}`,
        period: tx.period,
        currency: payment.currency,
        amount: -tx.amount, // Invertir el monto
        balanceAfter: currentBalance - tx.amount,
        externalRef: payment.receiptNumber,
        createdAt: now,
        createdBy: actor.userId,
        createdByName: actor.userName,
      };
      transactions.unshift(reversal);
    }
  }
  saveTransactions(transactions);
  
  await audit({
    action: 'update',
    entityType: 'payment',
    entityId: paymentId,
    entityName: `Pago ${payment.receiptNumber}`,
    actor,
    context: createAuditContext(payment.buildingId),
    description: `Pago rechazado: ${reason}`,
    tags: ['payment', 'rejection'],
    severity: 'high',
  });
  
  return { success: true, data: payment };
}

/**
 * Lista pagos con filtros.
 */
export function listPayments(filters: PaymentFilters = {}): Payment[] {
  let list = getStoredPayments();
  
  if (filters.unitId) {
    list = list.filter(p => p.unitId === filters.unitId);
  }
  
  if (filters.buildingId) {
    list = list.filter(p => p.buildingId === filters.buildingId);
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    list = list.filter(p => statuses.includes(p.status));
  }
  
  if (filters.paymentMethod) {
    const methods = Array.isArray(filters.paymentMethod) ? filters.paymentMethod : [filters.paymentMethod];
    list = list.filter(p => methods.includes(p.paymentMethod));
  }
  
  if (filters.dateFrom) {
    list = list.filter(p => p.paymentDate >= filters.dateFrom!);
  }
  
  if (filters.dateTo) {
    list = list.filter(p => p.paymentDate <= filters.dateTo!);
  }
  
  return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}

/**
 * Obtiene un pago por ID.
 */
export function getPayment(id: string): Payment | null {
  return getStoredPayments().find(p => p.id === id) || null;
}

/**
 * Obtiene un pago por número de recibo.
 */
export function getPaymentByReceipt(receiptNumber: string): Payment | null {
  return getStoredPayments().find(p => p.receiptNumber === receiptNumber) || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT STATEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera estado de cuenta para una unidad y período.
 */
export function generateAccountStatement(
  unitId: string,
  buildingId: string,
  period: string,
  currency: Currency = 'ARS'
): AccountStatement {
  const allTransactions = getStoredTransactions()
    .filter(t => t.unitId === unitId && t.currency === currency)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  // Transacciones del período
  const periodTransactions = allTransactions.filter(t => t.period === period);
  
  // Calcular balance de apertura (suma de todo lo anterior al período)
  const priorTransactions = allTransactions.filter(t => t.period < period);
  const openingBalance = priorTransactions.length > 0
    ? priorTransactions[priorTransactions.length - 1].balanceAfter
    : 0;
  
  // Totales del período
  let charges = 0;
  let payments = 0;
  let adjustments = 0;
  
  for (const tx of periodTransactions) {
    switch (tx.type) {
      case 'charge':
      case 'interest':
        charges += tx.amount;
        break;
      case 'payment':
        payments += Math.abs(tx.amount);
        break;
      case 'adjustment':
      case 'discount':
        adjustments += tx.amount;
        break;
    }
  }
  
  const closingBalance = openingBalance + charges - payments + adjustments;
  
  return {
    unitId,
    buildingId,
    period,
    openingBalance,
    closingBalance,
    charges,
    payments,
    adjustments,
    transactions: periodTransactions,
    currency,
    generatedAt: nowISO(),
  };
}

/**
 * Obtiene el historial de estados de cuenta.
 */
export function getAccountHistory(
  unitId: string,
  currency: Currency = 'ARS',
  periodsBack: number = 12
): AccountStatement[] {
  const transactions = getStoredTransactions().filter(t =>
    t.unitId === unitId && t.currency === currency
  );
  
  if (transactions.length === 0) return [];
  
  // Obtener el edificio del primer transaction
  const buildingId = transactions[0].buildingId;
  
  // Obtener períodos únicos
  const periods = [...new Set(transactions.map(t => t.period))]
    .sort()
    .reverse()
    .slice(0, periodsBack);
  
  return periods.map(period =>
    generateAccountStatement(unitId, buildingId, period, currency)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula el resumen de deuda de una unidad.
 */
export function calculateDebtSummary(
  unitId: string,
  buildingId: string,
  currency: Currency = 'ARS'
): DebtSummary {
  const transactions = getStoredTransactions()
    .filter(t => t.unitId === unitId && t.currency === currency)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  const payments = getStoredPayments()
    .filter(p => p.unitId === unitId && p.currency === currency && p.status === 'confirmed')
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  
  // Balance actual
  const totalDebt = transactions.length > 0
    ? transactions[transactions.length - 1].balanceAfter
    : 0;
  
  // Último pago
  const lastPayment = payments[0];
  
  // Calcular deuda corriente vs vencida
  const today = new Date();
  let currentDebt = 0;
  let overdueDebt = 0;
  const periodBreakdown: DebtSummary['periodBreakdown'] = [];
  
  // Agrupar cargos pendientes por período
  const chargesByPeriod = new Map<string, { amount: number; dueDate: string }>();
  
  for (const tx of transactions) {
    if (tx.type === 'charge' && tx.dueDate) {
      const existing = chargesByPeriod.get(tx.period) || { amount: 0, dueDate: tx.dueDate };
      existing.amount += tx.amount;
      chargesByPeriod.set(tx.period, existing);
    }
  }
  
  // Descontar pagos
  let remainingPayments = payments
    .filter(p => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0);
  
  // Aplicar pagos a los períodos más antiguos primero
  const sortedPeriods = [...chargesByPeriod.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [period, data] of sortedPeriods) {
    let periodAmount = data.amount;
    
    if (remainingPayments >= periodAmount) {
      remainingPayments -= periodAmount;
      periodAmount = 0;
    } else {
      periodAmount -= remainingPayments;
      remainingPayments = 0;
    }
    
    if (periodAmount > 0) {
      const dueDate = new Date(data.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 0) {
        overdueDebt += periodAmount;
      } else {
        currentDebt += periodAmount;
      }
      
      periodBreakdown.push({
        period,
        amount: periodAmount,
        dueDate: data.dueDate,
        daysOverdue: Math.max(0, daysOverdue),
      });
    }
  }
  
  // Calcular meses de mora
  const overdueMonths = periodBreakdown.filter(p => p.daysOverdue > 0).length;
  
  // Determinar estado
  let status: DebtStatus = 'current';
  if (overdueMonths >= 3) {
    status = 'legal_action';
  } else if (overdueMonths >= 1) {
    status = 'overdue';
  }
  
  return {
    unitId,
    buildingId,
    totalDebt: Math.max(0, totalDebt),
    currentDebt,
    overdueDebt,
    overdueMonths,
    status,
    lastPaymentDate: lastPayment?.paymentDate,
    lastPaymentAmount: lastPayment?.amount,
    currency,
    periodBreakdown: periodBreakdown.sort((a, b) => a.period.localeCompare(b.period)),
  };
}

/**
 * Lista todas las deudas de un edificio.
 */
export function listBuildingDebts(
  buildingId: string,
  currency: Currency = 'ARS'
): DebtSummary[] {
  const transactions = getStoredTransactions().filter(t =>
    t.buildingId === buildingId && t.currency === currency
  );
  
  const unitIds = [...new Set(transactions.map(t => t.unitId))];
  
  return unitIds
    .map(unitId => calculateDebtSummary(unitId, buildingId, currency))
    .filter(debt => debt.totalDebt > 0)
    .sort((a, b) => b.totalDebt - a.totalDebt);
}

/**
 * Lista unidades morosas (con deuda vencida).
 */
export function listOverdueUnits(buildingId: string, currency: Currency = 'ARS'): DebtSummary[] {
  return listBuildingDebts(buildingId, currency)
    .filter(debt => debt.overdueDebt > 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera cargos masivos para un período (liquidación de expensas).
 */
export async function generateBulkCharges(
  buildingId: string,
  charges: Array<{
    unitId: string;
    amount: number;
    accountType: AccountType;
  }>,
  period: string,
  dueDate: string,
  description: string,
  currency: Currency,
  actor: AuditActor
): Promise<OperationResult<{ created: number; errors: string[] }>> {
  const errors: string[] = [];
  let created = 0;
  
  for (const charge of charges) {
    const result = await createCharge(
      {
        unitId: charge.unitId,
        buildingId,
        accountType: charge.accountType,
        description,
        amount: charge.amount,
        currency,
        period,
        dueDate,
      },
      actor
    );
    
    if (result.success) {
      created++;
    } else {
      errors.push(`Unidad ${charge.unitId}: ${result.error?.message}`);
    }
  }
  
  await audit({
    action: 'create',
    entityType: 'bulk_charges',
    entityId: `${buildingId}-${period}`,
    entityName: `Liquidación ${period}`,
    actor,
    context: createAuditContext(buildingId),
    description: `Generados ${created} cargos para período ${period}`,
    tags: ['bulk', 'liquidation'],
    severity: 'high',
  });
  
  return {
    success: errors.length === 0,
    data: { created, errors },
    error: errors.length > 0 ? {
      code: 'PARTIAL_SUCCESS',
      message: `${errors.length} errores durante la generación`,
      details: { errors },
    } : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene estadísticas financieras del edificio.
 */
export function getBuildingFinancialStats(
  buildingId: string,
  currency: Currency = 'ARS'
): {
  totalCharges: number;
  totalPayments: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  unitsWithDebt: number;
  unitsOverdue: number;
  avgDebt: number;
} {
  const transactions = getStoredTransactions().filter(t =>
    t.buildingId === buildingId && t.currency === currency
  );
  
  const debts = listBuildingDebts(buildingId, currency);
  
  // Totales
  let totalCharges = 0;
  let totalPayments = 0;
  
  for (const tx of transactions) {
    if (tx.type === 'charge' || tx.type === 'interest') {
      totalCharges += tx.amount;
    } else if (tx.type === 'payment') {
      totalPayments += Math.abs(tx.amount);
    }
  }
  
  const totalPending = debts.reduce((sum, d) => sum + d.totalDebt, 0);
  const totalOverdue = debts.reduce((sum, d) => sum + d.overdueDebt, 0);
  const unitsWithDebt = debts.length;
  const unitsOverdue = debts.filter(d => d.overdueDebt > 0).length;
  
  return {
    totalCharges,
    totalPayments,
    totalPending,
    totalOverdue,
    collectionRate: totalCharges > 0 ? (totalPayments / totalCharges) * 100 : 100,
    unitsWithDebt,
    unitsOverdue,
    avgDebt: unitsWithDebt > 0 ? totalPending / unitsWithDebt : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
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
  
  // Helpers
  formatCurrency,
};
