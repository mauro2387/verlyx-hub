'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MainLayout, PageHeader } from '@/components/layout';
import { StatCard, Card, CardContent, ProgressBar, Badge, Loading } from '@/components/ui';
import { useDashboardStore, useProjectsStore, useTasksStore, useDealsStore, useClientsStore } from '@/lib/store';
import { formatCurrency, projectStatusColors, taskStatusColors, dealStageColors } from '@/lib/utils';

export default function DashboardPage() {
  const { stats, fetchStats, isLoading: statsLoading } = useDashboardStore();
  const { projects, fetchProjects } = useProjectsStore();
  const { tasks, fetchTasks } = useTasksStore();
  const { deals, fetchDeals } = useDealsStore();
  const { clients, fetchClients } = useClientsStore();

  useEffect(() => {
    fetchStats();
    fetchProjects();
    fetchTasks();
    fetchDeals();
    fetchClients();
  }, [fetchStats, fetchProjects, fetchTasks, fetchDeals, fetchClients]);

  if (statsLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  const recentProjects = projects.slice(0, 5);
  const pendingTasks = tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS' || t.status === 'pending' || t.status === 'in_progress').slice(0, 5);
  const activeDeals = deals.filter(d => d.stage !== 'CLOSED_WON' && d.stage !== 'CLOSED_LOST' && d.stage !== 'won' && d.stage !== 'lost').slice(0, 5);

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard"
        description="Resumen general de tu negocio"
      />

      {/* Stats Grid */}
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
          description={`${stats?.tasksTotal || 0} total`}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                      <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${projectStatusColors[project.status]?.bg} ${projectStatusColors[project.status]?.text}`}>
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
                        <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
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

        {/* Active Deals */}
        <Card className="lg:col-span-2">
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
                      <th className="px-6 py-3">Próxima Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{deal.title}</p>
                          <p className="text-sm text-gray-500">{clients.find(c => c.id === deal.clientId)?.name || 'Cliente'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className="px-2 py-1 text-xs font-medium rounded-full"
                            style={{ 
                              backgroundColor: `${dealStageColors[deal.stage]?.color}20`, 
                              color: dealStageColors[deal.stage]?.color 
                            }}
                          >
                            {dealStageColors[deal.stage]?.label || deal.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatCurrency(deal.amount || 0)}
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
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {deal.nextAction || '-'}
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
    </MainLayout>
  );
}
