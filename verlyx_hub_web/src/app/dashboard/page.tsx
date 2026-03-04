'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MainLayout, PageHeader } from '@/components/layout';
import { StatCard, Card, CardContent, ProgressBar, Badge, Loading, CompanyBadge } from '@/components/ui';
import { 
  useDashboardStore, 
  useProjectsStore, 
  useTasksStore, 
  useOpportunitiesStore, 
  useClientsStore,
  useFinancialStatsStore,
  useExpensesStore,
  useIncomesStore,
  useAccountsStore,
} from '@/lib/store';
import { formatCurrency, projectStatusColors, taskStatusColors, opportunityStageColors, cn } from '@/lib/utils';

export default function DashboardPage() {
  const { stats, fetchStats, isLoading: statsLoading } = useDashboardStore();
  const { projects, fetchProjects } = useProjectsStore();
  const { tasks, fetchTasks } = useTasksStore();
  const { opportunities, fetchOpportunities } = useOpportunitiesStore();
  const { clients, fetchClients } = useClientsStore();
  
  // Financial data
  const { stats: financialStats, fetchStats: fetchFinancialStats, isLoading: financialLoading } = useFinancialStatsStore();
  const { expenses, fetchExpenses } = useExpensesStore();
  const { incomes, fetchIncomes, getOverdueIncomes, getPendingIncomes } = useIncomesStore();
  const { accounts, fetchAccounts, getTotalBalance } = useAccountsStore();

  useEffect(() => {
    fetchStats();
    fetchProjects();
    fetchTasks();
    fetchOpportunities();
    fetchClients();
    fetchFinancialStats();
    fetchExpenses();
    fetchIncomes();
    fetchAccounts();
  }, [fetchStats, fetchProjects, fetchTasks, fetchOpportunities, fetchClients, fetchFinancialStats, fetchExpenses, fetchIncomes, fetchAccounts]);

  const recentProjects = projects.slice(0, 5);
  const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').slice(0, 5);
  const activeDeals = opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost').slice(0, 5);
  
  // Financial calculations
  const overdueIncomes = getOverdueIncomes();
  const pendingIncomes = getPendingIncomes();
  const totalBalance = getTotalBalance();

  // Alerts
  const alerts = useMemo(() => {
    const alertList: { type: 'warning' | 'error' | 'info'; message: string; link?: string }[] = [];
    
    if (overdueIncomes.length > 0) {
      const total = overdueIncomes.reduce((sum, i) => sum + i.amount, 0);
      alertList.push({
        type: 'error',
        message: `${overdueIncomes.length} cobros vencidos (${formatCurrency(total)})`,
        link: '/incomes?status=overdue',
      });
    }
    
    if (pendingIncomes.length > 5) {
      const total = pendingIncomes.reduce((sum, i) => sum + i.amount, 0);
      alertList.push({
        type: 'warning',
        message: `${pendingIncomes.length} cobros pendientes (${formatCurrency(total)})`,
        link: '/incomes?status=pending',
      });
    }
    
    const blockedTasks = tasks.filter(t => t.isBlocked);
    if (blockedTasks.length > 0) {
      alertList.push({
        type: 'warning',
        message: `${blockedTasks.length} tareas bloqueadas`,
        link: '/tasks?blocked=true',
      });
    }
    
    return alertList;
  }, [overdueIncomes, pendingIncomes, tasks]);

  if (statsLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Resumen ejecutivo de tu negocio"
      />

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-lg',
                alert.type === 'error' && 'bg-red-50 border border-red-200',
                alert.type === 'warning' && 'bg-amber-50 border border-amber-200',
                alert.type === 'info' && 'bg-blue-50 border border-blue-200'
              )}
            >
              <div className="flex items-center gap-3">
                {alert.type === 'error' && (
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {alert.type === 'warning' && (
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                <span className={cn(
                  'text-sm font-medium',
                  alert.type === 'error' && 'text-red-800',
                  alert.type === 'warning' && 'text-amber-800',
                  alert.type === 'info' && 'text-blue-800'
                )}>
                  {alert.message}
                </span>
              </div>
              {alert.link && (
                <Link href={alert.link} className={cn(
                  'text-sm font-medium',
                  alert.type === 'error' && 'text-red-600 hover:text-red-700',
                  alert.type === 'warning' && 'text-amber-600 hover:text-amber-700',
                  alert.type === 'info' && 'text-blue-600 hover:text-blue-700'
                )}>
                  Ver detalles →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Financial Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Balance Total"
          value={formatCurrency(totalBalance)}
          description="En todas las cuentas"
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <StatCard
          title="Ingresos del Mes"
          value={formatCurrency(financialStats?.totalIncome || 0)}
          description={`Margen: ${(financialStats?.profitMargin || 0).toFixed(1)}%`}
          color="blue"
          trend={financialStats?.profitMargin ? { value: Math.abs(financialStats.profitMargin), isPositive: financialStats.profitMargin > 0 } : undefined}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          title="Gastos del Mes"
          value={formatCurrency(financialStats?.totalExpense || 0)}
          description={`${expenses.filter(e => e.status === 'pending').length} pendientes`}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          }
        />
        <StatCard
          title="Por Cobrar"
          value={formatCurrency(financialStats?.pendingIncomesAmount || 0)}
          description={`${financialStats?.overdueIncomes || 0} vencidos`}
          color={financialStats?.overdueIncomes && financialStats.overdueIncomes > 0 ? 'orange' : 'purple'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Operations Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Proyectos Activos"
          value={stats?.projectsInProgress || 0}
          description={`${stats?.projectsTotal || 0} total`}
          color="indigo"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          title="Tareas Pendientes"
          value={stats?.tasksPending || 0}
          description={`${tasks.filter(t => t.isBlocked).length} bloqueadas`}
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <StatCard
          title="Oportunidades"
          value={stats?.dealsTotal || 0}
          description={formatCurrency(stats?.dealsValue || 0)}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatCard
          title="Clientes"
          value={stats?.clientsTotal || 0}
          description="Clientes activos"
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link 
          href="/expenses/new"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span className="font-medium text-gray-900">Nuevo Gasto</span>
        </Link>
        <Link 
          href="/incomes/new"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span className="font-medium text-gray-900">Nuevo Ingreso</span>
        </Link>
        <Link 
          href="/tasks/new"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-medium text-gray-900">Nueva Tarea</span>
        </Link>
        <Link 
          href="/deals/new"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-medium text-gray-900">Nueva Oportunidad</span>
        </Link>
      </div>

      {/* Accounts Summary */}
      {accounts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Cuentas y Cajas</h2>
            <Link href="/accounts" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.slice(0, 3).map((account) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${account.color || '#6366f1'}20` }}
                  >
                    {account.icon || '💰'}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{account.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                  </div>
                </div>
                <p className={cn(
                  "text-xl font-bold",
                  account.currentBalance >= 0 ? 'text-gray-900' : 'text-red-600'
                )}>
                  {formatCurrency(account.currentBalance)}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Proyectos Recientes</h2>
            <Link href="/projects" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <CardContent className="p-0">
            {recentProjects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay proyectos</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                        <CompanyBadge companyId={project.myCompanyId} size="xs" />
                      </div>
                      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${projectStatusColors[project.status]?.bg} ${projectStatusColors[project.status]?.text}`}>
                        {projectStatusColors[project.status]?.label || project.status}
                      </span>
                    </div>
                    <ProgressBar value={project.progressPercentage || 0} size="sm" />
                    <p className="text-xs text-gray-500 mt-2">{project.progressPercentage}% completado</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Tareas Pendientes</h2>
            <Link href="/tasks" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Ver todas →
            </Link>
          </div>
          <CardContent className="p-0">
            {pendingTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay tareas pendientes</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                          <CompanyBadge companyId={task.myCompanyId} size="xs" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">{task.description}</p>
                      </div>
                      <span className={`ml-3 px-2 py-0.5 text-xs font-medium rounded-full ${taskStatusColors[task.status]?.bg} ${taskStatusColors[task.status]?.text}`}>
                        {taskStatusColors[task.status]?.label || task.status}
                      </span>
                    </div>
                    {task.isBlocked && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Bloqueada
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Incomes (Overdue) */}
        {overdueIncomes.length > 0 && (
          <Card className="border-red-200 bg-red-50/30">
            <div className="px-6 py-4 border-b border-red-100 flex items-center justify-between">
              <h2 className="font-semibold text-red-800">⚠️ Cobros Vencidos</h2>
              <Link href="/incomes?status=overdue" className="text-sm text-red-600 hover:text-red-700 font-medium">
                Ver todos →
              </Link>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-red-100">
                {overdueIncomes.slice(0, 5).map((income) => (
                  <div key={income.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{income.description}</h3>
                        <p className="text-sm text-gray-500">{income.clientName || 'Sin cliente'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{formatCurrency(income.amount)}</p>
                        <p className="text-xs text-red-500">Vencido: {income.dueDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Deals */}
        <Card className={overdueIncomes.length > 0 ? '' : 'lg:col-span-2'}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Oportunidades Activas</h2>
            <Link href="/deals" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Ver Pipeline →
            </Link>
          </div>
          <CardContent className="p-0">
            {activeDeals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay oportunidades activas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      <th className="px-6 py-3">Oportunidad</th>
                      <th className="px-6 py-3">Etapa</th>
                      <th className="px-6 py-3">Monto</th>
                      <th className="px-6 py-3">Probabilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{deal.title}</p>
                            <CompanyBadge companyId={deal.myCompanyId} size="xs" />
                          </div>
                          <p className="text-sm text-gray-500">{clients.find(c => c.id === deal.clientId)?.name || 'Cliente'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className="px-2 py-1 text-xs font-medium rounded-full"
                            style={{ 
                              backgroundColor: `${opportunityStageColors[deal.stage]?.color}20`, 
                              color: opportunityStageColors[deal.stage]?.color 
                            }}
                          >
                            {opportunityStageColors[deal.stage]?.label || deal.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatCurrency(deal.finalAmount ?? deal.tentativeAmount ?? deal.estimatedAmountMax ?? 0)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 rounded-full" 
                                style={{ width: `${deal.probability || 0}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{deal.probability}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Dashboard Link */}
      <div className="mt-8 text-center">
        <Link 
          href="/financial-dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Ver Dashboard Financiero Completo
        </Link>
      </div>
    </MainLayout>
  );
}
