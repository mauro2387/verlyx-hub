'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// Badge Component
interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={cn('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

// Status Badge (para proyectos, tareas, etc.)
interface StatusBadgeProps {
  status: string;
  statusConfig: Record<string, { bg: string; text: string; label: string }>;
  className?: string;
}

export function StatusBadge({ status, statusConfig, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full', config.bg, config.text, className)}>
      {config.label}
    </span>
  );
}

// Priority Badge
interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const configs: Record<string, { bg: string; text: string; icon: string }> = {
    low: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '↓' },
    LOW: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '↓' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-600', icon: '→' },
    MEDIUM: { bg: 'bg-blue-100', text: 'text-blue-600', icon: '→' },
    high: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '↑' },
    HIGH: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '↑' },
    critical: { bg: 'bg-red-100', text: 'text-red-600', icon: '⚠' },
    CRITICAL: { bg: 'bg-red-100', text: 'text-red-600', icon: '⚠' },
    URGENT: { bg: 'bg-red-100', text: 'text-red-600', icon: '⚠' },
  };

  const config = configs[priority] || configs.medium;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full', config.bg, config.text, className)}>
      <span>{config.icon}</span>
      {priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()}
    </span>
  );
}

// Tag Component
interface TagProps {
  children: ReactNode;
  color?: string;
  onRemove?: () => void;
  className?: string;
}

export function Tag({ children, color, onRemove, className }: TagProps) {
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md',
        'bg-gray-100 text-gray-700 border border-gray-200',
        className
      )}
      style={color ? { backgroundColor: `${color}20`, color, borderColor: `${color}40` } : undefined}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-70"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
