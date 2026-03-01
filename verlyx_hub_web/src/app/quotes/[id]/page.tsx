'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, Badge, Button, Loading } from '@/components/ui';
import { enterpriseHelpers } from '@/lib/enterprise-helpers';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  sort_order: number;
}

interface Quote {
  id: string;
  user_id: string;
  quote_number: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  // Datos de contacto inline
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_company?: string | null;
  items?: QuoteItem[];
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
};

const statusColors: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
};

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  async function loadQuote() {
    setIsLoading(true);
    const { data, error } = await enterpriseHelpers.quotes.getById(quoteId);
    
    if (error) {
      console.error('Error loading quote:', error);
      alert('Error al cargar la cotización');
      router.push('/quotes');
    } else {
      setQuote(data);
    }
    setIsLoading(false);
  }

  async function handleStatusChange(newStatus: string) {
    if (!quote) return;
    
    const { error } = await enterpriseHelpers.quotes.updateStatus(quote.id, newStatus);
    if (error) {
      alert('Error al actualizar estado: ' + error.message);
    } else {
      loadQuote();
    }
  }

  async function handleDuplicate() {
    if (!quote) return;
    
    const { data, error } = await enterpriseHelpers.quotes.duplicate(quote.id);
    if (error) {
      alert('Error al duplicar: ' + error.message);
    } else if (data) {
      router.push(`/quotes/${data.id}`);
    }
  }

  async function handleDelete() {
    if (!quote) return;
    if (!confirm('¿Estás seguro de eliminar esta cotización?')) return;
    
    const { error } = await enterpriseHelpers.quotes.delete(quote.id);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      router.push('/quotes');
    }
  }

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  if (!quote) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Cotización no encontrada</p>
        </div>
      </MainLayout>
    );
  }

  const sortedItems = [...(quote.items || [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <MainLayout>
      {/* Header - Hidden on print */}
      <div className="print:hidden">
        <PageHeader
          title={quote.quote_number}
          description={quote.title}
          backHref="/quotes"
          actions={
            <div className="flex items-center gap-2">
              {quote.status === 'draft' && (
                <Button onClick={() => handleStatusChange('sent')}>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Marcar como Enviada
                </Button>
              )}
              {quote.status === 'sent' && (
                <>
                  <Button
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleStatusChange('accepted')}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Aceptada
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleStatusChange('rejected')}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rechazada
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handlePrint}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir / PDF
              </Button>
              <Button variant="outline" onClick={handleDuplicate}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicar
              </Button>
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={handleDelete}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          }
        />

        {/* Status Banner */}
        <div className={cn(
          'mb-6 p-4 rounded-lg flex items-center justify-between',
          quote.status === 'draft' && 'bg-gray-100',
          quote.status === 'sent' && 'bg-blue-50',
          quote.status === 'accepted' && 'bg-green-50',
          quote.status === 'rejected' && 'bg-red-50',
          quote.status === 'expired' && 'bg-orange-50',
        )}>
          <div className="flex items-center gap-3">
            <Badge variant={statusColors[quote.status]} className="text-sm px-3 py-1">
              {statusLabels[quote.status]}
            </Badge>
            {quote.valid_until && (
              <span className={cn(
                'text-sm',
                new Date(quote.valid_until) < new Date() ? 'text-red-600' : 'text-gray-600'
              )}>
                {new Date(quote.valid_until) < new Date() ? 'Expiró el ' : 'Válida hasta '}
                {formatDate(quote.valid_until)}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Creada: {formatDate(quote.created_at)}
            {quote.sent_at && ` • Enviada: ${formatDate(quote.sent_at)}`}
            {quote.accepted_at && ` • Aceptada: ${formatDate(quote.accepted_at)}`}
            {quote.rejected_at && ` • Rechazada: ${formatDate(quote.rejected_at)}`}
          </div>
        </div>
      </div>

      {/* Quote Document - Printable */}
      <div ref={printRef} className="print:p-0">
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-8 print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b">
              <div>
                <h1 className="text-3xl font-bold text-indigo-600 mb-2">COTIZACIÓN</h1>
                <p className="text-gray-500 font-mono">{quote.quote_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Fecha de emisión</p>
                <p className="font-medium">{formatDate(quote.created_at)}</p>
                {quote.valid_until && (
                  <>
                    <p className="text-sm text-gray-500 mt-2">Válida hasta</p>
                    <p className={cn(
                      'font-medium',
                      new Date(quote.valid_until) < new Date() && 'text-red-600'
                    )}>
                      {formatDate(quote.valid_until)}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Client Info */}
            {quote.contact_name && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Cliente</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900">
                    {quote.contact_name}
                  </p>
                  {quote.contact_company && (
                    <p className="text-gray-600">{quote.contact_company}</p>
                  )}
                  {quote.contact_email && (
                    <p className="text-gray-600">{quote.contact_email}</p>
                  )}
                  {quote.contact_phone && (
                    <p className="text-gray-600">{quote.contact_phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900">{quote.title}</h2>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 text-sm font-semibold text-gray-700">Descripción</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 w-20">Cant.</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 w-28">P. Unit.</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 w-20">Desc.</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 w-28">Subtotal</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 w-20">IVA</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-700 w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item, index) => (
                    <tr key={item.id} className={cn('border-b', index % 2 === 0 && 'bg-gray-50')}>
                      <td className="py-3 text-gray-900">{item.description}</td>
                      <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600">{formatCurrency(item.unit_price, quote.currency)}</td>
                      <td className="py-3 text-right text-gray-600">{item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}</td>
                      <td className="py-3 text-right text-gray-600">{formatCurrency(item.subtotal, quote.currency)}</td>
                      <td className="py-3 text-right text-gray-600">{item.tax_rate}%</td>
                      <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.total, quote.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-72">
                <div className="flex justify-between py-2 text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
                </div>
                <div className="flex justify-between py-2 text-gray-600">
                  <span>IVA</span>
                  <span>{formatCurrency(quote.tax_amount, quote.currency)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-gray-900 text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(quote.total, quote.currency)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notas</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              </div>
            )}

            {/* Terms */}
            {quote.terms && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Términos y Condiciones</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{quote.terms}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500 print:mt-8">
              <p>Gracias por su confianza. Para cualquier duda o aclaración, estamos a sus órdenes.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-0,
          .print\\:p-0 * {
            visibility: visible;
          }
          .print\\:p-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-0 {
            border: none !important;
          }
        }
      `}</style>
    </MainLayout>
  );
}
