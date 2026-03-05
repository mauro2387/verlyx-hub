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
    projectFor: 'client' as 'client' | 'company',
    clientId: '',
    myCompanyId: '',
    projectType: 'other',
    budget: '',
    currency: 'USD',
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

  useEffect(() => {
    if (selectedCompanyId && !formData.myCompanyId) {
      setFormData(prev => ({ ...prev, myCompanyId: selectedCompanyId }));
    }
  }, [selectedCompanyId, formData.myCompanyId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (formData.projectFor === 'client' && !formData.clientId) newErrors.clientId = 'Seleccioná un cliente';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      addProject({
        myCompanyId: formData.myCompanyId || selectedCompanyId || null,
        clientCompanyId: null,
        name: formData.name,
        description: formData.description || null,
        status: formData.status as 'backlog' | 'planning' | 'in_progress' | 'on_hold' | 'review' | 'done' | 'cancelled',
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        budget: formData.budget ? parseFloat(formData.budget) : null,
        spentAmount: 0,
        currency: formData.currency,
        startDate: formData.startDate || null,
        dueDate: formData.dueDate || null,
        completionDate: null,
        progressPercentage: 0,
        clientId: formData.projectFor === 'client' ? formData.clientId || null : null,
        dealId: null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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
        description="Crea un proyecto para un cliente o para tu empresa"
        backHref="/projects"
      />

      <div className="max-w-3xl space-y-6">
        {/* Project Type Selection */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">¿Para quién es el proyecto?</h3>
          </div>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, projectFor: 'client', clientId: '' })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.projectFor === 'client'
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.projectFor === 'client' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div>
                    <p className={`font-semibold ${formData.projectFor === 'client' ? 'text-indigo-900' : 'text-gray-900'}`}>Para un Cliente</p>
                    <p className="text-xs text-gray-500">Trabajo para un cliente externo</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, projectFor: 'company', clientId: '' })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.projectFor === 'company'
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.projectFor === 'company' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <p className={`font-semibold ${formData.projectFor === 'company' ? 'text-emerald-900' : 'text-gray-900'}`}>Para mi Empresa</p>
                    <p className="text-xs text-gray-500">Proyecto interno de tu empresa</p>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Información del Proyecto</h3>
            </div>
            <CardContent className="space-y-4">
              <Input
                label="Nombre del Proyecto *"
                placeholder="Ej: Plataforma E-commerce, Rediseño de marca..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
              />

              <Textarea
                label="Descripción"
                placeholder="Describe los objetivos y alcance del proyecto..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Tipo de Proyecto"
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  options={[
                    { value: 'web_development', label: '🌐 Desarrollo Web' },
                    { value: 'mobile_app', label: '📱 App Móvil' },
                    { value: 'design', label: '🎨 Diseño' },
                    { value: 'marketing', label: '📣 Marketing' },
                    { value: 'consulting', label: '💼 Consultoría' },
                    { value: 'ecommerce', label: '🛒 E-commerce' },
                    { value: 'branding', label: '✨ Branding' },
                    { value: 'seo', label: '🔍 SEO / SEM' },
                    { value: 'social_media', label: '📲 Redes Sociales' },
                    { value: 'internal', label: '🏢 Proyecto Interno' },
                    { value: 'other', label: '📋 Otro' },
                  ]}
                />
                <Select
                  label="Prioridad *"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  options={[
                    { value: 'low', label: 'Baja' },
                    { value: 'medium', label: 'Media' },
                    { value: 'high', label: 'Alta' },
                    { value: 'urgent', label: 'Urgente' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Client or Company */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {formData.projectFor === 'client' ? 'Cliente y Empresa' : 'Empresa'}
              </h3>
            </div>
            <CardContent className="space-y-4">
              {formData.projectFor === 'client' && (
                <Select
                  label="Cliente *"
                  placeholder="Seleccionar cliente..."
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  error={errors.clientId}
                  options={[
                    { value: '', label: 'Seleccionar cliente...' },
                    ...clients.map(c => ({ value: c.id, label: `${c.name}${c.company ? ` — ${c.company}` : ''}` })),
                  ]}
                />
              )}
              {companies.length > 1 && (
                <Select
                  label={formData.projectFor === 'company' ? 'Empresa *' : 'Desde mi empresa'}
                  value={formData.myCompanyId}
                  onChange={(e) => setFormData({ ...formData, myCompanyId: e.target.value })}
                  options={companies.map(c => ({ value: c.id, label: c.name }))}
                />
              )}
            </CardContent>
          </Card>

          {/* Dates & Budget */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Fechas y Presupuesto</h3>
            </div>
            <CardContent className="space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Presupuesto"
                  type="number"
                  placeholder="0.00"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
                <Select
                  label="Moneda"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  options={[
                    { value: 'USD', label: 'USD — Dólar' },
                    { value: 'UYU', label: 'UYU — Peso uruguayo' },
                    { value: 'ARS', label: 'ARS — Peso argentino' },
                    { value: 'EUR', label: 'EUR — Euro' },
                    { value: 'BRL', label: 'BRL — Real' },
                    { value: 'MXN', label: 'MXN — Peso mexicano' },
                  ]}
                />
              </div>
              <Select
                label="Estado Inicial"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'backlog', label: 'Backlog' },
                  { value: 'planning', label: 'Planificación' },
                  { value: 'in_progress', label: 'En Progreso' },
                ]}
              />
              <Input
                label="Etiquetas"
                placeholder="Separadas por comas: react, web, api"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                helperText="Ingresa las etiquetas separadas por comas"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Crear Proyecto
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
