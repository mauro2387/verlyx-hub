'use client';

import { useEffect, useState } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, SearchInput, Select, Loading, EmptyState, Modal, Input, Textarea, ConfirmDialog } from '@/components/ui';
import { useTasksStore, useProjectsStore, useCompanyStore } from '@/lib/store';
import { Task, TaskStatus } from '@/lib/types';
import { taskStatusColors, priorityColors, cn, formatDate } from '@/lib/utils';

const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE', 'CANCELLED'];

export default function TasksPage() {
  const { tasks, isLoading, fetchTasks, viewMode, setViewMode, filter, setFilter, addTask, updateTask, deleteTask, moveTask } = useTasksStore();
  const { projects, fetchProjects } = useProjectsStore();
  const { selectedCompanyId } = useCompanyStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showStats, setShowStats] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO' as TaskStatus,
    priority: 'MEDIUM',
    projectId: '',
    estimatedHours: '',
    actualHours: '',
    dueDate: '',
    tags: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  const filteredTasks = tasks.filter((task) => {
    if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.status && task.status !== filter.status) return false;
    if (filter.priority && task.priority !== filter.priority) return false;
    if (filter.projectId && task.projectId !== filter.projectId) return false;
    return true;
  });

  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter((t) => t.status === status);

  // Task Statistics
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    review: tasks.filter(t => t.status === 'REVIEW').length,
    blocked: tasks.filter(t => t.status === 'BLOCKED').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length,
    dueToday: tasks.filter(t => {
      if (!t.dueDate) return false;
      const today = new Date().toISOString().split('T')[0];
      return t.dueDate.split('T')[0] === today && t.status !== 'DONE';
    }).length,
    totalEstimatedHours: tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0),
    totalActualHours: tasks.reduce((acc, t) => acc + (t.actualHours || 0), 0),
  };

  const handleQuickComplete = (task: Task) => {
    updateTask(task.id, { 
      status: 'DONE' as TaskStatus,
      completedAt: new Date().toISOString(),
    });
  };

  const handleQuickStart = (task: Task) => {
    updateTask(task.id, { status: 'IN_PROGRESS' as TaskStatus });
  };

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        projectId: task.projectId || '',
        estimatedHours: task.estimatedHours?.toString() || '',
        actualHours: task.actualHours?.toString() || '',
        dueDate: task.dueDate?.split('T')[0] || '',
        tags: task.tags?.join(', ') || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: '',
        estimatedHours: '',
        actualHours: '',
        dueDate: '',
        tags: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const taskData = {
      myCompanyId: selectedCompanyId || '1',
      projectId: formData.projectId || null,
      dealId: null,
      clientId: null,
      parentTaskId: null,
      title: formData.title,
      description: formData.description || null,
      status: formData.status,
      priority: formData.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL',
      assignedTo: null,
      startDate: null,
      dueDate: formData.dueDate || null,
      completedAt: formData.status === 'DONE' ? new Date().toISOString() : null,
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
      actualHours: formData.actualHours ? parseInt(formData.actualHours) : 0,
      progressPercentage: formData.status === 'DONE' ? 100 : 0,
      isBlocked: formData.status === 'BLOCKED',
      blockedReason: null,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      checklist: [],
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete.id);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      moveTask(taskId, newStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
        title="Tareas"
        description={`${tasks.length} tareas en total`}
        actions={
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Tarea
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SearchInput
              placeholder="Buscar tareas..."
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              onClear={() => setFilter({ search: '' })}
            />
            <Select
              placeholder="Todos los estados"
              value={filter.status || ''}
              onChange={(e) => setFilter({ status: e.target.value as TaskStatus || null })}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'TODO', label: 'Por Hacer' },
                { value: 'IN_PROGRESS', label: 'En Progreso' },
                { value: 'REVIEW', label: 'En Revisión' },
                { value: 'BLOCKED', label: 'Bloqueada' },
                { value: 'DONE', label: 'Completada' },
                { value: 'CANCELLED', label: 'Cancelada' },
              ]}
            />
            <Select
              placeholder="Todas las prioridades"
              value={filter.priority || ''}
              onChange={(e) => setFilter({ priority: e.target.value || null })}
              options={[
                { value: '', label: 'Todas las prioridades' },
                { value: 'LOW', label: 'Baja' },
                { value: 'MEDIUM', label: 'Media' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'URGENT', label: 'Urgente' },
              ]}
            />
            <Select
              placeholder="Todos los proyectos"
              value={filter.projectId || ''}
              onChange={(e) => setFilter({ projectId: e.target.value || null })}
              options={[
                { value: '', label: 'Todos los proyectos' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Task Statistics */}
      {showStats && tasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{taskStats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{taskStats.todo}</p>
            <p className="text-xs text-gray-500">Por Hacer</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{taskStats.inProgress}</p>
            <p className="text-xs text-gray-500">En Progreso</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{taskStats.review}</p>
            <p className="text-xs text-gray-500">En Revisión</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{taskStats.done}</p>
            <p className="text-xs text-gray-500">Completadas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{taskStats.blocked}</p>
            <p className="text-xs text-gray-500">Bloqueadas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{taskStats.overdue}</p>
            <p className="text-xs text-gray-500">Vencidas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{taskStats.dueToday}</p>
            <p className="text-xs text-gray-500">Vencen Hoy</p>
          </Card>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {TASK_STATUSES.filter(s => s !== 'CANCELLED').map((status) => (
            <div
              key={status}
              className="flex-shrink-0 w-80"
              onDrop={(e) => handleDrop(e, status)}
              onDragOver={handleDragOver}
            >
              <div className={cn(
                'rounded-t-lg px-4 py-3 flex items-center justify-between',
                taskStatusColors[status]?.bg || 'bg-gray-100'
              )}>
                <h3 className={cn('font-semibold', taskStatusColors[status]?.text || 'text-gray-700')}>
                  {taskStatusColors[status]?.label || status}
                </h3>
                <span className="text-sm font-medium bg-white px-2 py-0.5 rounded-full">
                  {getTasksByStatus(status).length}
                </span>
              </div>
              <div className="bg-gray-100/50 rounded-b-lg p-3 min-h-[400px] space-y-3">
                {getTasksByStatus(status).length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">Sin tareas</p>
                ) : (
                  getTasksByStatus(status).map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="bg-white rounded-lg shadow-sm p-4 cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm flex-1">{task.title}</h4>
                        <div className="flex gap-1">
                          {task.status === 'TODO' && (
                            <button
                              onClick={() => handleQuickStart(task)}
                              className="p-1 hover:bg-green-50 rounded"
                              title="Iniciar tarea"
                            >
                              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                          {task.status !== 'DONE' && task.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleQuickComplete(task)}
                              className="p-1 hover:bg-green-50 rounded"
                              title="Marcar como completada"
                            >
                              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenModal(task)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(task)}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          priorityColors[task.priority]?.bg,
                          priorityColors[task.priority]?.text
                        )}>
                          {priorityColors[task.priority]?.label}
                        </span>
                        {task.dueDate && (
                          <span className={cn(
                            'text-xs flex items-center gap-1',
                            new Date(task.dueDate) < new Date() ? 'text-red-600' : 'text-gray-500'
                          )}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      {task.estimatedHours && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Horas: {task.actualHours || 0}/{task.estimatedHours}h</span>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1">
                                {task.tags.slice(0, 2).map((tag, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          {filteredTasks.length === 0 ? (
            <EmptyState
              title="No hay tareas"
              description="Comienza creando tu primera tarea"
              icon={
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              action={<Button onClick={() => handleOpenModal()}>Crear Tarea</Button>}
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        taskStatusColors[task.status]?.bg,
                        taskStatusColors[task.status]?.text
                      )}>
                        {taskStatusColors[task.status]?.label}
                      </span>
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      priorityColors[task.priority]?.bg,
                      priorityColors[task.priority]?.text
                    )}>
                      {priorityColors[task.priority]?.label}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(task)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(task)}>
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título *"
            placeholder="¿Qué necesitas hacer?"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <Textarea
            label="Descripción"
            placeholder="Añade detalles..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Estado"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
              options={[
                { value: 'TODO', label: 'Por Hacer' },
                { value: 'IN_PROGRESS', label: 'En Progreso' },
                { value: 'REVIEW', label: 'En Revisión' },
                { value: 'BLOCKED', label: 'Bloqueada' },
                { value: 'DONE', label: 'Completada' },
              ]}
            />
            <Select
              label="Prioridad"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: 'LOW', label: 'Baja' },
                { value: 'MEDIUM', label: 'Media' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'URGENT', label: 'Urgente' },
              ]}
            />
          </div>
          <Select
            label="Proyecto"
            placeholder="Seleccionar proyecto..."
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            options={[
              { value: '', label: 'Sin proyecto' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Horas Estimadas"
              type="number"
              placeholder="0"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
            />
            <Input
              label="Horas Trabajadas"
              type="number"
              placeholder="0"
              value={formData.actualHours}
              onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
            />
          </div>
          <Input
            label="Fecha Límite"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
          <Input
            label="Etiquetas"
            placeholder="Separadas por comas: urgente, cliente, bug"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            helperText="Escribe etiquetas separadas por comas"
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Tarea"
        message={`¿Estás seguro de que deseas eliminar la tarea "${taskToDelete?.title}"?`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
