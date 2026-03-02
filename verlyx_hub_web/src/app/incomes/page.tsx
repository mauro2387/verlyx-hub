'use client';

import { useEffect, useState, useMemo } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Loading, Modal, Input, Select, Textarea, StatCard, SearchInput, Badge, ConfirmDialog } from '@/components/ui';
import { useIncomesStore, useCategoriesStore, useAccountsStore, useClientsStore, useProjectsStore, useCompanyStore } from '@/lib/store';
import { Income } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

type ViewMode = 'table' | 'cards' | 'stats';

export default function IncomesPage() {
  const { incomes, isLoading, fetchIncomes, addIncome, updateIncome, deleteIncome, markIncomePaid, generateRecurringIncomes, filter, setFilter, getFilteredIncomes, getTotalIncomes, getOverdueIncomes } = useIncomesStore();
  const { categories, fetchCategories, getCategoriesByType } = useCategoriesStore();
  const { accounts, fetchAccounts } = useAccountsStore();
  const { clients, fetchClients } = useClientsStore();
  const { projects, fetchProjects } = useProjectsStore();
  const { selectedCompanyId } = useCompanyStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  const [showStats, setShowStats] = useState(true);
  
  // Payment/receipt dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingIncome, setPayingIncome] = useState<Income | null>(null);
  const [payFormData, setPayFormData] = useState({ paymentMethod: 'transfer', receiptUrl: '' });
  const [isPaySubmitting, setIsPaySubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'UYU',
    categoryId: '',
    clientId: '',
    clientName: '',
    accountId: '',
    paymentMethod: 'transfer',
    paymentDate: '',
    dueDate: '',
    invoiceNumber: '',
    invoiceDate: '',
    projectId: '',
    notes: '',
    status: 'pending' as 'pending' | 'received' | 'cancelled' | 'overdue',
    isRecurring: false,
    recurringFrequency: '',
  });

  useEffect(() => {
    fetchIncomes();
    fetchCategories();
    fetchAccounts();
    fetchClients();
    fetchProjects();
    // Auto-generate any pending recurring incomes
    generateRecurringIncomes();
  }, [fetchIncomes, fetchCategories, fetchAccounts, fetchClients, fetchProjects, generateRecurringIncomes]);

  const filteredIncomes = getFilteredIncomes();
  const overdueIncomes = getOverdueIncomes();
  const incomeCategories = getCategoriesByType('income');

  // Estadísticas
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthIncomes = incomes.filter(i => {
      const date = i.paymentDate ? new Date(i.paymentDate) : null;
      return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const pending = incomes.filter(i => i.status === 'pending');
    const received = incomes.filter(i => i.status === 'received');
    const overdue = incomes.filter(i => {
      if (i.status !== 'pending' || !i.dueDate) return false;
      return new Date(i.dueDate) < new Date();
    });

    const thisMonthTotal = thisMonthIncomes.reduce((sum, i) => sum + i.amount, 0);
    const pendingTotal = pending.reduce((sum, i) => sum + i.amount, 0);
    const receivedTotal = received.reduce((sum, i) => sum + i.amount, 0);

    return {
      total: incomes.length,
      thisMonth: thisMonthIncomes.length,
      thisMonthTotal,
      pending: pending.length,
      pendingTotal,
      received: received.length,
      receivedTotal,
      overdue: overdue.length,
      overdueTotal: overdue.reduce((sum, i) => sum + i.amount, 0),
      totalAmount: incomes.reduce((sum, i) => sum + i.amount, 0),
    };
  }, [incomes]);

  // Ingresos por categoría
  const incomesByCategory = useMemo(() => {
    const grouped: Record<string, { name: string; amount: number; count: number; color: string }> = {};
    
    filteredIncomes.forEach(income => {
      const category = income.category;
      const key = category?.id || 'sin-categoria';
      const name = category?.name || 'Sin categoría';
      
      if (!grouped[key]) {
        grouped[key] = {
          name,
          amount: 0,
          count: 0,
          color: category?.color || '#9CA3AF',
        };
      }
      
      grouped[key].amount += income.amount;
      grouped[key].count += 1;
    });
    
    return Object.values(grouped).sort((a, b) => b.amount - a.amount);
  }, [filteredIncomes]);

  const handleOpenModal = (income?: Income) => {
    if (income) {
      setEditingIncome(income);
      setFormData({
        description: income.description,
        amount: income.amount.toString(),
        currency: income.currency,
        categoryId: income.categoryId || '',
        clientId: income.clientId || '',
        clientName: income.clientName || '',
        accountId: income.accountId || '',
        paymentMethod: income.paymentMethod || 'transfer',
        paymentDate: income.paymentDate || '',
        dueDate: income.dueDate || '',
        invoiceNumber: income.invoiceNumber || '',
        invoiceDate: income.invoiceDate || '',
        projectId: income.projectId || '',
        notes: income.notes || '',
        status: income.status,
        isRecurring: income.isRecurring,
        recurringFrequency: income.recurringFrequency || '',
      });
    } else {
      setEditingIncome(null);
      setFormData({
        description: '',
        amount: '',
        currency: 'UYU',
        categoryId: '',
        clientId: '',
        clientName: '',
        accountId: '',
        paymentMethod: 'transfer',
        paymentDate: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        projectId: '',
        notes: '',
        status: 'pending',
        isRecurring: false,
        recurringFrequency: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId) {
      alert('Selecciona una empresa activa primero');
      return;
    }

    const incomeData = {
      myCompanyId: selectedCompanyId,
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      categoryId: formData.categoryId || undefined,
      clientId: formData.clientId || undefined,
      clientName: formData.clientName || undefined,
      accountId: formData.accountId || undefined,
      paymentMethod: formData.paymentMethod || undefined,
      paymentDate: formData.paymentDate || undefined,
      dueDate: formData.dueDate || undefined,
      invoiceNumber: formData.invoiceNumber || undefined,
      invoiceDate: formData.invoiceDate || undefined,
      projectId: formData.projectId || undefined,
      notes: formData.notes || undefined,
      status: formData.status,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
    };

    if (editingIncome) {
      await updateIncome(editingIncome.id, incomeData);
    } else {
      await addIncome(incomeData);
    }
    
    setIsModalOpen(false);
    setEditingIncome(null);
  };

  const handleDelete = async () => {
    if (incomeToDelete) {
      await deleteIncome(incomeToDelete.id);
      setDeleteDialogOpen(false);
      setIncomeToDelete(null);
    }
  };

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
        title="💰 Ingresos"
        description="Gestiona facturas, cobros e ingresos de la empresa"
        actions={
          <Button onClick={() => handleOpenModal()}>
            ➕ Nuevo Ingreso
          </Button>
        }
      />

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Total Ingresos"
            value={stats.total}
            description={formatCurrency(stats.totalAmount)}
            color="green"
          />
          <StatCard
            title="Este Mes"
            value={stats.thisMonth}
            description={formatCurrency(stats.thisMonthTotal)}
            color="green"
          />
          <StatCard
            title="Por Cobrar"
            value={stats.pending}
            description={formatCurrency(stats.pendingTotal)}
            color="orange"
          />
          <StatCard
            title="Cobrados"
            value={stats.received}
            description={formatCurrency(stats.receivedTotal)}
            color="blue"
          />
          <StatCard
            title="Vencidos"
            value={stats.overdue}
            description={formatCurrency(stats.overdueTotal)}
            color="red"
          />
        </div>
      )}

      {/* Overdue Alert Banner */}
      {overdueIncomes.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-lg">
              ⚠️
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">
                {overdueIncomes.length} pago{overdueIncomes.length > 1 ? 's' : ''} vencido{overdueIncomes.length > 1 ? 's' : ''} sin cobrar
              </h3>
              <p className="text-sm text-red-600 mt-1">
                Total pendiente vencido: {formatCurrency(overdueIncomes.reduce((s, i) => s + i.amount, 0))}
              </p>
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {overdueIncomes.map((income) => {
                  const daysOverdue = income.dueDate ? Math.floor((Date.now() - new Date(income.dueDate).getTime()) / 86400000) : 0;
                  return (
                    <div key={income.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-100">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{income.description}</span>
                        {income.clientName && <span className="text-sm text-gray-500 ml-2">({income.clientName})</span>}
                        <span className="text-xs text-red-600 ml-2">{daysOverdue} días vencido</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(income.amount, income.currency)}</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setPayingIncome(income);
                            setPayFormData({ paymentMethod: 'transfer', receiptUrl: '' });
                            setPayDialogOpen(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          Marcar Pagado
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SearchInput
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Buscar ingresos..."
            />
            
            <Select
              value={filter.categoryId || ''}
              onChange={(e) => setFilter({ categoryId: e.target.value || null })}
              options={[
                { value: '', label: 'Todas las categorías' },
                ...incomeCategories.map(cat => ({
                  value: cat.id,
                  label: `${cat.icon} ${cat.name}`,
                })),
              ]}
            />

            <Select
              value={filter.status || ''}
              onChange={(e) => setFilter({ status: e.target.value || null })}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'pending', label: '⏳ Pendiente' },
                { value: 'received', label: '✓ Cobrado' },
                { value: 'overdue', label: '⚠️ Vencido' },
                { value: 'cancelled', label: '✗ Cancelado' },
              ]}
            />

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'primary' : 'outline'}
                onClick={() => setViewMode('table')}
                className="flex-1"
              >
                📋 Tabla
              </Button>
              <Button
                variant={viewMode === 'stats' ? 'primary' : 'outline'}
                onClick={() => setViewMode('stats')}
                className="flex-1"
              >
                📊 Stats
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === 'table' && (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Descripción</th>
                    <th className="text-left py-3 px-4">Cliente</th>
                    <th className="text-left py-3 px-4">Categoría</th>
                    <th className="text-right py-3 px-4">Monto</th>
                    <th className="text-center py-3 px-4">Estado</th>
                    <th className="text-center py-3 px-4">Vencimiento</th>
                    <th className="text-center py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        No hay ingresos registrados
                      </td>
                    </tr>
                  ) : (
                    filteredIncomes.map((income) => {
                      const isOverdue = income.status === 'pending' && income.dueDate && new Date(income.dueDate) < new Date();
                      
                      return (
                        <tr key={income.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm">
                            {income.paymentDate ? formatDate(income.paymentDate) : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{income.description}</div>
                            {income.invoiceNumber && (
                              <div className="text-sm text-gray-500">Fact: {income.invoiceNumber}</div>
                            )}
                            {income.isRecurring && (
                              <div className="text-xs text-blue-500 mt-0.5">🔄 Recurrente ({income.recurringFrequency === 'monthly' ? 'Mensual' : income.recurringFrequency === 'quarterly' ? 'Trimestral' : income.recurringFrequency})</div>
                            )}
                            {income.isDevelopmentPayment && (
                              <div className="text-xs text-amber-600 mt-0.5">💻 Pago de desarrollo</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {income.clientName || '-'}
                          </td>
                          <td className="py-3 px-4">
                            {income.category && (
                              <Badge variant="default">
                                {income.category.icon} {income.category.name}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">
                            {formatCurrency(income.amount, income.currency)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={
                              income.status === 'received' ? 'success' :
                              isOverdue ? 'danger' :
                              income.status === 'pending' ? 'warning' :
                              'default'
                            }>
                              {income.status === 'received' ? '✓ Cobrado' :
                               isOverdue ? '⚠️ Vencido' :
                               income.status === 'pending' ? '⏳ Pendiente' :
                               '✗ Cancelado'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-sm">
                            {income.dueDate ? (
                              <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                                {formatDate(income.dueDate)}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex gap-2 justify-center">
                              {income.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPayingIncome(income);
                                    setPayFormData({ paymentMethod: 'transfer', receiptUrl: '' });
                                    setPayDialogOpen(true);
                                  }}
                                  title="Marcar como cobrado"
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                >
                                  💰 Cobrar
                                </Button>
                              )}
                              {income.status === 'received' && income.receiptUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(income.receiptUrl!, '_blank')}
                                  title="Ver recibo"
                                >
                                  🧾
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenModal(income)}
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIncomeToDelete(income);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ingresos por categoría */}
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">📊 Ingresos por Categoría</h3>
              <div className="space-y-4">
                {incomesByCategory.map((cat, index) => {
                  const percentage = (cat.amount / getTotalIncomes()) * 100;
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{cat.name}</span>
                        <span className="text-sm font-semibold">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">{cat.count} ingresos</span>
                        <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top 10 ingresos */}
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">🔝 Top 10 Ingresos</h3>
              <div className="space-y-3">
                {[...filteredIncomes]
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 10)
                  .map((income, index) => (
                    <div key={income.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{income.description}</div>
                        <div className="text-sm text-gray-500">{income.clientName || 'Sin cliente'}</div>
                      </div>
                      <div className="flex-shrink-0 font-semibold text-green-600">
                        {formatCurrency(income.amount)}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Próximos vencimientos */}
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">⏰ Próximos Vencimientos</h3>
              <div className="space-y-3">
                {incomes
                  .filter(i => i.status === 'pending' && i.dueDate)
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .slice(0, 10)
                  .map((income) => {
                    const isOverdue = new Date(income.dueDate!) < new Date();
                    const daysUntilDue = Math.ceil((new Date(income.dueDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={income.id} className={`flex items-center gap-3 p-3 rounded ${isOverdue ? 'bg-red-50' : 'bg-yellow-50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{income.description}</div>
                          <div className="text-sm text-gray-500">
                            {income.clientName} • Vence {formatDate(income.dueDate!)}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="font-semibold">{formatCurrency(income.amount)}</div>
                          <div className={`text-xs ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
                            {isOverdue ? `Vencido hace ${Math.abs(daysUntilDue)} días` : `${daysUntilDue} días`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {incomes.filter(i => i.status === 'pending' && i.dueDate).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay pagos pendientes con vencimiento
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Formulario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingIncome(null);
        }}
        title={editingIncome ? 'Editar Ingreso' : 'Nuevo Ingreso'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Básica */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">📝 Información Básica</h3>
            
            <Input
              label="Descripción *"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Ej: Pago por servicio de diseño"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Monto *"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
              />
              
              <Select
                label="Moneda"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                options={[
                  { value: 'UYU', label: 'UYU (Pesos Uruguayos)' },
                  { value: 'USD', label: 'USD (Dólares)' },
                  { value: 'EUR', label: 'EUR (Euros)' },
                ]}
              />
            </div>

            <Select
              label="Categoría"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              options={[
                { value: '', label: 'Sin categoría' },
                ...incomeCategories.map(cat => ({
                  value: cat.id,
                  label: `${cat.icon} ${cat.name}`,
                })),
              ]}
            />
          </div>

          {/* Cliente */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">👤 Cliente</h3>
            
            <Select
              label="Cliente"
              value={formData.clientId}
              onChange={(e) => {
                const client = clients.find(c => c.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  clientId: e.target.value,
                  clientName: client?.name || ''
                });
              }}
              options={[
                { value: '', label: 'Seleccionar cliente' },
                ...clients.map(client => ({
                  value: client.id,
                  label: `${client.name}${client.email ? ` (${client.email})` : ''}`,
                })),
              ]}
            />

            <Input
              label="Nombre del Cliente (manual)"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="O escribir manualmente"
            />
          </div>

          {/* Factura y Fechas */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">📄 Factura y Fechas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Número de Factura"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="Ej: A-001234"
              />

              <Input
                label="Fecha de Factura"
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Fecha de Cobro"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />

              <Input
                label="Fecha de Vencimiento"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Pago */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">💳 Información de Pago</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Método de Pago"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                options={[
                  { value: 'cash', label: '💵 Efectivo' },
                  { value: 'transfer', label: '🏦 Transferencia' },
                  { value: 'card', label: '💳 Tarjeta' },
                  { value: 'mercadopago', label: '💙 MercadoPago' },
                  { value: 'check', label: '📄 Cheque' },
                ]}
              />

              <Select
                label="Cuenta"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                options={[
                  { value: '', label: 'Seleccionar cuenta' },
                  ...accounts.map(acc => ({
                    value: acc.id,
                    label: `${acc.icon} ${acc.name} - ${formatCurrency(acc.currentBalance)}`,
                  })),
                ]}
              />
            </div>

            <Select
              label="Estado"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'pending', label: '⏳ Pendiente' },
                { value: 'received', label: '✓ Cobrado' },
                { value: 'overdue', label: '⚠️ Vencido' },
                { value: 'cancelled', label: '✗ Cancelado' },
              ]}
            />
          </div>

          {/* Proyecto */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">📂 Relaciones</h3>
            
            <Select
              label="Proyecto Relacionado"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              options={[
                { value: '', label: 'Sin proyecto' },
                ...projects.map(proj => ({
                  value: proj.id,
                  label: proj.name,
                })),
              ]}
            />

            <Textarea
              label="Notas"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Notas adicionales..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" variant="primary" className="flex-1">
              {editingIncome ? 'Guardar Cambios' : 'Crear Ingreso'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingIncome(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Ingreso"
        message={`¿Estás seguro de que deseas eliminar el ingreso "${incomeToDelete?.description}"?`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Mark as Paid / Receipt Upload Dialog */}
      <Modal
        isOpen={payDialogOpen}
        onClose={() => { setPayDialogOpen(false); setPayingIncome(null); }}
        title="Registrar Pago"
        size="md"
      >
        {payingIncome && (
          <div className="space-y-4">
            {/* Payment summary */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-green-800">{payingIncome.description}</p>
                  {payingIncome.clientName && (
                    <p className="text-sm text-green-600">Cliente: {payingIncome.clientName}</p>
                  )}
                </div>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(payingIncome.amount, payingIncome.currency)}
                </p>
              </div>
              {payingIncome.dueDate && (
                <p className="text-sm text-green-600 mt-2">
                  Vencimiento: {formatDate(payingIncome.dueDate)}
                  {new Date(payingIncome.dueDate) < new Date() && (
                    <span className="text-red-600 font-semibold ml-2">
                      ({Math.floor((Date.now() - new Date(payingIncome.dueDate).getTime()) / 86400000)} días vencido)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Payment method */}
            <Select
              label="Método de Pago"
              value={payFormData.paymentMethod}
              onChange={(e) => setPayFormData({ ...payFormData, paymentMethod: e.target.value })}
              options={[
                { value: 'transfer', label: '🏦 Transferencia' },
                { value: 'cash', label: '💵 Efectivo' },
                { value: 'card', label: '💳 Tarjeta' },
                { value: 'mercadopago', label: '📱 MercadoPago' },
                { value: 'check', label: '📝 Cheque' },
              ]}
            />

            {/* Receipt upload section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🧾 Subir Recibo / Comprobante</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Input
                  type="url"
                  placeholder="URL del recibo (Google Drive, Dropbox, etc.)"
                  value={payFormData.receiptUrl}
                  onChange={(e) => setPayFormData({ ...payFormData, receiptUrl: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Pegá el enlace al comprobante de pago (imagen, PDF, etc.)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => { setPayDialogOpen(false); setPayingIncome(null); }}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  setIsPaySubmitting(true);
                  await markIncomePaid(payingIncome.id, payFormData.receiptUrl || null, payFormData.paymentMethod);
                  setIsPaySubmitting(false);
                  setPayDialogOpen(false);
                  setPayingIncome(null);
                }}
                disabled={isPaySubmitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isPaySubmitting ? 'Procesando...' : '✓ Confirmar Pago'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
