'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { MainLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, Badge, Button, Loading, Input, Select } from '@/components/ui';
import { enterpriseHelpers } from '@/lib/enterprise-helpers';
import { useAuthStore } from '@/lib/store';
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
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
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

export default function QuotesPage() {
  const { user } = useAuthStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'status'>('date');

  useEffect(() => {
    loadQuotes();
  }, [user]);

  async function loadQuotes() {
    if (!user?.id) return;
    
    setIsLoading(true);
    const { data, error } = await enterpriseHelpers.quotes.getAll(user.id);
    
    if (error) {
      console.error('Error loading quotes:', error);
    } else {
      setQuotes(data || []);
    }
    setIsLoading(false);
  }

  const filteredQuotes = useMemo(() => {
    let result = [...quotes];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(q => 
        q.title.toLowerCase().includes(term) ||
        q.quote_number.toLowerCase().includes(term) ||
        q.contact_name?.toLowerCase().includes(term) ||
        q.contact_company?.toLowerCase().includes(term)
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(q => q.status === statusFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'total':
          return b.total - a.total;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return result;
  }, [quotes, searchTerm, statusFilter, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = quotes.reduce((sum, q) => sum + q.total, 0);
    const accepted = quotes.filter(q => q.status === 'accepted');
    const acceptedTotal = accepted.reduce((sum, q) => sum + q.total, 0);
    const pending = quotes.filter(q => q.status === 'sent');
    const pendingTotal = pending.reduce((sum, q) => sum + q.total, 0);
    
    return {
      totalCount: quotes.length,
      totalValue: total,
      acceptedCount: accepted.length,
      acceptedValue: acceptedTotal,
      pendingCount: pending.length,
      pendingValue: pendingTotal,
      conversionRate: quotes.filter(q => ['sent', 'accepted', 'rejected'].includes(q.status)).length > 0
        ? Math.round((accepted.length / quotes.filter(q => ['sent', 'accepted', 'rejected'].includes(q.status)).length) * 100)
        : 0,
    };
  }, [quotes]);

  async function handleDuplicate(quoteId: string) {
    const { error } = await enterpriseHelpers.quotes.duplicate(quoteId);
    if (error) {
      alert('Error al duplicar: ' + error.message);
    } else {
      loadQuotes();
    }
  }

  async function handleDelete(quoteId: string) {
    if (!confirm('¿Estás seguro de eliminar esta cotización?')) return;
    
    const { error } = await enterpriseHelpers.quotes.delete(quoteId);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      loadQuotes();
    }
  }

  async function handleStatusChange(quoteId: string, newStatus: string) {
    const { error } = await enterpriseHelpers.quotes.updateStatus(quoteId, newStatus);
    if (error) {
      alert('Error al actualizar estado: ' + error.message);
    } else {
      loadQuotes();
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Cotizaciones"
        description="Gestiona tus propuestas y presupuestos"
        actions={
          <Link href="/quotes/new">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Cotización
            </Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Total Cotizaciones</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCount}</p>
            <p className="text-xs text-gray-400">{formatCurrency(stats.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Aceptadas</p>
            <p className="text-2xl font-bold text-green-600">{stats.acceptedCount}</p>
            <p className="text-xs text-gray-400">{formatCurrency(stats.acceptedValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-blue-600">{stats.pendingCount}</p>
            <p className="text-xs text-gray-400">{formatCurrency(stats.pendingValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Tasa Conversión</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.conversionRate}%</p>
            <p className="text-xs text-gray-400">aceptadas vs enviadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            placeholder="Buscar por título, número, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Todos los estados' },
            { value: 'draft', label: 'Borrador' },
            { value: 'sent', label: 'Enviada' },
            { value: 'accepted', label: 'Aceptada' },
            { value: 'rejected', label: 'Rechazada' },
            { value: 'expired', label: 'Expirada' },
          ]}
        />
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'total' | 'status')}
          options={[
            { value: 'date', label: 'Más recientes' },
            { value: 'total', label: 'Mayor valor' },
            { value: 'status', label: 'Por estado' },
          ]}
        />
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cotizaciones</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron cotizaciones con los filtros aplicados'
                : 'Crea tu primera cotización para enviar a tus clientes'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link href="/quotes/new">
                <Button>Crear Cotización</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} hoverable>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Quote Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/quotes/${quote.id}`} className="hover:underline">
                        <h3 className="font-semibold text-gray-900 truncate">{quote.title}</h3>
                      </Link>
                      <Badge variant={statusColors[quote.status]}>
                        {statusLabels[quote.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="font-mono">{quote.quote_number}</span>
                      {quote.contact_name && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {quote.contact_name}
                          {quote.contact_company && ` - ${quote.contact_company}`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(quote.created_at)}
                      </span>
                      {quote.valid_until && (
                        <span className={cn(
                          'flex items-center gap-1',
                          new Date(quote.valid_until) < new Date() && 'text-red-500'
                        )}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Válida hasta {formatDate(quote.valid_until)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(quote.total, quote.currency)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(quote.items?.length || 0)} items
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/quotes/${quote.id}`}>
                      <Button variant="outline" size="sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Button>
                    </Link>
                    
                    {quote.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(quote.id, 'sent')}
                        title="Marcar como enviada"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </Button>
                    )}
                    
                    {quote.status === 'sent' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleStatusChange(quote.id, 'accepted')}
                          title="Marcar como aceptada"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleStatusChange(quote.id, 'rejected')}
                          title="Marcar como rechazada"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(quote.id)}
                      title="Duplicar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(quote.id)}
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
