'use client';

import { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Card, Button, Input, Badge, Modal } from '@/components/ui';
import { CompanyBadge, CompanySelector } from '@/components/ui';
import { useAuthStore, useCompanyStore } from '@/lib/store';
import { enterpriseHelpers } from '@/lib/enterprise-helpers';

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  schedule_cron: string | null;
  schedule_timezone: string;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  last_error: string | null;
  created_at: string;
  steps?: AutomationStep[];
}

interface AutomationStep {
  id: string;
  step_order: number;
  action_type: string;
  action_config: Record<string, unknown>;
  delay_minutes: number | null;
}

interface AutomationLog {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  steps_completed: number;
  error_message: string | null;
}

export default function AutomationsPage() {
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();
  const [formCompanyId, setFormCompanyId] = useState(selectedCompanyId || '');
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'deal_created',
    steps: [{ actionType: 'send_notification', actionConfig: {} as Record<string, string>, delayMinutes: 0 }],
  });

  useEffect(() => {
    if (user?.id) {
      loadAutomations();
    }
  }, [user?.id]);

  const loadAutomations = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await enterpriseHelpers.automations.getAll(user.id);
    if (!error && data) {
      setAutomations(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const { error } = await enterpriseHelpers.automations.create({
      userId: user.id,
      myCompanyId: formCompanyId || selectedCompanyId || undefined,
      name: formData.name,
      description: formData.description || undefined,
      triggerType: formData.triggerType,
      steps: formData.steps.map((step) => ({
        actionType: step.actionType,
        actionConfig: step.actionConfig,
        delayMinutes: step.delayMinutes || undefined,
      })),
    });

    if (!error) {
      loadAutomations();
      closeModal();
    }
  };

  const handleToggleActive = async (automation: Automation) => {
    await enterpriseHelpers.automations.toggleActive(automation.id, !automation.is_active);
    loadAutomations();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta automatización?')) {
      await enterpriseHelpers.automations.delete(id);
      loadAutomations();
    }
  };

  const handleViewLogs = async (automation: Automation) => {
    setSelectedAutomation(automation);
    const { data } = await enterpriseHelpers.automations.getLogs(automation.id);
    setLogs(data || []);
    setShowLogsModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      name: '',
      description: '',
      triggerType: 'deal_created',
      steps: [{ actionType: 'send_notification', actionConfig: {}, delayMinutes: 0 }],
    });
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { actionType: 'send_notification', actionConfig: {}, delayMinutes: 0 }],
    });
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      setFormData({
        ...formData,
        steps: formData.steps.filter((_, i) => i !== index),
      });
    }
  };

  const updateStep = (index: number, field: string, value: string) => {
    const newSteps = [...formData.steps];
    if (field === 'actionType') {
      newSteps[index].actionType = value;
      newSteps[index].actionConfig = {};
    } else if (field === 'delayMinutes') {
      newSteps[index].delayMinutes = parseInt(value) || 0;
    } else {
      newSteps[index].actionConfig = { ...newSteps[index].actionConfig, [field]: value };
    }
    setFormData({ ...formData, steps: newSteps });
  };

  const triggers = [
    { value: 'contact_created', label: 'Contacto Creado', icon: '👤' },
    { value: 'deal_created', label: 'Deal Creado', icon: '💼' },
    { value: 'deal_stage_changed', label: 'Deal Cambió de Etapa', icon: '📊' },
    { value: 'deal_won', label: 'Deal Ganado', icon: '🎉' },
    { value: 'deal_lost', label: 'Deal Perdido', icon: '😔' },
    { value: 'project_created', label: 'Proyecto Creado', icon: '📁' },
    { value: 'project_completed', label: 'Proyecto Completado', icon: '✅' },
    { value: 'task_created', label: 'Tarea Creada', icon: '📋' },
    { value: 'task_completed', label: 'Tarea Completada', icon: '☑️' },
    { value: 'task_overdue', label: 'Tarea Vencida', icon: '⚠️' },
    { value: 'payment_received', label: 'Pago Recibido', icon: '💰' },
    { value: 'invoice_overdue', label: 'Factura Vencida', icon: '📅' },
  ];

  const actions = [
    { value: 'send_notification', label: 'Enviar Notificación', icon: '🔔' },
    { value: 'send_email', label: 'Enviar Email', icon: '📧' },
    { value: 'create_task', label: 'Crear Tarea', icon: '📋' },
    { value: 'add_tag', label: 'Agregar Tag', icon: '🏷️' },
    { value: 'webhook', label: 'Webhook', icon: '🔗' },
  ];

  const getTrigger = (type: string) => triggers.find(t => t.value === type) || { value: type, label: type, icon: '⚡' };
  const getAction = (type: string) => actions.find(a => a.value === type) || { value: type, label: type, icon: '⚙️' };

  // Stats
  const activeCount = automations.filter(a => a.is_active).length;
  const totalRuns = automations.reduce((acc, a) => acc + a.run_count, 0);

  return (
    <MainLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automatizaciones</h1>
          <p className="text-gray-500">Automatiza tareas repetitivas de tu negocio</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + Nueva Automatización
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{automations.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Activas</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Ejecuciones Totales</p>
          <p className="text-2xl font-bold text-blue-600">{totalRuns}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Inactivas</p>
          <p className="text-2xl font-bold text-gray-400">{automations.length - activeCount}</p>
        </Card>
      </div>

      {/* Automations List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : automations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay automatizaciones</h3>
          <p className="text-gray-500 mb-4">Crea tu primera automatización para ahorrar tiempo</p>
          <Button onClick={() => setShowModal(true)}>
            + Crear Automatización
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {automations.map((automation) => {
            const trigger = getTrigger(automation.trigger_type);
            
            return (
              <Card key={automation.id} className={`p-5 ${!automation.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleActive(automation)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        automation.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          automation.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{automation.name}</h3>
                        <CompanyBadge companyId={(automation as any).my_company_id} />
                        <Badge variant={automation.is_active ? 'success' : 'default'}>
                          {automation.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      
                      {automation.description && (
                        <p className="text-sm text-gray-500 mb-3">{automation.description}</p>
                      )}
                      
                      {/* Trigger */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{trigger.icon}</span>
                        <span className="font-medium">Cuando:</span>
                        <span className="text-gray-600">{trigger.label}</span>
                      </div>
                      
                      {/* Steps */}
                      {automation.steps && automation.steps.length > 0 && (
                        <div className="mt-3 pl-6 border-l-2 border-gray-200 space-y-2">
                          {automation.steps.map((step, index) => {
                            const action = getAction(step.action_type);
                            return (
                              <div key={step.id} className="flex items-center gap-2 text-sm text-gray-600">
                                <span>{action.icon}</span>
                                <span>{action.label}</span>
                                {step.delay_minutes && step.delay_minutes > 0 && (
                                  <Badge variant="default" className="text-xs">
                                    +{step.delay_minutes} min
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Stats */}
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                        <span>🔄 {automation.run_count} ejecuciones</span>
                        {automation.last_run_at && (
                          <span>Última: {new Date(automation.last_run_at).toLocaleString()}</span>
                        )}
                        {automation.last_error && (
                          <span className="text-red-500">⚠️ Error en última ejecución</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViewLogs(automation)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded"
                      title="Ver historial"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(automation.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title="Nueva Automatización">
          <form onSubmit={handleSubmit} className="space-y-4">
              <CompanySelector
                value={formCompanyId || selectedCompanyId || ''}
                onChange={(id) => setFormCompanyId(id)}
                label="Empresa"
              />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Notificar al cerrar deal"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la automatización"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuando esto suceda...</label>
              <select
                value={formData.triggerType}
                onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {triggers.map((trigger) => (
                  <option key={trigger.value} value={trigger.value}>
                    {trigger.icon} {trigger.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entonces hacer...</label>
              <div className="space-y-3">
                {formData.steps.map((step, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Paso {index + 1}</span>
                      {formData.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    
                    <select
                      value={step.actionType}
                      onChange={(e) => updateStep(index, 'actionType', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {actions.map((action) => (
                        <option key={action.value} value={action.value}>
                          {action.icon} {action.label}
                        </option>
                      ))}
                    </select>
                    
                    {/* Action-specific config */}
                    {step.actionType === 'send_notification' && (
                      <>
                        <Input
                          placeholder="Título de la notificación"
                          value={(step.actionConfig as any).title || ''}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                        />
                        <Input
                          placeholder="Mensaje"
                          value={(step.actionConfig as any).message || ''}
                          onChange={(e) => updateStep(index, 'message', e.target.value)}
                        />
                      </>
                    )}
                    
                    {step.actionType === 'send_email' && (
                      <>
                        <Input
                          placeholder="Asunto del email"
                          value={(step.actionConfig as any).subject || ''}
                          onChange={(e) => updateStep(index, 'subject', e.target.value)}
                        />
                        <textarea
                          placeholder="Cuerpo del email"
                          value={(step.actionConfig as any).body || ''}
                          onChange={(e) => updateStep(index, 'body', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </>
                    )}
                    
                    {step.actionType === 'create_task' && (
                      <>
                        <Input
                          placeholder="Título de la tarea"
                          value={(step.actionConfig as any).title || ''}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                        />
                        <Input
                          placeholder="Descripción"
                          value={(step.actionConfig as any).description || ''}
                          onChange={(e) => updateStep(index, 'description', e.target.value)}
                        />
                      </>
                    )}
                    
                    {step.actionType === 'add_tag' && (
                      <Input
                        placeholder="Tag a agregar"
                        value={(step.actionConfig as any).tag || ''}
                        onChange={(e) => updateStep(index, 'tag', e.target.value)}
                      />
                    )}
                    
                    {step.actionType === 'webhook' && (
                      <Input
                        placeholder="URL del webhook"
                        value={(step.actionConfig as any).url || ''}
                        onChange={(e) => updateStep(index, 'url', e.target.value)}
                      />
                    )}
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Retraso (minutos)</label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={step.delayMinutes || ''}
                        onChange={(e) => updateStep(index, 'delayMinutes', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  + Agregar Paso
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Automatización
              </Button>
            </div>
          </form>
        </Modal>

      {/* Logs Modal */}
      <Modal isOpen={showLogsModal && !!selectedAutomation} onClose={() => setShowLogsModal(false)} title={selectedAutomation ? `Historial: ${selectedAutomation.name}` : 'Historial'}>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay ejecuciones registradas</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant={log.status === 'success' ? 'success' : log.status === 'failed' ? 'danger' : 'warning'}
                    >
                      {log.status === 'success' ? 'Exitoso' : log.status === 'failed' ? 'Fallido' : 'Omitido'}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(log.started_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Pasos completados: {log.steps_completed}
                  </p>
                  {log.error_message && (
                    <p className="text-sm text-red-500 mt-1">Error: {log.error_message}</p>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setShowLogsModal(false)}>
              Cerrar
            </Button>
          </div>
        </Modal>
    </div>
    </MainLayout>
  );
}
