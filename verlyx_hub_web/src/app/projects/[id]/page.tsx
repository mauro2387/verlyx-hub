'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Badge, ProgressBar, Loading, ConfirmDialog, Tag } from '@/components/ui';
import { useProjectsStore, useClientsStore, useTasksStore, useCompanyStore } from '@/lib/store';
import { projectStatusColors, priorityColors, formatCurrency, formatDate, taskStatusColors } from '@/lib/utils';
import ProjectTimeline from '@/components/ui/ProjectTimeline';
import ProjectAIAssistant from '@/components/ui/ProjectAIAssistant';
import type { Milestone } from '@/components/ui/ProjectTimeline';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/Toast';

// ==========================================
// TYPES
// ==========================================

interface MilestonePlan {
  title: string;
  description: string;
  target_date: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  tasks: Array<{ title: string; priority: string; estimated_days: number }>;
}

interface GeneratePlanAction {
  action: 'generate_plan';
  milestones: MilestonePlan[];
  risks: string[];
  recommendations: string[];
  urgency_assessment: {
    level: 'relaxed' | 'normal' | 'tight' | 'critical';
    message: string;
  };
}

interface UpdateProgressAction {
  action: 'update_progress';
  milestone_updates?: Array<{ id: string; status: string; notes?: string }>;
  new_tasks?: Array<{ title: string; priority: string; milestone_id?: string; estimated_days?: number }>;
  progress_update?: number;
  risk_alerts?: string[];
  recommendations?: string[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { projects, fetchProjects, getProjectById, deleteProject, updateProject } = useProjectsStore();
  const { clients, fetchClients } = useClientsStore();
  const { tasks, fetchTasks } = useTasksStore();
  const { companies, fetchCompanies } = useCompanyStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'tasks' | 'finances'>('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>();
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [milestoneTasks, setMilestoneTasks] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchTasks();
    fetchCompanies();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, [fetchProjects, fetchClients, fetchTasks]);

  // Fetch milestones via server-side API (bypasses PostgREST GRANT requirements)
  const fetchMilestones = useCallback(async () => {
    setMilestonesLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      if (!res.ok) {
        console.warn('Error fetching milestones:', res.statusText);
        setMilestonesLoading(false);
        return;
      }
      const data: Milestone[] = await res.json();
      setMilestones(data);
    } catch (err) {
      console.warn('Error fetching milestones:', err);
    }
    setMilestonesLoading(false);
  }, [projectId]);

  useEffect(() => { fetchMilestones(); }, [fetchMilestones]);

  // Auto-show AI on first visit if no milestones
  useEffect(() => {
    if (!milestonesLoading && milestones.length === 0 && projects.length > 0) {
      const proj = projects.find(p => p.id === projectId);
      if (proj) setShowAI(true);
    }
  }, [milestonesLoading, milestones.length, projects.length, projectId, projects]);

  const project = getProjectById(projectId);
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  const client = clients.find(c => c.id === project?.clientId);
  const company = companies.find(c => c.id === project?.myCompanyId);
  const isInternalProject = !project?.clientId;

  const handleDelete = () => {
    deleteProject(projectId);
    router.push('/projects');
  };

  // Handle AI plan generation via server-side API
  const handlePlanGenerated = useCallback(async (action: GeneratePlanAction) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_plan',
          milestones: action.milestones,
          risks: action.risks,
          recommendations: action.recommendations,
          urgency_assessment: action.urgency_assessment,
          userId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error('Error', err.error || 'No se pudo guardar el plan');
        return;
      }

      const result = await res.json();
      toast.success('Plan generado', `Se crearon ${result.createdMilestones} hitos y ${result.createdTasks} tareas`);
      fetchMilestones();
      fetchTasks();
      setShowAI(false);
    } catch (err) {
      console.error('Error saving plan:', err);
      toast.error('Error', 'No se pudo guardar el plan');
    }
  }, [projectId, userId, fetchMilestones, fetchTasks]);

  // Handle AI progress update via server-side API
  const handleProgressUpdate = useCallback(async (action: UpdateProgressAction) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestone_updates: action.milestone_updates,
          new_tasks: action.new_tasks,
          userId,
        }),
      });

      if (!res.ok) {
        toast.error('Error', 'No se pudo actualizar el progreso');
        return;
      }

      if (action.progress_update !== undefined) {
        await updateProject(projectId, { progress: action.progress_update, progressPercentage: action.progress_update });
      }
      toast.success('Actualizado', 'El progreso del proyecto fue actualizado');
      fetchMilestones();
      fetchTasks();
      fetchProjects();
    } catch {
      toast.error('Error', 'No se pudo actualizar el progreso');
    }
  }, [projectId, userId, updateProject, fetchMilestones, fetchTasks, fetchProjects]);

  // Fetch tasks for a milestone
  const handleMilestoneClick = useCallback(async (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('milestone_id', milestone.id)
      .order('created_at', { ascending: true });
    if (data) {
      setMilestoneTasks(prev => ({ ...prev, [milestone.id]: data }));
    }
  }, []);

  // Toggle task status
  const toggleTaskStatus = useCallback(async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({
      status: newStatus,
      ...(newStatus === 'done' ? { completed_at: new Date().toISOString() } : { completed_at: null }),
    }).eq('id', taskId);

    if (selectedMilestone) {
      const { data } = await supabase.from('tasks').select('*').eq('milestone_id', selectedMilestone.id).order('created_at', { ascending: true });
      if (data) setMilestoneTasks(prev => ({ ...prev, [selectedMilestone.id]: data }));
    }
    fetchMilestones();
    fetchTasks();

    // Auto-update progress
    const allTasks = tasks.filter(t => t.projectId === projectId);
    const doneTasks = allTasks.filter(t => t.status === 'done').length + (newStatus === 'done' ? 1 : -1);
    const total = allTasks.length;
    if (total > 0) {
      const newProgress = Math.round((doneTasks / total) * 100);
      updateProject(projectId, { progress: newProgress, progressPercentage: newProgress });
    }
  }, [selectedMilestone, fetchMilestones, fetchTasks, tasks, projectId, updateProject]);

  if (!project) {
    return <MainLayout><Loading /></MainLayout>;
  }

  const taskStats = {
    total: projectTasks.length,
    done: projectTasks.filter(t => t.status === 'done').length,
    inProgress: projectTasks.filter(t => t.status === 'in_progress').length,
    blocked: projectTasks.filter(t => t.status === 'blocked').length,
    overdue: projectTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
  };

  const tabs = [
    { key: 'overview' as const, label: 'Resumen', icon: '📊' },
    { key: 'timeline' as const, label: 'Timeline', icon: '📅', badge: milestones.filter(m => m.status === 'overdue' || m.status === 'at_risk').length || undefined },
    { key: 'tasks' as const, label: 'Tareas', icon: '✅', badge: taskStats.overdue > 0 ? taskStats.overdue : undefined },
    { key: 'finances' as const, label: 'Finanzas', icon: '💰' },
  ];

  return (
    <MainLayout>
      <PageHeader
        title={project.name}
        backHref="/projects"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={showAI ? 'primary' : 'outline'}
              onClick={() => setShowAI(!showAI)}
              className="!gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              {milestones.length === 0 ? 'Configurar con IA' : 'Coach IA'}
            </Button>
            <Link href={`/projects/${projectId}/edit`}>
              <Button variant="outline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </Button>
            </Link>
            <Button variant="danger" onClick={() => setDeleteDialogOpen(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        }
      />

      {/* Status Bar */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Project type badge */}
            {isInternalProject ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                🏢 Proyecto Interno
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                👤 Proyecto de Cliente
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Estado:</span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${projectStatusColors[project.status]?.bg} ${projectStatusColors[project.status]?.text}`}>
                {projectStatusColors[project.status]?.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Prioridad:</span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${priorityColors[project.priority]?.bg} ${priorityColors[project.priority]?.text}`}>
                {priorityColors[project.priority]?.label}
              </span>
            </div>
            {client && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Cliente:</span>
                <span className="text-sm font-medium text-gray-900">{client.name}</span>
              </div>
            )}
            {company && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Empresa:</span>
                <span className="text-sm font-medium text-gray-900">{company.name}</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Progreso:</span>
                <div className="w-32">
                  <ProgressBar value={project.progressPercentage || 0} size="sm" color="indigo" />
                </div>
                <span className="text-sm font-bold text-gray-900">{project.progressPercentage || 0}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className={`grid gap-6 ${showAI ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
        <div className={showAI ? 'lg:col-span-3' : ''}>
          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ===================== OVERVIEW TAB ===================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardContent className="!p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{taskStats.total}</p><p className="text-xs text-gray-500 mt-1">Tareas totales</p></CardContent></Card>
                <Card><CardContent className="!p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{taskStats.done}</p><p className="text-xs text-gray-500 mt-1">Completadas</p></CardContent></Card>
                <Card><CardContent className="!p-4 text-center"><p className={`text-2xl font-bold ${taskStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>{taskStats.overdue}</p><p className="text-xs text-gray-500 mt-1">Vencidas</p></CardContent></Card>
                <Card><CardContent className="!p-4 text-center"><p className={`text-2xl font-bold ${taskStats.blocked > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{taskStats.blocked}</p><p className="text-xs text-gray-500 mt-1">Bloqueadas</p></CardContent></Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="relative w-36 h-36">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="72" cy="72" r="64" stroke="#e5e7eb" strokeWidth="10" fill="none" />
                        <circle cx="72" cy="72" r="64"
                          stroke={(project.progressPercentage || 0) >= 80 ? '#10b981' : (project.progressPercentage || 0) >= 50 ? '#6366f1' : (project.progressPercentage || 0) >= 25 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="10" fill="none" strokeLinecap="round"
                          strokeDasharray={`${((project.progressPercentage || 0) / 100) * 402} 402`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">{project.progressPercentage || 0}%</span>
                        <span className="text-xs text-gray-400">Completado</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Información</h2></div>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {project.description || 'Sin descripción — usá el Coach IA para configurar tu proyecto.'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                      <div><span className="text-xs text-gray-400">Inicio</span><p className="text-sm font-medium text-gray-900">{formatDate(project.startDate)}</p></div>
                      <div><span className="text-xs text-gray-400">Entrega</span><p className="text-sm font-medium text-gray-900">{formatDate(project.dueDate || project.endDate)}</p></div>
                      <div><span className="text-xs text-gray-400">Presupuesto</span><p className="text-sm font-medium text-gray-900">{formatCurrency(project.budget || 0)}</p></div>
                      <div><span className="text-xs text-gray-400">Hitos</span><p className="text-sm font-medium text-gray-900">{milestones.filter(m => m.status === 'completed').length} / {milestones.length}</p></div>
                      {client && <div><span className="text-xs text-gray-400">Cliente</span><p className="text-sm font-medium text-gray-900">{client.name}</p></div>}
                      {company && <div><span className="text-xs text-gray-400">Empresa</span><p className="text-sm font-medium text-gray-900">{company.name}</p></div>}
                    </div>
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
                        {project.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {milestones.length > 0 && (
                <Card>
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Timeline</h2>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('timeline')}>Ver completo</Button>
                  </div>
                  <CardContent>
                    <ProjectTimeline
                      milestones={milestones.slice(0, 4)}
                      projectStart={project.startDate}
                      projectEnd={project.dueDate || project.endDate}
                      progress={project.progressPercentage || 0}
                      onMilestoneClick={handleMilestoneClick}
                    />
                    {milestones.length > 4 && (
                      <p className="text-xs text-center text-gray-400 mt-2">
                        +{milestones.length - 4} hitos más — <button onClick={() => setActiveTab('timeline')} className="text-indigo-500 hover:underline">ver todos</button>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Tareas recientes ({projectTasks.length})</h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('tasks')}>Ver todas</Button>
                </div>
                <CardContent className="p-0">
                  {projectTasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm">
                      No hay tareas — {milestones.length === 0 ? 'usá el Coach IA para generar un plan' : 'las tareas se crearán desde el timeline'}
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {projectTasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button onClick={() => toggleTaskStatus(task.id, task.status)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                                task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-indigo-400'
                              }`}>
                              {task.status === 'done' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                              {task.dueDate && <p className={`text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}`}>{formatDate(task.dueDate)}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${priorityColors[task.priority]?.bg} ${priorityColors[task.priority]?.text}`}>{priorityColors[task.priority]?.label}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${taskStatusColors[task.status]?.bg} ${taskStatusColors[task.status]?.text}`}>{taskStatusColors[task.status]?.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===================== TIMELINE TAB ===================== */}
          {activeTab === 'timeline' && (
            <Card>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Timeline del Proyecto</h2>
                {milestones.length === 0 && (
                  <Button size="sm" onClick={() => setShowAI(true)}>Generar con IA</Button>
                )}
              </div>
              <CardContent>
                {milestonesLoading ? <Loading /> : (
                  <ProjectTimeline milestones={milestones} projectStart={project.startDate} projectEnd={project.dueDate || project.endDate} progress={project.progressPercentage || 0} onMilestoneClick={handleMilestoneClick} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Milestone Detail Drawer */}
          {selectedMilestone && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedMilestone(null)}>
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                  <h3 className="font-semibold text-gray-900">{selectedMilestone.title}</h3>
                  <button onClick={() => setSelectedMilestone(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {selectedMilestone.description && <p className="text-sm text-gray-600">{selectedMilestone.description}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-400">Fecha objetivo</p><p className="text-sm font-medium">{selectedMilestone.target_date ? formatDate(selectedMilestone.target_date) : '—'}</p></div>
                    <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-400">Urgencia</p><p className="text-sm font-medium capitalize">{selectedMilestone.urgency}</p></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Tareas ({milestoneTasks[selectedMilestone.id]?.length || 0})</h4>
                    <div className="space-y-2">
                      {(milestoneTasks[selectedMilestone.id] || []).map((task: any) => (
                        <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <button onClick={() => toggleTaskStatus(task.id, task.status)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                              task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-indigo-400'
                            }`}>
                            {task.status === 'done' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</p>
                            {task.due_date && <p className={`text-xs ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}`}>{formatDate(task.due_date)}</p>}
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full ${task.priority === 'urgent' ? 'bg-red-100 text-red-600' : task.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>{task.priority}</span>
                        </div>
                      ))}
                      {(!milestoneTasks[selectedMilestone.id] || milestoneTasks[selectedMilestone.id].length === 0) && (
                        <p className="text-sm text-gray-400 text-center py-4">Sin tareas en este hito</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TASKS TAB ===================== */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Total', value: taskStats.total, color: 'text-gray-900' },
                  { label: 'Completadas', value: taskStats.done, color: 'text-emerald-600' },
                  { label: 'En progreso', value: taskStats.inProgress, color: 'text-blue-600' },
                  { label: 'Bloqueadas', value: taskStats.blocked, color: 'text-amber-600' },
                  { label: 'Vencidas', value: taskStats.overdue, color: 'text-red-600' },
                ].map((stat) => (
                  <Card key={stat.label}><CardContent className="!p-3 text-center"><p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p><p className="text-[10px] text-gray-500">{stat.label}</p></CardContent></Card>
                ))}
              </div>

              {['in_progress', 'todo', 'blocked', 'review', 'done'].map(status => {
                const statusTasks = projectTasks.filter(t => t.status === status);
                if (statusTasks.length === 0) return null;
                const sc = taskStatusColors[status as keyof typeof taskStatusColors];
                return (
                  <Card key={status}>
                    <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: sc?.bg?.includes('green') ? '#10b981' : sc?.bg?.includes('blue') ? '#3b82f6' : sc?.bg?.includes('red') ? '#ef4444' : sc?.bg?.includes('amber') || sc?.bg?.includes('yellow') ? '#f59e0b' : '#9ca3af' }} />
                      <h3 className="text-sm font-semibold text-gray-700">{sc?.label} ({statusTasks.length})</h3>
                    </div>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-50">
                        {statusTasks.map(task => (
                          <div key={task.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50">
                            <button onClick={() => toggleTaskStatus(task.id, task.status)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                                task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-indigo-400'
                              }`}>
                              {task.status === 'done' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                              {task.description && <p className="text-xs text-gray-400 truncate">{task.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {task.dueDate && <span className={`text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{formatDate(task.dueDate)}</span>}
                              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${priorityColors[task.priority]?.bg} ${priorityColors[task.priority]?.text}`}>{priorityColors[task.priority]?.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {projectTasks.length === 0 && (
                <Card><CardContent className="text-center py-12"><p className="text-gray-500 text-sm">No hay tareas en este proyecto</p><p className="text-gray-400 text-xs mt-1">Las tareas se crean automáticamente al generar el plan con el Coach IA</p></CardContent></Card>
              )}
            </div>
          )}

          {/* ===================== FINANCES TAB ===================== */}
          {activeTab === 'finances' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Resumen Financiero</h2></div>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center"><span className="text-gray-500">Presupuesto Total</span><span className="text-2xl font-bold text-gray-900">{formatCurrency(project.budget || 0)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500">Monto Gastado</span><span className="text-2xl font-bold text-red-600">{formatCurrency(project.spentAmount || 0)}</span></div>
                  <div className="flex justify-between items-center pt-4 border-t"><span className="text-gray-700 font-medium">Restante</span><span className="text-2xl font-bold text-green-600">{formatCurrency((project.budget || 0) - (project.spentAmount || 0))}</span></div>
                </CardContent>
              </Card>
              <Card>
                <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Uso del Presupuesto</h2></div>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="w-full max-w-xs">
                      <ProgressBar value={project.budget ? ((project.spentAmount || 0) / project.budget) * 100 : 0} size="lg" color={((project.spentAmount || 0) / (project.budget || 1)) > 0.9 ? 'red' : 'indigo'} showLabel />
                      <p className="text-center text-sm text-gray-500 mt-4">
                        {project.budget ? `${Math.round(((project.spentAmount || 0) / project.budget) * 100)}% del presupuesto utilizado` : 'Sin presupuesto asignado'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* AI Panel */}
        {showAI && (
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-4">
              <ProjectAIAssistant project={project} projectId={projectId} userId={userId} hasMilestones={milestones.length > 0} onPlanGenerated={handlePlanGenerated} onProgressUpdate={handleProgressUpdate} onClose={() => setShowAI(false)} />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Proyecto" message={`¿Estás seguro de que deseas eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`} confirmText="Eliminar" variant="danger" />
    </MainLayout>
  );
}
