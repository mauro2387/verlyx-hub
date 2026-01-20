'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Badge, ProgressBar, Loading, ConfirmDialog, Tag } from '@/components/ui';
import { useProjectsStore, useClientsStore, useTasksStore } from '@/lib/store';
import { projectStatusColors, priorityColors, formatCurrency, formatDate, taskStatusColors } from '@/lib/utils';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const { projects, fetchProjects, getProjectById, deleteProject } = useProjectsStore();
  const { clients, fetchClients } = useClientsStore();
  const { tasks, fetchTasks } = useTasksStore();
  
  const [activeTab, setActiveTab] = useState<'info' | 'progress' | 'finances'>('info');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchTasks();
  }, [fetchProjects, fetchClients, fetchTasks]);

  const project = getProjectById(projectId);
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  const client = clients.find(c => c.id === project?.clientId);

  const handleDelete = () => {
    deleteProject(projectId);
    router.push('/projects');
  };

  if (!project) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  const taskStats = {
    total: projectTasks.length,
    done: projectTasks.filter(t => t.status === 'DONE').length,
    inProgress: projectTasks.filter(t => t.status === 'IN_PROGRESS').length,
    blocked: projectTasks.filter(t => t.status === 'BLOCKED').length,
  };

  return (
    <MainLayout>
      <PageHeader
        title={project.name}
        backHref="/projects"
        actions={
          <div className="flex items-center gap-3">
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
              Eliminar
            </Button>
          </div>
        }
      />

      {/* Status and Info Bar */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-6">
          {(['info', 'progress', 'finances'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'info' && 'Información'}
              {tab === 'progress' && 'Progreso'}
              {tab === 'finances' && 'Finanzas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Descripción</h2>
              </div>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {project.description || 'Sin descripción'}
                </p>
              </CardContent>
            </Card>

            {project.tags && project.tags.length > 0 && (
              <Card>
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Etiquetas</h2>
                </div>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Tasks */}
            <Card>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Tareas ({projectTasks.length})</h2>
                <Link href={`/tasks?projectId=${projectId}`}>
                  <Button variant="ghost" size="sm">Ver todas</Button>
                </Link>
              </div>
              <CardContent className="p-0">
                {projectTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay tareas en este proyecto</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {projectTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{task.title}</p>
                          <p className="text-sm text-gray-500">{task.description}</p>
                        </div>
                        <span className={`ml-3 px-2 py-0.5 text-xs font-medium rounded-full ${taskStatusColors[task.status]?.bg} ${taskStatusColors[task.status]?.text}`}>
                          {taskStatusColors[task.status]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Detalles</h2>
              </div>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha de inicio</span>
                  <span className="font-medium text-gray-900">{formatDate(project.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha de entrega</span>
                  <span className="font-medium text-gray-900">{formatDate(project.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Creado</span>
                  <span className="font-medium text-gray-900">{formatDate(project.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Actualizado</span>
                  <span className="font-medium text-gray-900">{formatDate(project.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Tareas</h2>
              </div>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Completadas</span>
                  <span className="font-medium text-green-600">{taskStats.done}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">En progreso</span>
                  <span className="font-medium text-blue-600">{taskStats.inProgress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bloqueadas</span>
                  <span className="font-medium text-red-600">{taskStats.blocked}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-700 font-medium">Total</span>
                  <span className="font-medium text-gray-900">{taskStats.total}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Progreso General</h2>
            </div>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="#6366f1"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${((project.progressPercentage || 0) / 100) * 553} 553`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">{project.progressPercentage || 0}%</span>
                    <span className="text-sm text-gray-500">Completado</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Estadísticas de Tareas</h2>
            </div>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Completadas</span>
                    <span>{taskStats.done} / {taskStats.total}</span>
                  </div>
                  <ProgressBar 
                    value={taskStats.total > 0 ? (taskStats.done / taskStats.total) * 100 : 0} 
                    color="green" 
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>En Progreso</span>
                    <span>{taskStats.inProgress} / {taskStats.total}</span>
                  </div>
                  <ProgressBar 
                    value={taskStats.total > 0 ? (taskStats.inProgress / taskStats.total) * 100 : 0} 
                    color="blue" 
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Bloqueadas</span>
                    <span>{taskStats.blocked} / {taskStats.total}</span>
                  </div>
                  <ProgressBar 
                    value={taskStats.total > 0 ? (taskStats.blocked / taskStats.total) * 100 : 0} 
                    color="red" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'finances' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Resumen Financiero</h2>
            </div>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Presupuesto Total</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(project.budget || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Monto Gastado</span>
                <span className="text-2xl font-bold text-red-600">{formatCurrency(project.spentAmount || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-gray-700 font-medium">Restante</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency((project.budget || 0) - (project.spentAmount || 0))}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Uso del Presupuesto</h2>
            </div>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="w-full max-w-xs">
                  <ProgressBar 
                    value={project.budget ? ((project.spentAmount || 0) / project.budget) * 100 : 0}
                    size="lg"
                    color={((project.spentAmount || 0) / (project.budget || 1)) > 0.9 ? 'red' : 'indigo'}
                    showLabel
                  />
                  <p className="text-center text-sm text-gray-500 mt-4">
                    {project.budget 
                      ? `${Math.round(((project.spentAmount || 0) / project.budget) * 100)}% del presupuesto utilizado`
                      : 'Sin presupuesto asignado'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Proyecto"
        message={`¿Estás seguro de que deseas eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
