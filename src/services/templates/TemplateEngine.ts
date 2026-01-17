/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - TEMPLATE ENGINE (SECURE)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Motor de templates SEGURO para automatizaciones.
 * 
 * IMPORTANTE: NO usa eval() ni Function() ni ninguna forma de ejecución dinámica.
 * Solo reemplazo de texto + operaciones matemáticas permitidas en whitelist.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemplateContext {
  entity?: Record<string, unknown>;
  building?: Record<string, unknown>;
  unit?: Record<string, unknown>;
  user?: Record<string, unknown>;
  system?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CalculationResult {
  success: boolean;
  value?: number;
  error?: string;
}

type AllowedOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'percent' | 'round' | 'floor' | 'ceil' | 'min' | 'max';

export interface CalculationExpression {
  operation: AllowedOperation;
  operands: Array<number | string | CalculationExpression>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE INTERPOLATION (TEXTO SOLAMENTE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene valor de un path anidado de forma segura.
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    
    // Prevenir acceso a prototype
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      console.warn(`[TemplateEngine] Blocked access to dangerous path: ${path}`);
      return undefined;
    }
    
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}

/**
 * Interpola variables en un template de texto.
 * Sintaxis: {{path.to.value}}
 * 
 * SOLO reemplaza texto, NO ejecuta código.
 */
export function interpolateText(template: string, context: TemplateContext): string {
  if (!template || typeof template !== 'string') {
    return template || '';
  }
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    
    // Validar que no sea una expresión (solo permitir paths simples)
    if (trimmedPath.includes('(') || 
        trimmedPath.includes('+') || 
        trimmedPath.includes('-') || 
        trimmedPath.includes('*') || 
        trimmedPath.includes('/')) {
      console.warn(`[TemplateEngine] Expressions not allowed in text templates: ${trimmedPath}`);
      return match; // Dejar sin modificar
    }
    
    const value = getNestedValue(context, trimmedPath);
    
    if (value === undefined || value === null) {
      return ''; // O podríamos retornar match para debugging
    }
    
    // Formatear según tipo
    if (typeof value === 'number') {
      // Formatear números con separadores de miles
      return value.toLocaleString('es-UY');
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString('es-UY');
    }
    
    if (typeof value === 'object') {
      // No serializar objetos complejos
      return '[Object]';
    }
    
    return String(value);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULATION ENGINE (EXPRESIONES MATEMÁTICAS SEGURAS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resuelve un operando que puede ser número, path, o expresión anidada.
 */
function resolveOperand(
  operand: number | string | CalculationExpression,
  context: TemplateContext
): number | null {
  // Número literal
  if (typeof operand === 'number') {
    return operand;
  }
  
  // Path a variable
  if (typeof operand === 'string') {
    const value = getNestedValue(context, operand);
    
    if (value === undefined || value === null) {
      return null;
    }
    
    const num = Number(value);
    if (isNaN(num)) {
      return null;
    }
    
    return num;
  }
  
  // Expresión anidada
  if (typeof operand === 'object' && operand.operation) {
    const result = executeCalculation(operand, context);
    return result.success ? result.value! : null;
  }
  
  return null;
}

/**
 * Ejecuta una expresión de cálculo de forma segura.
 * Solo operaciones en whitelist.
 */
export function executeCalculation(
  expression: CalculationExpression,
  context: TemplateContext
): CalculationResult {
  const { operation, operands } = expression;
  
  // Validar operación permitida
  const allowedOps: AllowedOperation[] = [
    'add', 'subtract', 'multiply', 'divide', 
    'percent', 'round', 'floor', 'ceil', 'min', 'max'
  ];
  
  if (!allowedOps.includes(operation)) {
    return { 
      success: false, 
      error: `Operation '${operation}' not allowed` 
    };
  }
  
  // Resolver operandos
  const resolvedOperands: number[] = [];
  
  for (const op of operands) {
    const resolved = resolveOperand(op, context);
    if (resolved === null) {
      return { 
        success: false, 
        error: `Could not resolve operand: ${JSON.stringify(op)}` 
      };
    }
    resolvedOperands.push(resolved);
  }
  
  // Ejecutar operación
  try {
    let result: number;
    
    switch (operation) {
      case 'add':
        result = resolvedOperands.reduce((a, b) => a + b, 0);
        break;
        
      case 'subtract':
        result = resolvedOperands.reduce((a, b, i) => i === 0 ? b : a - b);
        break;
        
      case 'multiply':
        result = resolvedOperands.reduce((a, b) => a * b, 1);
        break;
        
      case 'divide':
        if (resolvedOperands.length !== 2) {
          return { success: false, error: 'Divide requires exactly 2 operands' };
        }
        if (resolvedOperands[1] === 0) {
          return { success: false, error: 'Division by zero' };
        }
        result = resolvedOperands[0] / resolvedOperands[1];
        break;
        
      case 'percent':
        // percent(value, percentage) = value * (percentage / 100)
        if (resolvedOperands.length !== 2) {
          return { success: false, error: 'Percent requires exactly 2 operands' };
        }
        result = resolvedOperands[0] * (resolvedOperands[1] / 100);
        break;
        
      case 'round':
        if (resolvedOperands.length < 1) {
          return { success: false, error: 'Round requires at least 1 operand' };
        }
        const decimals = resolvedOperands[1] ?? 0;
        const factor = Math.pow(10, decimals);
        result = Math.round(resolvedOperands[0] * factor) / factor;
        break;
        
      case 'floor':
        result = Math.floor(resolvedOperands[0]);
        break;
        
      case 'ceil':
        result = Math.ceil(resolvedOperands[0]);
        break;
        
      case 'min':
        result = Math.min(...resolvedOperands);
        break;
        
      case 'max':
        result = Math.max(...resolvedOperands);
        break;
        
      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }
    
    // Validar resultado
    if (!isFinite(result)) {
      return { success: false, error: 'Result is not finite' };
    }
    
    return { success: true, value: result };
    
  } catch (error) {
    return { 
      success: false, 
      error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown'}` 
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING DE EXPRESIONES (DESDE STRING SEGURO)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsea una expresión de cálculo desde formato DSL.
 * 
 * Formatos soportados:
 * - "entity.total * 0.05" → { operation: 'multiply', operands: ['entity.total', 0.05] }
 * - "entity.amount + 100" → { operation: 'add', operands: ['entity.amount', 100] }
 * - "percent(entity.total, 5)" → { operation: 'percent', operands: ['entity.total', 5] }
 * 
 * NO soporta (por seguridad):
 * - Funciones arbitrarias
 * - Acceso a globals
 * - Strings/código
 */
export function parseCalculationExpression(expr: string): CalculationExpression | null {
  const trimmed = expr.trim();
  
  // Formato función: operation(arg1, arg2, ...)
  const fnMatch = trimmed.match(/^(\w+)\(([^)]+)\)$/);
  if (fnMatch) {
    const operation = fnMatch[1].toLowerCase() as AllowedOperation;
    const argsStr = fnMatch[2];
    
    const operands = argsStr.split(',').map(arg => {
      const trimmedArg = arg.trim();
      const num = Number(trimmedArg);
      return isNaN(num) ? trimmedArg : num;
    });
    
    return { operation, operands };
  }
  
  // Formato infijo simple: a * b, a + b, etc.
  // Solo soporta UNA operación (sin precedencia compleja)
  const operators: Array<{ symbol: string; operation: AllowedOperation }> = [
    { symbol: '*', operation: 'multiply' },
    { symbol: '/', operation: 'divide' },
    { symbol: '+', operation: 'add' },
    { symbol: '-', operation: 'subtract' },
  ];
  
  for (const { symbol, operation } of operators) {
    // Buscar operador que no esté en un path (ej: no confundir . con operador)
    const parts = trimmed.split(symbol).map(p => p.trim());
    
    if (parts.length === 2 && parts[0] && parts[1]) {
      const operands = parts.map(part => {
        const num = Number(part);
        return isNaN(num) ? part : num;
      });
      
      return { operation, operands };
    }
  }
  
  // No se pudo parsear
  return null;
}

/**
 * Evalúa una expresión de cálculo desde string de forma segura.
 */
export function evaluateExpression(
  expr: string,
  context: TemplateContext
): CalculationResult {
  const parsed = parseCalculationExpression(expr);
  
  if (!parsed) {
    return { 
      success: false, 
      error: `Could not parse expression: ${expr}` 
    };
  }
  
  return executeCalculation(parsed, context);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES DE FORMATO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formatea un número como moneda.
 */
export function formatCurrency(
  value: number,
  currency = 'UYU',
  locale = 'es-UY'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Formatea una fecha según patrón.
 */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'long' | 'time' | 'datetime' = 'short',
  locale = 'es-UY'
): string {
  const d = date instanceof Date ? date : new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString(locale);
    case 'long':
      return d.toLocaleDateString(locale, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    case 'time':
      return d.toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    case 'datetime':
      return d.toLocaleString(locale);
    default:
      return d.toLocaleDateString(locale);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  interpolateText,
  executeCalculation,
  parseCalculationExpression,
  evaluateExpression,
  formatCurrency,
  formatDate,
};
