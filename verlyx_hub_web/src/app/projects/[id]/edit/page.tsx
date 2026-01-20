'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, Input, Select, Textarea, Spinner } from '@/components/ui';
import { useProjectsStore, useClientsStore } from '@/lib/store';
import type { Project } from '@/lib/types';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { projects, updateProject } = useProjectsStore();
  const { clients } = useClientsStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Project>>({});

  useEffect(() => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        dueDate: project.dueDate,
        budget: project.budget,
        clientId: project.clientId,
      });
    }
    setLoading(false);
  }, [projectId, projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      updateProject(projectId, formData);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error updating project:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof Project, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Proyecto no encontrado</h1>
          <Button onClick={() => router.push('/projects')}>Volver a proyectos</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Editar Proyecto"
        description={`Editando: ${project.name}`}
      />

      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.push(`/projects/${projectId}`)}>
          ← Volver al proyecto
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
          <div className="space-y-4">
            <Input
              label="Nombre del Proyecto"
              value={formData.name || ''}
              onChange={(e) => updateFormData('name', e.target.value)}
              required
            />
            <Textarea
              label="Descripción"
              value={formData.description || ''}
              onChange={(e) => updateFormData('description', e.target.value)}
              rows={4}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado y Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Estado"
              value={formData.status || ''}
              onChange={(e) => updateFormData('status', e.target.value)}
              options={[
                { value: 'planning', label: 'Planificación' },
                { value: 'in_progress', label: 'En Progreso' },
                { value: 'on_hold', label: 'En Pausa' },
                { value: 'done', label: 'Completado' },
                { value: 'cancelled', label: 'Cancelado' },
              ]}
            />
            <Select
              label="Cliente"
              value={formData.clientId || ''}
              onChange={(e) => updateFormData('clientId', e.target.value || undefined)}
              options={[
                { value: '', label: 'Sin cliente asignado' },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Fecha de Inicio"
              type="date"
              value={formData.startDate?.split('T')[0] || ''}
              onChange={(e) => updateFormData('startDate', e.target.value)}
            />
            <Input
              label="Fecha de Vencimiento"
              type="date"
              value={formData.dueDate?.split('T')[0] || ''}
              onChange={(e) => updateFormData('dueDate', e.target.value || undefined)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Presupuesto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Presupuesto Total"
              type="number"
              value={formData.budget || ''}
              onChange={(e) => updateFormData('budget', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            <div className="flex items-end">
              <p className="text-sm text-gray-500">
                Gasto actual: <span className="font-semibold">${project.spentAmount?.toLocaleString() || 0}</span>
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
