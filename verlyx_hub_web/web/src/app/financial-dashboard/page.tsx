'use client';

import { useEffect, useState, useMemo } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Loading, StatCard, Select } from '@/components/ui';
import { useExpensesStore, useIncomesStore, useAccountsStore, useBudgetsStore, useCategoriesStore, useCompanyStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

export default function FinancialDashboardPage() {
  const { expenses, fetchExpenses } = useExpensesStore();
  const { incomes, fetchIncomes } = useIncomesStore();
  const { accounts, fetchAccounts, getTotalBalance } = useAccountsStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const { categories, fetchCategories, getCategoriesByType } = useCategoriesStore();
  
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchExpenses(),
        fetchIncomes(),
        fetchAccounts(),
        fetchBudgets(),
        fetchCategories(),
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchExpenses, fetchIncomes, fetchAccounts, fetchBudgets, fetchCategories]);

  // Filtrar por período
  const filteredData = useMemo(() => {
    const filterByPeriod = (date: string) => {
      const d = new Date(date);
      if (period === 'month') {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      } else if (period === 'quarter') {
        const quarter = Math.floor(selectedMonth / 3);
        const itemQuarter = Math.floor(d.getMonth() / 3);
        return itemQuarter === quarter && d.getFullYear() === selectedYear;
      } else {
        return d.getFullYear() === selectedYear;
      }
    };

    return {
      expenses: expenses.filter(e => filterByPeriod(e.paymentDate)),
      incomes: incomes.filter(i => i.paymentDate && filterByPeriod(i.paymentDate)),
    };
  }, [expenses, incomes, period, selectedMonth, selectedYear]);

  // Cálculos financieros
  const financialMetrics = useMemo(() => {
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncomes = filteredData.incomes.reduce((sum, i) => sum + i.amount, 0);
    const netIncome = totalIncomes - totalExpenses;
    const profitMargin = totalIncomes > 0 ? (netIncome / totalIncomes) * 100 : 0;

    // Ingresos pendientes
    const pendingIncomes = incomes.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);

    // Gastos por pagar
    const pendingExpenses = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

    return {
      totalExpenses,
      totalIncomes,
      netIncome,
      profitMargin,
      pendingIncomes,
      pendingExpenses,
      cashFlow: netIncome,
    };
  }, [filteredData, expenses, incomes]);

  // Gastos por categoría
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { name: string; amount: number; color: string; icon: string }> = {};
    
    filteredData.expenses.forEach(expense => {
      const category = expense.category;
      const key = category?.id || 'sin-categoria';
      const name = category?.name || 'Sin categoría';
      
      if (!grouped[key]) {
        grouped[key] = {
          name,
          amount: 0,
          color: category?.color || '#9CA3AF',
          icon: category?.icon || '📊',
        };
      }
      
      grouped[key].amount += expense.amount;
    });
    
    return Object.values(grouped).sort((a, b) => b.amount - a.amount);
  }, [filteredData.expenses]);

  // Ingresos por categoría
  const incomesByCategory = useMemo(() => {
    const grouped: Record<string, { name: string; amount: number; color: string; icon: string }> = {};
    
    filteredData.incomes.forEach(income => {
      const category = income.category;
      const key = category?.id || 'sin-categoria';
      const name = category?.name || 'Sin categoría';
      
      if (!grouped[key]) {
        grouped[key] = {
          name,
          amount: 0,
          color: category?.color || '#9CA3AF',
          icon: category?.icon || '💰',
        };
      }
      
      grouped[key].amount += income.amount;
    });
    
    return Object.values(grouped).sort((a, b) => b.amount - a.amount);
  }, [filteredData.incomes]);

  // Evolución mensual (últimos 6 meses)
  const monthlyEvolution = useMemo(() => {
    const months: { month: string; incomes: number; expenses: number; net: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthExpenses = expenses
        .filter(e => {
          const d = new Date(e.paymentDate);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      const monthIncomes = incomes
        .filter(i => {
          const d = i.paymentDate ? new Date(i.paymentDate) : null;
          return d && d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((sum, i) => sum + i.amount, 0);
      
      months.push({
        month: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        incomes: monthIncomes,
        expenses: monthExpenses,
        net: monthIncomes - monthExpenses,
      });
    }
    
    return months;
  }, [expenses, incomes]);

  // Presupuestos vs Real
  const budgetComparison = useMemo(() => {
    const expenseCategories = getCategoriesByType('expense');
    
    return expenseCategories.map(category => {
      const categoryBudget = budgets.find(b => 
        b.categoryId === category.id && 
        b.year === selectedYear &&
        (period === 'month' ? b.month === selectedMonth + 1 : true)
      );
      
      const actualExpenses = filteredData.expenses
        .filter(e => e.categoryId === category.id)
        .reduce((sum, e) => sum + e.amount, 0);
      
      const budgetAmount = categoryBudget?.plannedAmount || 0;
      const percentage = budgetAmount > 0 ? (actualExpenses / budgetAmount) * 100 : 0;
      const isOverBudget = actualExpenses > budgetAmount;
      
      return {
        category: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        budgeted: budgetAmount,
        actual: actualExpenses,
        remaining: budgetAmount - actualExpenses,
        percentage,
        isOverBudget,
      };
    }).filter(b => b.budgeted > 0 || b.actual > 0)
      .sort((a, b) => b.actual - a.actual);
  }, [budgets, filteredData.expenses, getCategoriesByType, period, selectedMonth, selectedYear]);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const quarters = ['Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)'];

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
        title="📊 Dashboard Financiero"
        description="Análisis completo de ingresos, gastos y rentabilidad"
      />

      {/* Period Selector */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant={period === 'month' ? 'primary' : 'outline'}
                onClick={() => setPeriod('month')}
              >
                Mes
              </Button>
              <Button
                variant={period === 'quarter' ? 'primary' : 'outline'}
                onClick={() => setPeriod('quarter')}
              >
                Trimestre
              </Button>
              <Button
                variant={period === 'year' ? 'primary' : 'outline'}
                onClick={() => setPeriod('year')}
              >
                Año
              </Button>
            </div>

            {period === 'month' && (
              <Select
                value={selectedMonth.toString()}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </Select>
            )}

            {period === 'quarter' && (
              <Select
                value={Math.floor(selectedMonth / 3).toString()}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value) * 3)}
              >
                {quarters.map((quarter, index) => (
                  <option key={index} value={index}>
                    {quarter}
                  </option>
                ))}
              </Select>
            )}

            <Select
              value={selectedYear.toString()}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {[2026, 2025, 2024, 2023].map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Ingresos"
          value={formatCurrency(financialMetrics.totalIncomes)}
          description={`${filteredData.incomes.length} transacciones`}
          color="green"
        />
        <StatCard
          title="Gastos"
          value={formatCurrency(financialMetrics.totalExpenses)}
          description={`${filteredData.expenses.length} transacciones`}
          color="red"
        />
        <StatCard
          title="Ganancia Neta"
          value={formatCurrency(financialMetrics.netIncome)}
          description={`${financialMetrics.profitMargin.toFixed(1)}% margen`}
          color={financialMetrics.netIncome >= 0 ? 'blue' : 'orange'}
        />
        <StatCard
          title="Balance Cuentas"
          value={formatCurrency(getTotalBalance())}
          description={`${accounts.length} cuentas`}
          color="purple"
        />
      </div>

      {/* P&L y Pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* P&L Statement */}
        <Card className="lg:col-span-2">
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">📈 Estado de Resultados (P&L)</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="font-medium text-green-800">Ingresos Totales</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(financialMetrics.totalIncomes)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="font-medium text-red-800">Gastos Totales</span>
                <span className="font-bold text-red-600">
                  -{formatCurrency(financialMetrics.totalExpenses)}
                </span>
              </div>
              
              <div className="border-t-2 pt-3 flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="font-bold text-blue-800">Ganancia/Pérdida Neta</span>
                <span className={`font-bold text-xl ${financialMetrics.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(financialMetrics.netIncome)}
                </span>
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Margen de Ganancia</span>
                  <span className={`font-semibold ${financialMetrics.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financialMetrics.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${financialMetrics.profitMargin >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(Math.abs(financialMetrics.profitMargin), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">⏳ Por Cobrar/Pagar</h3>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm text-yellow-800 mb-1">Por Cobrar</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(financialMetrics.pendingIncomes)}
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  {incomes.filter(i => i.status === 'pending').length} facturas pendientes
                </div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-orange-800 mb-1">Por Pagar</div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(financialMetrics.pendingExpenses)}
                </div>
                <div className="text-xs text-orange-700 mt-1">
                  {expenses.filter(e => e.status === 'pending').length} gastos pendientes
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800 mb-1">Flujo de Caja Proyectado</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(financialMetrics.cashFlow + financialMetrics.pendingIncomes - financialMetrics.pendingExpenses)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gastos e Ingresos por Categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gastos por Categoría */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">💸 Gastos por Categoría</h3>
            {expensesByCategory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay gastos en este período
              </div>
            ) : (
              <div className="space-y-3">
                {expensesByCategory.slice(0, 8).map((cat, index) => {
                  const percentage = financialMetrics.totalExpenses > 0 
                    ? (cat.amount / financialMetrics.totalExpenses) * 100 
                    : 0;
                  
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium flex items-center gap-1">
                          <span>{cat.icon}</span>
                          {cat.name}
                        </span>
                        <span className="text-sm font-semibold">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {percentage.toFixed(1)}% del total
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ingresos por Categoría */}
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">💰 Ingresos por Categoría</h3>
            {incomesByCategory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay ingresos en este período
              </div>
            ) : (
              <div className="space-y-3">
                {incomesByCategory.slice(0, 8).map((cat, index) => {
                  const percentage = financialMetrics.totalIncomes > 0 
                    ? (cat.amount / financialMetrics.totalIncomes) * 100 
                    : 0;
                  
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium flex items-center gap-1">
                          <span>{cat.icon}</span>
                          {cat.name}
                        </span>
                        <span className="text-sm font-semibold">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {percentage.toFixed(1)}% del total
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolución Mensual */}
      <Card className="mb-8">
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">📈 Evolución Últimos 6 Meses</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Mes</th>
                  <th className="text-right py-2 px-4">Ingresos</th>
                  <th className="text-right py-2 px-4">Gastos</th>
                  <th className="text-right py-2 px-4">Neto</th>
                  <th className="text-center py-2 px-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {monthlyEvolution.map((month, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{month.month}</td>
                    <td className="py-2 px-4 text-right text-green-600 font-semibold">
                      {formatCurrency(month.incomes)}
                    </td>
                    <td className="py-2 px-4 text-right text-red-600 font-semibold">
                      {formatCurrency(month.expenses)}
                    </td>
                    <td className={`py-2 px-4 text-right font-bold ${month.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(month.net)}
                    </td>
                    <td className="py-2 px-4 text-center">
                      {month.net >= 0 ? '✅ Positivo' : '⚠️ Negativo'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Presupuestos vs Real */}
      {budgetComparison.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">🎯 Presupuesto vs Real</h3>
            <div className="space-y-4">
              {budgetComparison.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <span>{item.categoryIcon}</span>
                      {item.category}
                    </span>
                    <span className={`text-sm font-semibold ${item.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full ${item.isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-600">Presupuestado: </span>
                      <span className="font-semibold">{formatCurrency(item.budgeted)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Real: </span>
                      <span className="font-semibold">{formatCurrency(item.actual)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        {item.isOverBudget ? 'Exceso: ' : 'Disponible: '}
                      </span>
                      <span className={`font-semibold ${item.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(item.remaining))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
