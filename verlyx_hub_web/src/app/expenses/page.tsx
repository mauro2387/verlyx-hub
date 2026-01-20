'use client';

import { useEffect, useState, useMemo } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Loading, Modal, Input, Select, Textarea, StatCard, SearchInput, Badge, ConfirmDialog } from '@/components/ui';
import { useExpensesStore, useCategoriesStore, useAccountsStore, useProjectsStore, useCompanyStore } from '@/lib/store';
import { Expense, Category } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

type ViewMode = 'table' | 'cards' | 'stats';

export default function ExpensesPage() {
  const { expenses, isLoading, fetchExpenses, addExpense, updateExpense, deleteExpense, filter, setFilter, getFilteredExpenses, getTotalExpenses } = useExpensesStore();
  const { categories, fetchCategories, getCategoriesByType } = useCategoriesStore();
  const { accounts, fetchAccounts } = useAccountsStore();
  const { projects, fetchProjects } = useProjectsStore();
  const { selectedCompanyId } = useCompanyStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [showStats, setShowStats] = useState(true);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'UYU',
    categoryId: '',
    supplierName: '',
    supplierTaxId: '',
    accountId: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    invoiceDate: '',
    projectId: '',
    notes: '',
    status: 'paid' as 'paid' | 'pending' | 'cancelled',
    isRecurring: false,
    recurringFrequency: '',
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchAccounts();
    fetchProjects();
  }, [fetchExpenses, fetchCategories, fetchAccounts, fetchProjects]);

  const filteredExpenses = getFilteredExpenses();
  const expenseCategories = getCategoriesByType('expense');

  // Estadísticas
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthExpenses = expenses.filter(e => {
      const date = new Date(e.paymentDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const lastMonthExpenses = expenses.filter(e => {
      const date = new Date(e.paymentDate);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const trend = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return {
      total: expenses.length,
      thisMonth: thisMonthExpenses.length,
      thisMonthTotal,
      pending: expenses.filter(e => e.status === 'pending').length,
      totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
      trend,
    };
  }, [expenses]);

  // Gastos por categoría
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { name: string; amount: number; count: number; color: string }> = {};
    
    filteredExpenses.forEach(expense => {
      const category = expense.category;
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
      
      grouped[key].amount += expense.amount;
      grouped[key].count += 1;
    });
    
    return Object.values(grouped).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        currency: expense.currency,
        categoryId: expense.categoryId || '',
        supplierName: expense.supplierName || '',
        supplierTaxId: expense.supplierTaxId || '',
        accountId: expense.accountId || '',
        paymentMethod: expense.paymentMethod || 'cash',
        paymentDate: expense.paymentDate,
        invoiceNumber: expense.invoiceNumber || '',
        invoiceDate: expense.invoiceDate || '',
        projectId: expense.projectId || '',
        notes: expense.notes || '',
        status: expense.status,
        isRecurring: expense.isRecurring,
        recurringFrequency: expense.recurringFrequency || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        description: '',
        amount: '',
        currency: 'UYU',
        categoryId: '',
        supplierName: '',
        supplierTaxId: '',
        accountId: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        invoiceDate: '',
        projectId: '',
        notes: '',
        status: 'paid',
        isRecurring: false,
        recurringFrequency: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const expenseData = {
      myCompanyId: selectedCompanyId || 'demo-company-1',
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      categoryId: formData.categoryId || undefined,
      supplierName: formData.supplierName || undefined,
      supplierTaxId: formData.supplierTaxId || undefined,
      accountId: formData.accountId || undefined,
      paymentMethod: formData.paymentMethod || undefined,
      paymentDate: formData.paymentDate,
      invoiceNumber: formData.invoiceNumber || undefined,
      invoiceDate: formData.invoiceDate || undefined,
      projectId: formData.projectId || undefined,
      notes: formData.notes || undefined,
      status: formData.status,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
    };

    if (editingExpense) {
      await updateExpense(editingExpense.id, expenseData);
    } else {
      await addExpense(expenseData);
    }
    
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleDelete = async () => {
    if (expenseToDelete) {
      await deleteExpense(expenseToDelete.id);
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
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
        title="💸 Gastos"
        description="Gestiona todos los gastos de la empresa"
        action={
          <Button onClick={() => handleOpenModal()}>
            ➕ Nuevo Gasto
          </Button>
        }
      />

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Total Gastos"
            value={stats.total}
            description={formatCurrency(stats.totalAmount)}
            color="red"
          />
          <StatCard
            title="Este Mes"
            value={stats.thisMonth}
            description={formatCurrency(stats.thisMonthTotal)}
            color="orange"
            trend={stats.trend}
          />
          <StatCard
            title="Pendientes"
            value={stats.pending}
            color="yellow"
          />
          <StatCard
            title="Promedio"
            value={formatCurrency(stats.totalAmount / (stats.total || 1))}
            description="por gasto"
            color="blue"
          />
          <StatCard
            title="Filtrados"
            value={filteredExpenses.length}
            description={formatCurrency(getTotalExpenses())}
            color="purple"
          />
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SearchInput
              value={filter.search}
              onChange={(value) => setFilter({ search: value })}
              placeholder="Buscar gastos..."
            />
            
            <Select
              value={filter.categoryId || ''}
              onChange={(e) => setFilter({ categoryId: e.target.value || null })}
            >
              <option value="">Todas las categorías</option>
              {expenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </Select>

            <Select
              value={filter.status || ''}
              onChange={(e) => setFilter({ status: e.target.value || null })}
            >
              <option value="">Todos los estados</option>
              <option value="paid">Pagado</option>
              <option value="pending">Pendiente</option>
              <option value="cancelled">Cancelado</option>
            </Select>

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
                    <th className="text-left py-3 px-4">Categoría</th>
                    <th className="text-left py-3 px-4">Proveedor</th>
                    <th className="text-right py-3 px-4">Monto</th>
                    <th className="text-center py-3 px-4">Estado</th>
                    <th className="text-center py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        No hay gastos registrados
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">
                          {formatDate(expense.paymentDate)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{expense.description}</div>
                          {expense.invoiceNumber && (
                            <div className="text-sm text-gray-500">Fact: {expense.invoiceNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {expense.category && (
                            <Badge style={{ backgroundColor: expense.category.color }}>
                              {expense.category.icon} {expense.category.name}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {expense.supplierName || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600">
                          {formatCurrency(expense.amount, expense.currency)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={
                            expense.status === 'paid' ? 'success' :
                            expense.status === 'pending' ? 'warning' :
                            'danger'
                          }>
                            {expense.status === 'paid' ? '✓ Pagado' :
                             expense.status === 'pending' ? '⏳ Pendiente' :
                             '✗ Cancelado'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenModal(expense)}
                            >
                              ✏️
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExpenseToDelete(expense);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              🗑️
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gastos por categoría */}
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">📊 Gastos por Categoría</h3>
              <div className="space-y-4">
                {expensesByCategory.map((cat, index) => {
                  const percentage = (cat.amount / getTotalExpenses()) * 100;
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
                        <span className="text-xs text-gray-500">{cat.count} gastos</span>
                        <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top 10 gastos */}
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">🔝 Top 10 Gastos</h3>
              <div className="space-y-3">
                {[...filteredExpenses]
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 10)
                  .map((expense, index) => (
                    <div key={expense.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{expense.description}</div>
                        <div className="text-sm text-gray-500">{formatDate(expense.paymentDate)}</div>
                      </div>
                      <div className="flex-shrink-0 font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                  ))}
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
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
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
              placeholder="Ej: Pago de alquiler oficina"
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
              >
                <option value="UYU">UYU (Pesos Uruguayos)</option>
                <option value="USD">USD (Dólares)</option>
                <option value="EUR">EUR (Euros)</option>
              </Select>
            </div>

            <Select
              label="Categoría"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {expenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Proveedor */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">🏢 Proveedor</h3>
            
            <Input
              label="Nombre del Proveedor"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              placeholder="Ej: Empresa XYZ"
            />

            <Input
              label="RUT/Tax ID"
              value={formData.supplierTaxId}
              onChange={(e) => setFormData({ ...formData, supplierTaxId: e.target.value })}
              placeholder="Ej: 12-345678-9"
            />
          </div>

          {/* Pago */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">💳 Información de Pago</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Fecha de Pago *"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                required
              />

              <Select
                label="Método de Pago"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                <option value="cash">💵 Efectivo</option>
                <option value="transfer">🏦 Transferencia</option>
                <option value="card">💳 Tarjeta</option>
                <option value="check">📄 Cheque</option>
              </Select>
            </div>

            <Select
              label="Cuenta"
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            >
              <option value="">Seleccionar cuenta</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name} - {formatCurrency(acc.currentBalance)}
                </option>
              ))}
            </Select>

            <Select
              label="Estado"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="paid">✓ Pagado</option>
              <option value="pending">⏳ Pendiente</option>
              <option value="cancelled">✗ Cancelado</option>
            </Select>
          </div>

          {/* Factura */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">📄 Factura</h3>
            
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
          </div>

          {/* Proyecto */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">📂 Relaciones</h3>
            
            <Select
              label="Proyecto Relacionado"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            >
              <option value="">Sin proyecto</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </Select>

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
              {editingExpense ? 'Guardar Cambios' : 'Crear Gasto'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingExpense(null);
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
        title="Eliminar Gasto"
        message={`¿Estás seguro de que deseas eliminar el gasto "${expenseToDelete?.description}"?`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
