'use client';

import { useCompanyStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface CompanyBadgeProps {
  companyId?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/**
 * Displays a colored badge with the company name for multi-company consolidated views.
 * Resolves the company name from the store using the companyId.
 */
export function CompanyBadge({ companyId, size = 'xs', className }: CompanyBadgeProps) {
  const { companies } = useCompanyStore();

  if (!companyId) return null;

  const company = companies.find((c) => c.id === companyId);
  if (!company) return null;

  // If only 1 company, don't show the badge — it's redundant
  if (companies.length <= 1) return null;

  const colors = getCompanyColor(company.primaryColor || '#6366f1');

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        size === 'xs' && 'px-1.5 py-0.5 text-[10px] leading-3',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        borderWidth: 1,
      }}
      title={company.name}
    >
      {company.name}
    </span>
  );
}

function getCompanyColor(hex: string) {
  return {
    bg: `${hex}15`,
    text: hex,
    border: `${hex}30`,
  };
}

/**
 * Hook to get a company name from an ID. 
 * Useful when you need just the name string, not a badge component.
 */
export function useCompanyName(companyId?: string | null): string | null {
  const { companies } = useCompanyStore();
  if (!companyId) return null;
  return companies.find((c) => c.id === companyId)?.name || null;
}
