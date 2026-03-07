'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Badge, Avatar, Modal, Input, Textarea, Select, Loading, EmptyState } from '@/components/ui';
import { useClientsStore, useContactActivitiesStore, useLeadScoresStore, useProjectsStore, useOpportunitiesStore, useRecurringSchedulesStore, useIncomesStore } from '@/lib/store';
import { ContactActivity, ContactActivityType, Client } from '@/lib/types';
import { cn, formatDate, formatCurrency, formatRelativeTime } from '@/lib/utils';

type TabType = 'overview' | 'timeline' | 'deals' | 'projects' | 'billing' | 'notes';

// Activity type configuration
const activityConfig: Record<ContactActivityType, { icon: string; label: string; color: string }> = {
  call: { icon: '📞', label: 'Llamada', color: 'bg-blue-100 text-blue-700' },
  email: { icon: '📧', label: 'Email', color: 'bg-purple-100 text-purple-700' },
  meeting: { icon: '🤝', label: 'Reunión', color: 'bg-green-100 text-green-700' },
  note: { icon: '📝', label: 'Nota', color: 'bg-gray-100 text-gray-700' },
  whatsapp: { icon: '💬', label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700' },
  task: { icon: '✅', label: 'Tarea', color: 'bg-amber-100 text-amber-700' },
  deal_created: { icon: '🎯', label: 'Deal Creado', color: 'bg-indigo-100 text-indigo-700' },
  deal_won: { icon: '🏆', label: 'Deal Ganado', color: 'bg-green-100 text-green-700' },
  deal_lost: { icon: '❌', label: 'Deal Perdido', color: 'bg-red-100 text-red-700' },
  project_started: { icon: '🚀', label: 'Proyecto Iniciado', color: 'bg-cyan-100 text-cyan-700' },
  payment_received: { icon: '💰', label: 'Pago Recibido', color: 'bg-emerald-100 text-emerald-700' },
  document_sent: { icon: '📄', label: 'Documento Enviado', color: 'bg-slate-100 text-slate-700' },
  proposal_sent: { icon: '📋', label: 'Propuesta Enviada', color: 'bg-violet-100 text-violet-700' },
  follow_up: { icon: '🔔', label: 'Seguimiento', color: 'bg-orange-100 text-orange-700' },
  other: { icon: '📌', label: 'Otro', color: 'bg-gray-100 text-gray-700' },
};

// Temperature colors
const temperatureConfig = {
  cold: { label: 'Frío', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  warm: { label: 'Tibio', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  hot: { label: 'Caliente', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  very_hot: { label: 'Muy Caliente', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const { clients, fetchClients, updateClient } = useClientsStore();
  const { activities, isLoading: activitiesLoading, fetchByContact, createActivity, logCall, logEmail, logMeeting, logNote } = useContactActivitiesStore();
  const { getContactScore, recalculateScore } = useLeadScoresStore();
  const { projects, fetchProjects } = useProjectsStore();
  const { opportunities: deals, fetchOpportunities: fetchDeals } = useOpportunitiesStore();
  const { fetchByClientId: fetchSchedulesByClient, updateSchedule } = useRecurringSchedulesStore();
  const { incomes, fetchIncomes } = useIncomesStore();

  const [client, setClient] = useState<Client | null>(null);
  const [clientActivities, setClientActivities] = useState<ContactActivity[]>([]);
  const [leadScore, setLeadScore] = useState<{ totalScore: number; temperature: string; engagementScore?: number; profileScore?: number; financialScore?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isOnboardingEditOpen, setIsOnboardingEditOpen] = useState(false);
  const [isBillingEditOpen, setIsBillingEditOpen] = useState(false);
  const [clientSchedules, setClientSchedules] = useState<any[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [billingForm, setBillingForm] = useState({ recurring_amount: '', frequency: '', notes: '' });
  const [activityType, setActivityType] = useState<'call' | 'email' | 'meeting' | 'note'>('note');
  const [activityForm, setActivityForm] = useState({ subject: '', description: '', followUpDate: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch client data
  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchDeals();
    fetchIncomes();
  }, [fetchClients, fetchProjects, fetchDeals, fetchIncomes]);

  // Set client when clients are loaded
  useEffect(() => {
    if (clients.length > 0) {
      const foundClient = clients.find(c => c.id === clientId);
      setClient(foundClient || null);
    }
  }, [clients, clientId]);

  // Fetch activities and score
  const loadClientData = useCallback(async () => {
    if (!clientId) return;
    
    const [activitiesData, scoreData, schedulesData] = await Promise.all([
      fetchByContact(clientId),
      getContactScore(clientId),
      fetchSchedulesByClient(clientId),
    ]);
    
    setClientActivities(activitiesData || []);
    setClientSchedules(schedulesData || []);
    if (scoreData) {
      setLeadScore(scoreData);
    }
  }, [clientId, fetchByContact, getContactScore, fetchSchedulesByClient]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // Get client's projects and deals
  const clientProjects = projects.filter(p => p.clientId === clientId);
  const clientDeals = deals.filter(d => d.clientId === clientId);
  const totalRevenue = clientDeals
    .filter(d => d.stage === 'won')
    .reduce((acc, d) => acc + (d.finalAmount ?? d.tentativeAmount ?? d.estimatedAmountMax ?? 0), 0);

  // Handle quick activity logging
  const handleQuickLog = async () => {
    if (!activityForm.subject.trim()) return;
    setIsSubmitting(true);

    try {
      const dateVal = activityForm.followUpDate || undefined;
      switch (activityType) {
        case 'call':
          await logCall(clientId, activityForm.subject, activityForm.description, undefined, dateVal);
          break;
        case 'email':
          await logEmail(clientId, activityForm.subject, activityForm.description, dateVal);
          break;
        case 'meeting':
          await logMeeting(clientId, activityForm.subject, activityForm.description, undefined, dateVal);
          break;
        case 'note':
          await logNote(clientId, activityForm.subject, activityForm.description, dateVal);
          break;
      }
      
      // Refresh data
      await loadClientData();
      
      // Reset form and close modal
      setActivityForm({ subject: '', description: '', followUpDate: '' });
      setIsActivityModalOpen(false);
    } catch (error) {
      console.error('Error logging activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recalculate lead score
  const handleRecalculateScore = async () => {
    const newScore = await recalculateScore(clientId);
    if (newScore !== null) {
      const scoreData = await getContactScore(clientId);
      if (scoreData) setLeadScore(scoreData);
    }
  };

  // Onboarding checklist
  const onboardingItems = client ? [
    { key: 'email', label: 'Email de contacto', done: !!client.email },
    { key: 'phone', label: 'Teléfono', done: !!client.phone },
    { key: 'company', label: 'Empresa', done: !!(client.company || client.companyName) },
    { key: 'position', label: 'Cargo / Posición', done: !!client.position },
  ] : [];
  const onboardingCompleted = onboardingItems.filter(i => i.done).length;
  const isOnboarding = client?.status === 'won' && client?.type === 'client';

  const [onboardingForm, setOnboardingForm] = useState({
    email: '', phone: '', company: '', position: '', notes: '',
  });

  // Sync form when edit modal opens
  const openOnboardingEdit = () => {
    if (!client) return;
    setOnboardingForm({
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || client.companyName || '',
      position: client.position || '',
      notes: '',
    });
    setIsOnboardingEditOpen(true);
  };

  const handleOnboardingSave = async () => {
    if (!client) return;
    const data: Partial<Client> = {};
    if (onboardingForm.email) data.email = onboardingForm.email;
    if (onboardingForm.phone) data.phone = onboardingForm.phone;
    if (onboardingForm.company) { data.company = onboardingForm.company; data.companyName = onboardingForm.company; }
    if (onboardingForm.position) data.position = onboardingForm.position;
    if (onboardingForm.notes) data.notes = (client.notes ? client.notes + '\n' : '') + onboardingForm.notes;
    await updateClient(client.id, data);
    setIsOnboardingEditOpen(false);
    await fetchClients();
  };

  const handleMarkActive = async () => {
    if (!client) return;
    await updateClient(client.id, { status: 'active' });
    await fetchClients();
  };

  if (!client) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  const temp = leadScore?.temperature as keyof typeof temperatureConfig || 'cold';
  const tempConfig = temperatureConfig[temp];

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/clients')} className="mb-4">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Clientes
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={client.name} size="xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              {client.company && <p className="text-gray-500">{client.company}</p>}
              {client.position && <p className="text-sm text-gray-400">{client.position}</p>}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={client.status === 'active' ? 'success' : client.status === 'won' ? 'warning' : 'default'}>
                  {client.status === 'won' ? 'Pendiente onboarding' : client.status}
                </Badge>
                <Badge variant="default">
                  {client.type || 'cliente'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsActivityModalOpen(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Registrar Actividad
            </Button>
          </div>
        </div>
      </div>

      {/* Lead Score Card */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Score Circle */}
              <div className={cn('relative w-24 h-24 rounded-full flex items-center justify-center', tempConfig.bgLight)}>
                <div className={cn('absolute inset-2 rounded-full', tempConfig.color, 'opacity-20')} />
                <div className="text-center z-10">
                  <p className={cn('text-3xl font-bold', tempConfig.textColor)}>
                    {leadScore?.totalScore || 0}
                  </p>
                  <p className="text-xs text-gray-500">puntos</p>
                </div>
              </div>

              {/* Temperature Badge */}
              <div>
                <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium', tempConfig.bgLight, tempConfig.textColor)}>
                  <span className={cn('w-2 h-2 rounded-full', tempConfig.color)} />
                  {tempConfig.label}
                </div>
                <p className="text-sm text-gray-500 mt-1">Temperatura del Lead</p>
              </div>

              {/* Score Breakdown */}
              <div className="flex gap-6 ml-6 pl-6 border-l border-gray-200">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{leadScore?.engagementScore || 0}</p>
                  <p className="text-xs text-gray-500">Engagement</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{leadScore?.profileScore || 0}</p>
                  <p className="text-xs text-gray-500">Perfil</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{leadScore?.financialScore || 0}</p>
                  <p className="text-xs text-gray-500">Financiero</p>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleRecalculateScore}>
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recalcular
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Checklist — shown for recently won clients */}
      {isOnboarding && (
        <Card className="mb-6 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-12 h-12 bg-amber-200 rounded-xl text-2xl">📋</span>
                <div>
                  <h3 className="text-lg font-bold text-amber-900">Onboarding de Cliente</h3>
                  <p className="text-sm text-amber-700">
                    Este cliente fue ganado recientemente. Completá la información pendiente.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-900">{onboardingCompleted}/{onboardingItems.length}</p>
                <p className="text-xs text-amber-600">completados</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="w-full bg-amber-200 rounded-full h-2.5">
                <div
                  className="bg-amber-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${onboardingItems.length > 0 ? (onboardingCompleted / onboardingItems.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              {onboardingItems.map(item => (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    item.done
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-amber-200'
                  )}
                >
                  {item.done ? (
                    <span className="flex items-center justify-center w-7 h-7 bg-green-500 rounded-full">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-7 h-7 border-2 border-amber-300 rounded-full bg-white">
                      <span className="w-2 h-2 bg-amber-300 rounded-full" />
                    </span>
                  )}
                  <span className={cn('text-sm font-medium', item.done ? 'text-green-700 line-through' : 'text-gray-800')}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={openOnboardingEdit}>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Completar Datos
              </Button>
              {onboardingCompleted === onboardingItems.length && (
                <Button variant="outline" onClick={handleMarkActive} className="border-green-500 text-green-700 hover:bg-green-50">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Marcar como Activo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-gray-900">{clientProjects.length}</p>
            <p className="text-sm text-gray-500">Proyectos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-gray-900">{clientDeals.length}</p>
            <p className="text-sm text-gray-500">Deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-gray-500">Ingresos Totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-gray-900">{clientActivities.length}</p>
            <p className="text-sm text-gray-500">Actividades</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'deals', label: 'Deals' },
            { id: 'projects', label: 'Proyectos' },
            { id: 'billing', label: '💰 Facturación' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Info */}
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-gray-900 mb-4">Información de Contacto</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900">{client.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Teléfono</p>
                      <p className="text-gray-900">{client.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Empresa</p>
                      <p className="text-gray-900">{client.company || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Posición</p>
                      <p className="text-gray-900">{client.position || '-'}</p>
                    </div>
                  </div>
                  {client.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">Notas</p>
                      <p className="text-gray-700">{client.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Actividades Recientes</h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('timeline')}>
                      Ver todas
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {clientActivities.slice(0, 5).map((activity) => {
                      const config = activityConfig[activity.activityType];
                      return (
                        <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-xl">{config.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{activity.subject || config.label}</p>
                            {activity.description && (
                              <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatRelativeTime(activity.activityDate)}
                            </p>
                          </div>
                          <Badge className={config.color}>{config.label}</Badge>
                        </div>
                      );
                    })}
                    {clientActivities.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No hay actividades registradas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-900 mb-6">Historial de Actividades</h3>
                
                {activitiesLoading ? (
                  <Loading />
                ) : clientActivities.length === 0 ? (
                  <EmptyState
                    title="Sin actividades"
                    description="No hay actividades registradas para este contacto"
                    icon={
                      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    action={
                      <Button onClick={() => setIsActivityModalOpen(true)}>
                        Registrar Primera Actividad
                      </Button>
                    }
                  />
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                    
                    <div className="space-y-6">
                      {clientActivities.map((activity, index) => {
                        const config = activityConfig[activity.activityType];
                        return (
                          <div key={activity.id} className="relative flex gap-4">
                            {/* Timeline dot */}
                            <div className={cn(
                              'relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-xl',
                              config.color
                            )}>
                              {config.icon}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {activity.subject || config.label}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(activity.activityDate)} • {formatRelativeTime(activity.activityDate)}
                                  </p>
                                </div>
                                <Badge className={config.color}>{config.label}</Badge>
                              </div>
                              
                              {activity.description && (
                                <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                              )}
                              
                              {activity.outcome && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Resultado: </span>
                                  <span className="text-gray-700">{activity.outcome}</span>
                                </div>
                              )}
                              
                              {activity.followUpDate && !activity.isFollowUpDone && (
                                <div className="mt-2 p-2 bg-amber-50 rounded text-sm">
                                  <span className="text-amber-600">🔔 Seguimiento programado: </span>
                                  <span className="text-amber-700 font-medium">
                                    {formatDate(activity.followUpDate)}
                                  </span>
                                </div>
                              )}

                              {activity.sentiment && (
                                <div className="mt-2">
                                  <span className={cn(
                                    'text-xs px-2 py-0.5 rounded-full',
                                    activity.sentiment === 'positive' && 'bg-green-100 text-green-700',
                                    activity.sentiment === 'neutral' && 'bg-gray-100 text-gray-700',
                                    activity.sentiment === 'negative' && 'bg-red-100 text-red-700'
                                  )}>
                                    {activity.sentiment === 'positive' ? '😊 Positivo' : 
                                     activity.sentiment === 'negative' ? '😞 Negativo' : '😐 Neutral'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Deals Tab */}
          {activeTab === 'deals' && (
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-900 mb-4">Deals</h3>
                {clientDeals.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No hay deals para este cliente</p>
                ) : (
                  <div className="space-y-3">
                    {clientDeals.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{deal.title}</p>
                          <p className="text-sm text-gray-500">{deal.stage}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(deal.finalAmount ?? deal.tentativeAmount ?? deal.estimatedAmountMax ?? 0)}</p>
                          <p className="text-xs text-gray-400">{deal.probability}% prob.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-900 mb-4">Proyectos</h3>
                {clientProjects.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No hay proyectos para este cliente</p>
                ) : (
                  <div className="space-y-3">
                    {clientProjects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{project.name}</p>
                          <p className="text-sm text-gray-500">{project.status}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={project.status === 'done' ? 'success' : 'default'}>
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Active Recurring Schedules */}
              {clientSchedules.length > 0 ? (
                clientSchedules.map((schedule) => {
                  const clientIncomes = incomes.filter(i => (i as any).recurringScheduleId === schedule.id || (i as any).recurring_schedule_id === schedule.id);
                  const paidIncomes = clientIncomes.filter(i => i.status === 'received');
                  const pendingIncomes = clientIncomes.filter(i => i.status === 'pending');
                  const overdueIncomes = pendingIncomes.filter(i => i.dueDate && new Date(i.dueDate) < new Date());
                  const frequencyLabels: Record<string, string> = {
                    monthly: 'Mensual',
                    quarterly: 'Trimestral',
                    semi_annual: 'Semestral',
                    annual: 'Anual',
                  };
                  const structureLabels: Record<string, string> = {
                    recurring: 'Recurrente',
                    dev_plus_maintenance: 'Desarrollo + Mantenimiento',
                    one_time: 'Pago Único',
                  };

                  return (
                    <Card key={schedule.id}>
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${schedule.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {structureLabels[schedule.payment_structure] || schedule.payment_structure}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {schedule.recurring_description || `Cobro ${frequencyLabels[schedule.frequency]?.toLowerCase() || schedule.frequency}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${schedule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {schedule.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setBillingForm({
                                recurring_amount: String(schedule.recurring_amount),
                                frequency: schedule.frequency,
                                notes: schedule.notes || '',
                              });
                              setIsBillingEditOpen(true);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </Button>
                        </div>
                      </div>
                      <CardContent>
                        {/* Main Amount Display */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                          <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
                            <p className="text-3xl font-bold text-indigo-700">
                              {schedule.recurring_currency} {Number(schedule.recurring_amount).toLocaleString()}
                            </p>
                            <p className="text-sm text-indigo-500 mt-1">
                              Cobro {frequencyLabels[schedule.frequency] || schedule.frequency}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <p className="text-2xl font-bold text-gray-900">
                              {schedule.next_due_date ? new Date(schedule.next_due_date).toLocaleDateString('es') : '—'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Próximo Cobro</p>
                            {schedule.next_due_date && new Date(schedule.next_due_date) < new Date() && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                ⚠️ Vencido
                              </span>
                            )}
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <p className="text-2xl font-bold text-emerald-600">
                              {schedule.recurring_currency} {Number(schedule.total_paid || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Total Cobrado</p>
                          </div>
                        </div>

                        {/* Dev Payment (for hybrid structures) */}
                        {schedule.payment_structure === 'dev_plus_maintenance' && schedule.dev_amount > 0 && (
                          <div className={`mb-6 p-4 rounded-xl border ${schedule.dev_paid ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {schedule.dev_paid ? (
                                  <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                  </span>
                                ) : (
                                  <span className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white text-sm">$</span>
                                )}
                                <div>
                                  <p className={`font-medium ${schedule.dev_paid ? 'text-green-800' : 'text-amber-800'}`}>
                                    Pago de Desarrollo (único)
                                  </p>
                                  <p className={`text-sm ${schedule.dev_paid ? 'text-green-600' : 'text-amber-600'}`}>
                                    {schedule.dev_description || 'Desarrollo inicial'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${schedule.dev_paid ? 'text-green-700' : 'text-amber-700'}`}>
                                  {schedule.dev_currency} {Number(schedule.dev_amount).toLocaleString()}
                                </p>
                                <p className={`text-xs ${schedule.dev_paid ? 'text-green-500' : 'text-amber-500'}`}>
                                  {schedule.dev_paid ? 'Pagado' : 'Pendiente'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-3 mb-6">
                          <div className="p-3 bg-gray-50 rounded-lg text-center">
                            <p className="text-lg font-bold text-gray-900">{schedule.invoices_generated || 0}</p>
                            <p className="text-xs text-gray-500">Generadas</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg text-center">
                            <p className="text-lg font-bold text-emerald-600">{schedule.invoices_paid || 0}</p>
                            <p className="text-xs text-gray-500">Pagadas</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg text-center">
                            <p className="text-lg font-bold text-amber-600">{pendingIncomes.length}</p>
                            <p className="text-xs text-gray-500">Pendientes</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg text-center">
                            <p className={`text-lg font-bold ${overdueIncomes.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueIncomes.length}</p>
                            <p className="text-xs text-gray-500">Vencidas</p>
                          </div>
                        </div>

                        {/* Schedule Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Inicio:</span>
                            <span className="ml-2 font-medium text-gray-900">{schedule.start_date ? new Date(schedule.start_date).toLocaleDateString('es') : '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Fin:</span>
                            <span className="ml-2 font-medium text-gray-900">{schedule.end_date ? new Date(schedule.end_date).toLocaleDateString('es') : 'Indefinido'}</span>
                          </div>
                        </div>

                        {/* Recent Incomes for this schedule */}
                        {clientIncomes.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Últimos Cobros</h4>
                            <div className="space-y-2">
                              {clientIncomes.slice(0, 5).map((income) => (
                                <div key={income.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                  <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${income.status === 'received' ? 'bg-emerald-500' : income.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{income.description || 'Cobro recurrente'}</p>
                                      <p className="text-xs text-gray-500">{income.dueDate ? new Date(income.dueDate).toLocaleDateString('es') : '—'}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">{formatCurrency(income.amount)}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${income.status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {income.status === 'received' ? 'Cobrado' : 'Pendiente'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {schedule.notes && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-400">Notas</p>
                            <p className="text-sm text-gray-600">{schedule.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin plan de facturación</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                      Este cliente no tiene un plan de cobro recurrente. Se crea automáticamente al ganar un deal con estructura de pago recurrente.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* All client incomes */}
              <Card>
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Historial de Ingresos</h3>
                </div>
                <CardContent>
                  {(() => {
                    const allClientIncomes = incomes.filter(i => (i as any).clientId === clientId || (i as any).client_id === clientId);
                    if (allClientIncomes.length === 0) {
                      return <p className="text-sm text-gray-500 text-center py-6">No hay ingresos registrados para este cliente</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {allClientIncomes.map((income) => (
                          <div key={income.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${income.status === 'received' ? 'bg-emerald-500' : income.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{income.description || 'Ingreso'}</p>
                                <p className="text-xs text-gray-500">
                                  {income.dueDate ? new Date(income.dueDate).toLocaleDateString('es') : '—'}
                                  {(income as any).is_development_payment && <span className="ml-2 text-indigo-500">• Desarrollo</span>}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-900">{formatCurrency(income.amount)}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${income.status === 'received' ? 'bg-emerald-100 text-emerald-700' : income.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {income.status === 'received' ? 'Cobrado' : income.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardContent>
              <h3 className="font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-col h-auto py-3"
                  onClick={() => { setActivityType('call'); setIsActivityModalOpen(true); }}
                >
                  <span className="text-xl mb-1">📞</span>
                  <span className="text-xs">Llamada</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-col h-auto py-3"
                  onClick={() => { setActivityType('email'); setIsActivityModalOpen(true); }}
                >
                  <span className="text-xl mb-1">📧</span>
                  <span className="text-xs">Email</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-col h-auto py-3"
                  onClick={() => { setActivityType('meeting'); setIsActivityModalOpen(true); }}
                >
                  <span className="text-xl mb-1">🤝</span>
                  <span className="text-xs">Reunión</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-col h-auto py-3"
                  onClick={() => { setActivityType('note'); setIsActivityModalOpen(true); }}
                >
                  <span className="text-xl mb-1">📝</span>
                  <span className="text-xs">Nota</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-900 mb-3">Etiquetas</h3>
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Quick Info */}
          <Card>
            <CardContent>
              <h3 className="font-semibold text-gray-900 mb-3">Contacto</h3>
              <div className="space-y-3">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {client.email}
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {client.phone}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title={`Registrar ${activityConfig[activityType].label}`}
      >
        <div className="space-y-4">
          {/* Activity Type Selector */}
          <div className="flex gap-2">
            {(['call', 'email', 'meeting', 'note'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActivityType(type)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                  activityType === type
                    ? activityConfig[type].color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {activityConfig[type].icon} {activityConfig[type].label}
              </button>
            ))}
          </div>

          <Input
            label="Asunto"
            placeholder={`Ej: ${activityType === 'call' ? 'Llamada de seguimiento' : activityType === 'email' ? 'Propuesta enviada' : activityType === 'meeting' ? 'Reunión inicial' : 'Nota importante'}`}
            value={activityForm.subject}
            onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
          />

          <Textarea
            label="Descripción"
            placeholder="Detalles de la actividad..."
            value={activityForm.description}
            onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
            rows={4}
          />

          <Input
            label="Fecha y Hora del Evento"
            type="datetime-local"
            value={activityForm.followUpDate}
            onChange={(e) => setActivityForm({ ...activityForm, followUpDate: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsActivityModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickLog} disabled={isSubmitting || !activityForm.subject.trim()}>
              {isSubmitting ? 'Guardando...' : 'Guardar Actividad'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Billing Edit Modal */}
      <Modal
        isOpen={isBillingEditOpen}
        onClose={() => setIsBillingEditOpen(false)}
        title="Editar Plan de Facturación"
        size="lg"
      >
        {editingSchedule && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm font-medium text-blue-900">Cambiar monto de cobro</p>
              </div>
              <p className="text-xs text-blue-700">
                Monto actual: <span className="font-bold">{editingSchedule.recurring_currency} {Number(editingSchedule.recurring_amount).toLocaleString()}</span> / {editingSchedule.frequency === 'monthly' ? 'mes' : editingSchedule.frequency === 'quarterly' ? 'trimestre' : editingSchedule.frequency === 'annual' ? 'año' : editingSchedule.frequency}. El cambio se aplicará a los próximos cobros generados.
              </p>
            </div>

            <Input
              label="Nuevo Monto"
              type="number"
              placeholder="0.00"
              value={billingForm.recurring_amount}
              onChange={(e) => setBillingForm({ ...billingForm, recurring_amount: e.target.value })}
            />

            <Select
              label="Frecuencia"
              value={billingForm.frequency}
              onChange={(e) => setBillingForm({ ...billingForm, frequency: e.target.value })}
              options={[
                { value: 'monthly', label: 'Mensual' },
                { value: 'quarterly', label: 'Trimestral' },
                { value: 'semi_annual', label: 'Semestral' },
                { value: 'annual', label: 'Anual' },
              ]}
            />

            <Textarea
              label="Nota del cambio (opcional)"
              placeholder="Ej: Se subió el precio por ampliación de servicios..."
              value={billingForm.notes}
              onChange={(e) => setBillingForm({ ...billingForm, notes: e.target.value })}
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsBillingEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!editingSchedule) return;
                  const oldAmount = editingSchedule.recurring_amount;
                  const newAmount = parseFloat(billingForm.recurring_amount);
                  if (isNaN(newAmount) || newAmount < 0) return;

                  const changeLog = editingSchedule.metadata?.price_changes || [];
                  changeLog.push({
                    date: new Date().toISOString(),
                    old_amount: oldAmount,
                    new_amount: newAmount,
                    old_frequency: editingSchedule.frequency,
                    new_frequency: billingForm.frequency,
                    note: billingForm.notes || undefined,
                  });

                  await updateSchedule(editingSchedule.id, {
                    recurring_amount: newAmount,
                    frequency: billingForm.frequency,
                    notes: billingForm.notes || editingSchedule.notes,
                    metadata: { ...editingSchedule.metadata, price_changes: changeLog },
                  } as any);

                  // Refresh data
                  const updated = await fetchSchedulesByClient(clientId);
                  setClientSchedules(updated || []);
                  setIsBillingEditOpen(false);
                  setEditingSchedule(null);
                }}
              >
                Guardar Cambios
              </Button>
            </div>

            {/* Price Change History */}
            {editingSchedule.metadata?.price_changes && editingSchedule.metadata.price_changes.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Historial de Cambios de Precio</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(editingSchedule.metadata.price_changes as any[]).slice().reverse().map((change: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="text-gray-500">{new Date(change.date).toLocaleDateString('es')}</p>
                        {change.note && <p className="text-xs text-gray-400 mt-0.5">{change.note}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 line-through">{Number(change.old_amount).toLocaleString()}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        <span className="font-bold text-gray-900">{Number(change.new_amount).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Onboarding Edit Modal */}
      <Modal
        isOpen={isOnboardingEditOpen}
        onClose={() => setIsOnboardingEditOpen(false)}
        title="Completar Datos del Cliente"
        size="lg"
      >
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Completá los datos faltantes de este cliente. Los campos que ya tienen información se muestran prellenados.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email *"
              type="email"
              placeholder="cliente@empresa.com"
              value={onboardingForm.email}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
            />
            <Input
              label="Teléfono *"
              placeholder="+598 99 123 456"
              value={onboardingForm.phone}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Empresa *"
              placeholder="Nombre de la empresa"
              value={onboardingForm.company}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, company: e.target.value })}
            />
            <Input
              label="Cargo / Posición *"
              placeholder="CEO, Gerente, etc."
              value={onboardingForm.position}
              onChange={(e) => setOnboardingForm({ ...onboardingForm, position: e.target.value })}
            />
          </div>

          <Textarea
            label="Notas adicionales"
            placeholder="Condiciones de pago, servicio contratado, datos fiscales..."
            value={onboardingForm.notes}
            onChange={(e) => setOnboardingForm({ ...onboardingForm, notes: e.target.value })}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOnboardingEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOnboardingSave}>
              Guardar Datos
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
