'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Input, Textarea, Select } from '@/components/ui';
import { useProjectsStore, useClientsStore, useCompanyStore } from '@/lib/store';

export default function NewProjectPage() {
  const router = useRouter();
  const { addProject } = useProjectsStore();
  const { clients, fetchClients } = useClientsStore();
  const { companies, selectedCompanyId, fetchCompanies } = useCompanyStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    clientId: '',
    budget: '',
    startDate: '',
    dueDate: '',
    tags: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchCompanies();
  }, [fetchClients, fetchCompanies]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.status) newErrors.status = 'El estado es requerido';
    if (!formData.priority) newErrors.priority = 'La prioridad es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      addProject({
        myCompanyId: selectedCompanyId || '1',
        clientCompanyId: formData.clientId || null,
        name: formData.name,
        description: formData.description || null,
        status: formData.status as 'backlog' | 'planning' | 'in_progress' | 'on_hold' | 'review' | 'done' | 'cancelled',
        priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
        budget: formData.budget ? parseFloat(formData.budget) : null,
        spentAmount: 0,
        currency: 'USD',
        startDate: formData.startDate || null,
        dueDate: formData.dueDate || null,
        completionDate: null,
        progressPercentage: 0,
        clientId: formData.clientId || null,
        dealId: null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        isArchived: false,
      });
      router.push('/projects');
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Nuevo Proyecto"
        description="Crea un nuevo proyecto"
        backHref="/projects"
      />

      <Card className="max-w-2xl">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Nombre del Proyecto *"
              placeholder="Ej: Plataforma E-commerce"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
            />

            <Textarea
              label="Descripción"
              placeholder="Describe el proyecto..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Estado *"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                error={errors.status}
                options={[
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
                label="Prioridad *"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                error={errors.priority}
                options={[
                  { value: 'low', label: 'Baja' },
                  { value: 'medium', label: 'Media' },
                  { value: 'high', label: 'Alta' },
                  { value: 'critical', label: 'Crítica' },
                ]}
              />
            </div>

            <Select
              label="Cliente"
              placeholder="Seleccionar cliente..."
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              options={[
                { value: '', label: 'Sin cliente' },
                ...clients.map(c => ({ value: c.id, label: c.name })),
              ]}
            />

            <Input
              label="Presupuesto (USD)"
              type="number"
              placeholder="0.00"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Fecha de Inicio"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />

              <Input
                label="Fecha de Entrega"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <Input
              label="Etiquetas"
              placeholder="Separadas por comas: react, web, api"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              helperText="Ingresa las etiquetas separadas por comas"
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Crear Proyecto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
