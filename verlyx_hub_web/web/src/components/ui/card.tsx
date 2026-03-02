'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// Card Component
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
        hoverable && 'transition-shadow hover:shadow-md cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

// Card Header
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100', className)}>
      {children}
    </div>
  );
}

// Card Content
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

// Card Footer
interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-100 bg-gray-50', className)}>
      {children}
    </div>
  );
}

// Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; isPositive: boolean };
  description?: string;
  color?: 'indigo' | 'green' | 'blue' | 'orange' | 'red' | 'purple';
}

export function StatCard({ title, value, icon, trend, description, color = 'indigo' }: StatCardProps) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={cn('mt-2 text-sm flex items-center gap-1', trend.isPositive ? 'text-green-600' : 'text-red-600')}>
              {trend.isPositive ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend.value}%
            </p>
          )}
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', colors[color])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// Empty State Card
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="p-4 bg-gray-100 rounded-full mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
