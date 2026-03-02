'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, SearchInput, Select, Badge, ProgressBar, EmptyState, Loading, ConfirmDialog } from '@/components/ui';
import { useProjectsStore, useClientsStore } from '@/lib/store';
import { projectStatusColors, priorityColors, formatCurrency, formatDate } from '@/lib/utils';
import { Project } from '@/lib/types';

export default function ProjectsPage() {
  const { projects, isLoading, fetchProjects, deleteProject, filter, setFilter, getFilteredProjects } = useProjectsStore();
  const { clients, fetchClients } = useClientsStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [fetchProjects, fetchClients]);

  const filteredProjects = getFilteredProjects();

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const getClientName = (clientId: string | null | undefined) => {
    if (!clientId) return 'Sin cliente';
    return clients.find(c => c.id === clientId)?.name || 'Cliente';
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
        title="Proyectos"
        description={`${projects.length} proyectos en total`}
        actions={
          <Link href="/projects/new">
            <Button>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Proyecto
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SearchInput
              placeholder="Buscar proyectos..."
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              onClear={() => setFilter({ search: '' })}
            />
            <Select
              placeholder="Todos los estados"
              value={filter.status || ''}
              onChange={(e) => setFilter({ status: e.target.value || null })}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'backlog', label: 'Backlog' },
                { value: 'planning', label: 'Planificación' },
                { value: 'in_progress', label: 'En Progreso' },
                { value: 'on_hold', label: 'En Pausa' },
                { value: 'review', label: 'Revisión' },
                { value: 'done', label: 'Completado' },
                { value: 'cancelled', label: 'Cancelado' },
              ]}
            />
            <Select
              placeholder="Todas las prioridades"
              value={filter.priority || ''}
              onChange={(e) => setFilter({ priority: e.target.value || null })}
              options={[
                { value: '', label: 'Todas las prioridades' },
                { value: 'low', label: 'Baja' },
                { value: 'medium', label: 'Media' },
                { value: 'high', label: 'Alta' },
                { value: 'critical', label: 'Crítica' },
              ]}
            />
            <Select
              placeholder="Todos los clientes"
              value={filter.clientId || ''}
              onChange={(e) => setFilter({ clientId: e.target.value || null })}
              options={[
                { value: '', label: 'Todos los clientes' },
                ...clients.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No hay proyectos"
          description={filter.search || filter.status || filter.priority ? 'No se encontraron proyectos con los filtros aplicados' : 'Comienza creando tu primer proyecto'}
          icon={
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          action={
            !filter.search && !filter.status && !filter.priority && (
              <Link href="/projects/new">
                <Button>Crear Proyecto</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} hoverable className="flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 hover:text-indigo-600 truncate">
                      {project.name}
                    </h3>
                  </Link>
                  <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${projectStatusColors[project.status]?.bg} ${projectStatusColors[project.status]?.text}`}>
                    {projectStatusColors[project.status]?.label}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {project.description || 'Sin descripción'}
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Cliente</span>
                    <span className="font-medium text-gray-900">{getClientName(project.clientId)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Prioridad</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[project.priority]?.bg} ${priorityColors[project.priority]?.text}`}>
                      {priorityColors[project.priority]?.label}
                    </span>
                  </div>
                  {project.budget && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Presupuesto</span>
                      <span className="font-medium text-gray-900">{formatCurrency(project.budget)}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">Progreso</span>
                    <span className="font-medium text-gray-900">{project.progressPercentage}%</span>
                  </div>
                  <ProgressBar value={project.progressPercentage || 0} size="sm" />
                </div>

                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <span className="text-xs text-gray-500">
                  {project.dueDate ? `Vence: ${formatDate(project.dueDate)}` : 'Sin fecha límite'}
                </span>
                <div className="flex items-center gap-2">
                  <Link href={`/projects/${project.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(project)}>
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Proyecto"
        message={`¿Estás seguro de que deseas eliminar el proyecto "${projectToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
