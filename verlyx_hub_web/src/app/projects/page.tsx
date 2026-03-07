'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, SearchInput, Select, ProgressBar, EmptyState, Loading, ConfirmDialog, CompanyBadge } from '@/components/ui';
import { useProjectsStore, useClientsStore, useCompanyStore } from '@/lib/store';
import { projectStatusColors, priorityColors, formatCurrency, formatDate } from '@/lib/utils';
import { Project } from '@/lib/types';

type ViewMode = 'grid' | 'table' | 'kanban';
type SortKey = 'name' | 'status' | 'priority' | 'progress' | 'dueDate' | 'budget' | 'createdAt';

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_COLUMNS = ['backlog', 'planning', 'in_progress', 'on_hold', 'review', 'done'] as const;

export default function ProjectsPage() {
  const { projects, isLoading, fetchProjects, deleteProject, filter, setFilter, getFilteredProjects } = useProjectsStore();
  const { clients, fetchClients } = useClientsStore();
  const { companies, fetchCompanies } = useCompanyStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchCompanies();
  }, [fetchProjects, fetchClients, fetchCompanies]);

  const filteredProjects = useMemo(() => {
    let list = getFilteredProjects().filter(p => {
      if (projectTypeFilter === 'client') return !!p.clientId;
      if (projectTypeFilter === 'internal') return !p.clientId;
      return true;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case 'progress': cmp = (a.progressPercentage || 0) - (b.progressPercentage || 0); break;
        case 'budget': cmp = (a.budget || 0) - (b.budget || 0); break;
        case 'dueDate': cmp = (a.dueDate || '9999').localeCompare(b.dueDate || '9999'); break;
        case 'createdAt': cmp = (a.createdAt || '').localeCompare(b.createdAt || ''); break;
        default: break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [getFilteredProjects, projectTypeFilter, sortKey, sortAsc]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => ['in_progress', 'review'].includes(p.status)).length,
    client: projects.filter(p => !!p.clientId).length,
    internal: projects.filter(p => !p.clientId).length,
    done: projects.filter(p => p.status === 'done').length,
    overdue: projects.filter(p => p.dueDate && new Date(p.dueDate) < new Date() && !['done', 'cancelled'].includes(p.status)).length,
    avgProgress: projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.progressPercentage || 0), 0) / projects.length) : 0,
    totalBudget: projects.reduce((s, p) => s + (p.budget || 0), 0),
  }), [projects]);

  const handleDeleteClick = (project: Project) => { setProjectToDelete(project); setDeleteDialogOpen(true); };
  const handleDeleteConfirm = () => { if (projectToDelete) { deleteProject(projectToDelete.id); setDeleteDialogOpen(false); setProjectToDelete(null); } };
  const getClientName = (clientId: string | null | undefined) => clientId ? (clients.find(c => c.id === clientId)?.name || 'Cliente') : null;
  const handleSort = (key: SortKey) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); } };

  if (isLoading) return <MainLayout><Loading /></MainLayout>;

  return (
    <MainLayout>
      <PageHeader
        title="Proyectos"
        description={`${stats.total} proyectos — ${stats.active} activos`}
        actions={
          <Link href="/projects/new">
            <Button>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuevo Proyecto
            </Button>
          </Link>
        }
      />

      {/* Dashboard Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-gray-50' },
            { label: 'Activos', value: stats.active, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Completados', value: stats.done, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Vencidos', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-600' : 'text-gray-400', bg: stats.overdue > 0 ? 'bg-red-50' : 'bg-gray-50' },
            { label: 'De Clientes', value: stats.client, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Internos', value: stats.internal, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Progreso Ø', value: `${stats.avgProgress}%`, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Budget Total', value: formatCurrency(stats.totalBudget), color: 'text-green-600', bg: 'bg-green-50', small: true },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-gray-100`}>
              <p className={`${(s as any).small ? 'text-sm' : 'text-xl'} font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <Card className="mb-6">
        <div className="p-4 space-y-3">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
            <SearchInput placeholder="Buscar proyectos..." value={filter.search} onChange={(e) => setFilter({ search: e.target.value })} onClear={() => setFilter({ search: '' })} />
            <Select value={filter.status || ''} onChange={(e) => setFilter({ status: e.target.value || null })}
              options={[{ value: '', label: 'Estado' }, { value: 'backlog', label: 'Backlog' }, { value: 'planning', label: 'Planificación' }, { value: 'in_progress', label: 'En Progreso' }, { value: 'on_hold', label: 'En Pausa' }, { value: 'review', label: 'Revisión' }, { value: 'done', label: 'Completado' }, { value: 'cancelled', label: 'Cancelado' }]} />
            <Select value={filter.priority || ''} onChange={(e) => setFilter({ priority: e.target.value || null })}
              options={[{ value: '', label: 'Prioridad' }, { value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }, { value: 'urgent', label: 'Urgente' }]} />
            <Select value={projectTypeFilter} onChange={(e) => setProjectTypeFilter(e.target.value)}
              options={[{ value: '', label: 'Tipo' }, { value: 'client', label: '👤 Clientes' }, { value: 'internal', label: '🏢 Internos' }]} />
            <Select value={filter.clientId || ''} onChange={(e) => setFilter({ clientId: e.target.value || null })}
              options={[{ value: '', label: 'Cliente' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {([
                { key: 'grid' as ViewMode, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>, label: 'Grid' },
                { key: 'table' as ViewMode, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>, label: 'Tabla' },
                { key: 'kanban' as ViewMode, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>, label: 'Kanban' },
              ]).map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === v.key ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Ordenar:</span>
              <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
                options={[{ value: 'createdAt', label: 'Recientes' }, { value: 'name', label: 'Nombre' }, { value: 'priority', label: 'Prioridad' }, { value: 'progress', label: 'Progreso' }, { value: 'dueDate', label: 'Vencimiento' }, { value: 'budget', label: 'Budget' }]} />
              <button onClick={() => setSortAsc(!sortAsc)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                <svg className={`w-4 h-4 transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
              <span className="text-xs text-gray-400 ml-2">{filteredProjects.length} resultados</span>
            </div>
          </div>
        </div>
      </Card>

      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No hay proyectos"
          description={filter.search || filter.status || filter.priority || projectTypeFilter ? 'No se encontraron proyectos con los filtros aplicados' : 'Comienza creando tu primer proyecto para gestionar entregas, tareas y finanzas'}
          icon={<svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          action={!filter.search && !filter.status && !filter.priority && !projectTypeFilter && <Link href="/projects/new"><Button size="lg">Crear Proyecto</Button></Link>}
        />
      ) : (
        <>
          {/* ===== GRID VIEW ===== */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => {
                const clientName = getClientName(project.clientId);
                const isInternal = !project.clientId;
                const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && !['done', 'cancelled'].includes(project.status);
                return (
                  <Card key={project.id} hoverable className="flex flex-col group relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${project.priority === 'urgent' ? 'bg-red-500' : project.priority === 'high' ? 'bg-amber-500' : project.priority === 'medium' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                    <div className="p-5 pl-4 flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 hover:text-indigo-600 truncate text-[15px] mb-1">{project.name}</h3>
                          <div className="flex items-center gap-2">
                            <CompanyBadge companyId={project.myCompanyId} size="xs" />
                            {isInternal ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">Interno</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium truncate max-w-[120px]">{clientName}</span>
                            )}
                          </div>
                        </Link>
                        <span className={`ml-2 shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-md ${projectStatusColors[project.status]?.bg} ${projectStatusColors[project.status]?.text}`}>
                          {projectStatusColors[project.status]?.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">{project.description || 'Sin descripción'}</p>
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400">Progreso</span>
                          <span className="font-semibold text-gray-700">{project.progressPercentage || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${(project.progressPercentage || 0) >= 80 ? 'bg-emerald-500' : (project.progressPercentage || 0) >= 50 ? 'bg-indigo-500' : (project.progressPercentage || 0) >= 25 ? 'bg-amber-500' : 'bg-gray-300'}`}
                            style={{ width: `${project.progressPercentage || 0}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span className={`inline-flex items-center gap-1 ${priorityColors[project.priority]?.text}`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10l-4 4 4 4H6a3 3 0 01-3-3V6z" clipRule="evenodd" /></svg>
                          {priorityColors[project.priority]?.label}
                        </span>
                        {project.budget ? <span>{formatCurrency(project.budget)}</span> : null}
                        {project.dueDate && (
                          <span className={`ml-auto ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                            {isOverdue && '⚠ '}{formatDate(project.dueDate)}
                          </span>
                        )}
                      </div>
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {project.tags.slice(0, 3).map(tag => <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded">{tag}</span>)}
                          {project.tags.length > 3 && <span className="text-[10px] text-gray-400">+{project.tags.length - 3}</span>}
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-2.5 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <span className="text-[10px] text-gray-400">{formatDate(project.createdAt)}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/projects/${project.id}`}><Button variant="ghost" size="sm" className="!p-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></Button></Link>
                        <Link href={`/projects/${project.id}/edit`}><Button variant="ghost" size="sm" className="!p-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></Button></Link>
                        <Button variant="ghost" size="sm" className="!p-1" onClick={() => handleDeleteClick(project)}><svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ===== TABLE VIEW ===== */}
          {viewMode === 'table' && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        { key: 'name' as SortKey, label: 'Proyecto', className: 'text-left pl-6' },
                        { key: 'status' as SortKey, label: 'Estado' },
                        { key: 'priority' as SortKey, label: 'Prioridad' },
                        { key: 'progress' as SortKey, label: 'Progreso' },
                        { key: 'dueDate' as SortKey, label: 'Vencimiento' },
                        { key: 'budget' as SortKey, label: 'Budget' },
                      ].map(col => (
                        <th key={col.key} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none ${col.className || ''}`}
                          onClick={() => handleSort(col.key)}>
                          <div className="flex items-center gap-1">
                            {col.label}
                            {sortKey === col.key && <svg className={`w-3 h-3 ${sortAsc ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProjects.map((project) => {
                      const clientName = getClientName(project.clientId);
                      const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && !['done', 'cancelled'].includes(project.status);
                      return (
                        <tr key={project.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-4 py-3 pl-6">
                            <Link href={`/projects/${project.id}`} className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${project.priority === 'urgent' ? 'bg-red-500' : project.priority === 'high' ? 'bg-amber-500' : project.priority === 'medium' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 max-w-[280px]">{project.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <CompanyBadge companyId={project.myCompanyId} size="xs" />
                                  {project.tags?.slice(0, 2).map(t => <span key={t} className="text-[10px] px-1 py-0 bg-gray-100 text-gray-400 rounded">{t}</span>)}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${projectStatusColors[project.status]?.bg} ${projectStatusColors[project.status]?.text}`}>{projectStatusColors[project.status]?.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${priorityColors[project.priority]?.bg} ${priorityColors[project.priority]?.text}`}>{priorityColors[project.priority]?.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${(project.progressPercentage || 0) >= 80 ? 'bg-emerald-500' : (project.progressPercentage || 0) >= 50 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                                  style={{ width: `${project.progressPercentage || 0}%` }} />
                              </div>
                              <span className="text-xs font-medium text-gray-600 w-8 text-right">{project.progressPercentage || 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{isOverdue && '⚠ '}{project.dueDate ? formatDate(project.dueDate) : '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-gray-700">{project.budget ? formatCurrency(project.budget) : '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {project.clientId ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium truncate max-w-[100px] inline-block">{clientName}</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">Interno</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/projects/${project.id}/edit`}><Button variant="ghost" size="sm" className="!p-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></Button></Link>
                              <Button variant="ghost" size="sm" className="!p-1" onClick={() => handleDeleteClick(project)}><svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ===== KANBAN VIEW ===== */}
          {viewMode === 'kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
              {STATUS_COLUMNS.map(status => {
                const colProjects = filteredProjects.filter(p => p.status === status);
                const sc = projectStatusColors[status];
                const dotColor = status === 'in_progress' ? '#6366f1' : status === 'done' ? '#10b981' : status === 'on_hold' ? '#f59e0b' : status === 'review' ? '#8b5cf6' : status === 'planning' ? '#3b82f6' : '#9ca3af';
                return (
                  <div key={status} className="min-w-[280px] w-[280px] shrink-0">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{sc?.label}</span>
                      <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{colProjects.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {colProjects.map(project => {
                        const clientName = getClientName(project.clientId);
                        const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && !['done', 'cancelled'].includes(project.status);
                        return (
                          <Link key={project.id} href={`/projects/${project.id}`}>
                            <Card hoverable className="!p-3 cursor-pointer group">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 line-clamp-2 leading-snug">{project.name}</h4>
                                <span className={`ml-2 shrink-0 w-2 h-2 rounded-full mt-1.5 ${project.priority === 'urgent' ? 'bg-red-500' : project.priority === 'high' ? 'bg-amber-500' : project.priority === 'medium' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                {project.clientId ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium truncate max-w-[120px]">{clientName}</span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium">Interno</span>
                                )}
                                <CompanyBadge companyId={project.myCompanyId} size="xs" />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-1">
                                  <div className={`h-1 rounded-full ${(project.progressPercentage || 0) >= 80 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${project.progressPercentage || 0}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">{project.progressPercentage || 0}%</span>
                              </div>
                              {project.dueDate && (
                                <p className={`text-[10px] mt-2 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>{isOverdue && '⚠ '}{formatDate(project.dueDate)}</p>
                              )}
                            </Card>
                          </Link>
                        );
                      })}
                      {colProjects.length === 0 && <div className="text-center py-8 text-gray-300"><p className="text-xs">Sin proyectos</p></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDeleteConfirm}
        title="Eliminar Proyecto" message={`¿Estás seguro de que deseas eliminar "${projectToDelete?.name}"? Esto eliminará todas las tareas, hitos y datos asociados.`} confirmText="Eliminar" variant="danger" />
    </MainLayout>
  );
}
