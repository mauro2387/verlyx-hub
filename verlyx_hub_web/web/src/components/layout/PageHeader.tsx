'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backHref, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link href={backHref}>
              <Button variant="ghost" size="sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
