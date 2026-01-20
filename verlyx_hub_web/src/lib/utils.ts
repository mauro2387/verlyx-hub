// Utilidades y helpers

// Formatear moneda
export function formatCurrency(amount: number, currency: string = 'UYU'): string {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Formatear fecha
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

// Formatear fecha y hora
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

// Formatear tamaño de archivo
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Obtener iniciales de un nombre
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Colores para estados de proyecto
export const projectStatusColors: Record<string, { bg: string; text: string; label: string }> = {
  backlog: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Backlog' },
  planning: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planificación' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'En Progreso' },
  on_hold: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Pausa' },
  review: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Revisión' },
  done: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completado' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' },
};

// Colores para prioridades
export const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Baja' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Media' },
  high: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Alta' },
  critical: { bg: 'bg-red-100', text: 'text-red-600', label: 'Crítica' },
  LOW: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Baja' },
  MEDIUM: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Media' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Alta' },
  URGENT: { bg: 'bg-red-100', text: 'text-red-600', label: 'Urgente' },
  CRITICAL: { bg: 'bg-red-100', text: 'text-red-600', label: 'Crítica' },
};

// Colores para estados de tareas
export const taskStatusColors: Record<string, { bg: string; text: string; label: string }> = {
  TODO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Por Hacer' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Progreso' },
  REVIEW: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En Revisión' },
  BLOCKED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Bloqueada' },
  DONE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completada' },
  CANCELLED: { bg: 'bg-gray-200', text: 'text-gray-500', label: 'Cancelada' },
};

// Colores para etapas del deal
export const dealStageColors: Record<string, { bg: string; text: string; label: string; color: string }> = {
  LEAD: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Lead', color: '#6b7280' },
  QUALIFIED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Calificado', color: '#3b82f6' },
  PROPOSAL: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Propuesta', color: '#6366f1' },
  NEGOTIATION: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Negociación', color: '#8b5cf6' },
  CLOSED_WON: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ganado', color: '#10b981' },
  CLOSED_LOST: { bg: 'bg-red-100', text: 'text-red-700', label: 'Perdido', color: '#ef4444' },
};

// Tipos de cliente
export const clientTypeLabels: Record<string, string> = {
  client: 'Cliente',
  partner: 'Socio',
  supplier: 'Proveedor',
  merchant: 'Comerciante',
};

// Calcular días restantes
export function getDaysRemaining(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Generar un color aleatorio
export function generateRandomColor(): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Truncar texto
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Ordenar por fecha
export function sortByDate<T extends { createdAt: string }>(
  items: T[],
  direction: 'asc' | 'desc' = 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return direction === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

// Agrupar por campo
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const group = String(item[key]);
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// CN utility para combinar clases
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
