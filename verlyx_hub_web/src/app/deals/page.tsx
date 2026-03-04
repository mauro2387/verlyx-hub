'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Loading, Modal, Input, Textarea, Select, ConfirmDialog, StatCard, Badge, SearchInput, CompanyBadge } from '@/components/ui';
import { useOpportunitiesStore, useClientsStore, useCompanyStore } from '@/lib/store';
import { Opportunity, OpportunityStage, PaymentStructure } from '@/lib/types';
import { opportunityStageColors, priorityColors, formatCurrency, cn } from '@/lib/utils';

const OPP_STAGES: OpportunityStage[] = ['qualified', 'proposal', 'negotiation', 'won', 'lost'];

type ViewMode = 'kanban' | 'table' | 'stats';

interface OppFormData {
  title: string;
  description: string;
  stage: OpportunityStage;
  priority: string;
  clientId: string;
  currency: string;
  needDetected: string;
  nextAction: string;
  nextActionDate: string;
  proposedService: string;
  proposalSent: boolean;
  proposalDate: string;
  estimatedAmountMin: string;
  estimatedAmountMax: string;
  tentativeAmount: string;
  nextInteractionDate: string;
  finalAmount: string;
  finalCurrency: string;
  paymentType: string;
  startDate: string;
  wonReason: string;
  lostReason: string;
  lostNote: string;
  probability: string;
  source: string;
}

const EMPTY_FORM: OppFormData = {
  title: '',
  description: '',
  stage: 'qualified',
  priority: 'medium',
  clientId: '',
  currency: 'UYU',
  needDetected: '',
  nextAction: '',
  nextActionDate: '',
  proposedService: '',
  proposalSent: false,
  proposalDate: '',
  estimatedAmountMin: '',
  estimatedAmountMax: '',
  tentativeAmount: '',
  nextInteractionDate: '',
  finalAmount: '',
  finalCurrency: 'UYU',
  paymentType: '',
  startDate: '',
  wonReason: '',
  lostReason: '',
  lostNote: '',
  probability: '20',
  source: '',
};

/** Get the best available amount from an Opportunity for display */
function getOppAmount(opp: Opportunity): number {
  if (opp.finalAmount) return opp.finalAmount;
  if (opp.tentativeAmount) return opp.tentativeAmount;
  if (opp.estimatedAmountMax) return opp.estimatedAmountMax;
  if (opp.estimatedAmountMin) return opp.estimatedAmountMin;
  return 0;
}

export default function DealsPage() {
  const {
    opportunities, isLoading, fetchOpportunities,
    createOpportunity, updateOpportunity, deleteOpportunity, changeStage,
  } = useOpportunitiesStore();
  const { clients, fetchClients } = useClientsStore();
  // selectedCompanyId used as default for new items
  const { selectedCompanyId } = useCompanyStore();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [oppToDelete, setOppToDelete] = useState<Opportunity | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');

  // Stage transition dialogs
  const [wonDialogOpen, setWonDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [stageTransitionOpp, setStageTransitionOpp] = useState<Opportunity | null>(null);
  const [wonFormData, setWonFormData] = useState({
    finalAmount: '',
    finalCurrency: 'UYU',
    paymentType: '' as string,
    paymentStructure: '' as '' | 'one_time' | 'recurring' | 'dev_plus_maintenance',
    devAmount: '',
    recurringAmount: '',
    recurringFrequency: 'monthly' as string,
    startDate: '',
    wonReason: '',
  });
  const [lostFormData, setLostFormData] = useState({ lostReason: '', lostNote: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wonSuccessData, setWonSuccessData] = useState<{
    oppTitle: string;
    projectId?: string;
    clientId?: string;
    incomeId?: string;
    scheduleId?: string;
    paymentStructure?: PaymentStructure;
    amount: number;
    currency: string;
  } | null>(null);
  const [formData, setFormData] = useState<OppFormData>(EMPTY_FORM);
  const router = useRouter();

  useEffect(() => {
    fetchOpportunities();
    fetchClients();
  }, [fetchOpportunities, fetchClients]);

  const filteredOpps = useMemo(() => {
    return opportunities.filter(opp => {
      const matchesSearch = !searchTerm ||
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = !filterStage || opp.stage === filterStage;
      const matchesPriority = !filterPriority || opp.priority === filterPriority;
      return matchesSearch && matchesStage && matchesPriority;
    });
  }, [opportunities, searchTerm, filterStage, filterPriority]);

  const oppStats = useMemo(() => {
    const active = opportunities.filter(o => o.isActive);
    const won = opportunities.filter(o => o.stage === 'won');
    const lost = opportunities.filter(o => o.stage === 'lost');
    const totalValue = active.reduce((s, o) => s + getOppAmount(o), 0);
    const weightedValue = active.reduce((s, o) => s + (o.expectedRevenue || 0), 0);

    return {
      total: opportunities.length,
      active: active.length,
      won: won.length,
      lost: lost.length,
      totalValue,
      weightedValue,
      wonValue: won.reduce((s, o) => s + (o.finalAmount || 0), 0),
      avgDealSize: active.length > 0 ? totalValue / active.length : 0,
      winRate: (won.length + lost.length) > 0 ? (won.length / (won.length + lost.length)) * 100 : 0,
    };
  }, [opportunities]);

  const stageStats = useMemo(() => {
    return OPP_STAGES.map(stage => {
      const stageOpps = opportunities.filter(o => o.stage === stage);
      return {
        stage,
        count: stageOpps.length,
        value: stageOpps.reduce((s, o) => s + getOppAmount(o), 0),
      };
    });
  }, [opportunities]);

  const getOppsByStage = (stage: OpportunityStage) => filteredOpps.filter(o => o.stage === stage);

  const getClientName = (clientId: string | null | undefined) => {
    if (!clientId) return 'Sin cliente';
    return clients.find(c => c.id === clientId)?.name || 'Cliente';
  };

  const handleOpenModal = (opp?: Opportunity) => {
    if (opp) {
      setEditingOpp(opp);
      setFormData({
        title: opp.title,
        description: opp.description || '',
        stage: opp.stage,
        priority: opp.priority || 'medium',
        clientId: opp.clientId || '',
        currency: opp.currency || 'UYU',
        needDetected: opp.needDetected || '',
        nextAction: opp.nextAction || '',
        nextActionDate: opp.nextActionDate?.split('T')[0] || '',
        proposedService: opp.proposedService || '',
        proposalSent: opp.proposalSent || false,
        proposalDate: opp.proposalDate?.split('T')[0] || '',
        estimatedAmountMin: opp.estimatedAmountMin?.toString() || '',
        estimatedAmountMax: opp.estimatedAmountMax?.toString() || '',
        tentativeAmount: opp.tentativeAmount?.toString() || '',
        nextInteractionDate: opp.nextInteractionDate?.split('T')[0] || '',
        finalAmount: opp.finalAmount?.toString() || '',
        finalCurrency: opp.finalCurrency || 'UYU',
        paymentType: opp.paymentType || '',
        startDate: opp.startDate?.split('T')[0] || '',
        wonReason: opp.wonReason || '',
        lostReason: opp.lostReason || '',
        lostNote: opp.lostNote || '',
        probability: opp.probability?.toString() || '20',
        source: opp.source || '',
      });
    } else {
      setEditingOpp(null);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setIsSubmitting(true);

    const oppData: Partial<Opportunity> = {
      title: formData.title,
      description: formData.description || null,
      stage: formData.stage,
      priority: formData.priority as Opportunity['priority'],
      clientId: formData.clientId || null,
      currency: formData.currency,
      needDetected: formData.needDetected || null,
      nextAction: formData.nextAction || 'Definir próximo paso',
      nextActionDate: formData.nextActionDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      proposedService: formData.proposedService || null,
      proposalSent: formData.proposalSent,
      proposalDate: formData.proposalDate || null,
      estimatedAmountMin: formData.estimatedAmountMin ? parseFloat(formData.estimatedAmountMin) : null,
      estimatedAmountMax: formData.estimatedAmountMax ? parseFloat(formData.estimatedAmountMax) : null,
      tentativeAmount: formData.tentativeAmount ? parseFloat(formData.tentativeAmount) : null,
      nextInteractionDate: formData.nextInteractionDate || null,
      finalAmount: formData.finalAmount ? parseFloat(formData.finalAmount) : null,
      finalCurrency: formData.finalCurrency || null,
      paymentType: (formData.paymentType || null) as Opportunity['paymentType'],
      startDate: formData.startDate || null,
      wonReason: formData.wonReason || null,
      lostReason: formData.lostReason || null,
      lostNote: formData.lostNote || null,
      source: formData.source || null,
      isActive: !['won', 'lost'].includes(formData.stage),
    };

    if (editingOpp) {
      await updateOpportunity(editingOpp.id, oppData);
    } else {
      await createOpportunity(oppData);
    }
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (opp: Opportunity) => {
    setOppToDelete(opp);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (oppToDelete) {
      await deleteOpportunity(oppToDelete.id);
      setDeleteDialogOpen(false);
      setOppToDelete(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('oppId', oppId);
  };

  const handleDrop = async (e: React.DragEvent, newStage: OpportunityStage) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData('oppId');
    if (!oppId) return;

    const opp = opportunities.find(o => o.id === oppId);
    if (!opp || opp.stage === newStage) return;

    // WON requires mandatory fields — show dialog
    if (newStage === 'won') {
      setStageTransitionOpp(opp);
      setWonFormData({
        finalAmount: opp.tentativeAmount?.toString() || opp.estimatedAmountMax?.toString() || '',
        finalCurrency: opp.currency || 'UYU',
        paymentType: '',
        paymentStructure: '',
        devAmount: '',
        recurringAmount: '',
        recurringFrequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        wonReason: '',
      });
      setWonDialogOpen(true);
      return;
    }

    // LOST requires reason — show dialog
    if (newStage === 'lost') {
      setStageTransitionOpp(opp);
      setLostFormData({ lostReason: '', lostNote: '' });
      setLostDialogOpen(true);
      return;
    }

    // PROPOSAL requires proposed_service
    if (newStage === 'proposal' && !opp.proposedService) {
      await changeStage(oppId, newStage, {
        proposed_service: opp.title,
      });
      return;
    }

    // NEGOTIATION requires next_interaction_date
    if (newStage === 'negotiation' && !opp.nextInteractionDate) {
      await changeStage(oppId, newStage, {
        next_interaction_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      });
      return;
    }

    await changeStage(oppId, newStage, {});
  };

  const handleWonConfirm = async () => {
    if (!stageTransitionOpp) return;
    if (!wonFormData.paymentStructure) return;

    // Validate amounts based on payment structure
    if (wonFormData.paymentStructure === 'one_time') {
      if (!wonFormData.finalAmount || parseFloat(wonFormData.finalAmount) <= 0) return;
    } else if (wonFormData.paymentStructure === 'recurring') {
      if (!wonFormData.recurringAmount || parseFloat(wonFormData.recurringAmount) <= 0) return;
    } else if (wonFormData.paymentStructure === 'dev_plus_maintenance') {
      if (!wonFormData.devAmount || parseFloat(wonFormData.devAmount) <= 0) return;
      if (!wonFormData.recurringAmount || parseFloat(wonFormData.recurringAmount) <= 0) return;
    }

    // Calculate total finalAmount
    let totalAmount = 0;
    if (wonFormData.paymentStructure === 'one_time') {
      totalAmount = parseFloat(wonFormData.finalAmount);
    } else if (wonFormData.paymentStructure === 'recurring') {
      totalAmount = parseFloat(wonFormData.recurringAmount);
    } else if (wonFormData.paymentStructure === 'dev_plus_maintenance') {
      totalAmount = parseFloat(wonFormData.devAmount) + parseFloat(wonFormData.recurringAmount);
    }

    // Map structure to legacy payment_type for column compatibility
    const paymentTypeMap: Record<string, string> = {
      one_time: 'one_time',
      recurring: wonFormData.recurringFrequency || 'monthly',
      dev_plus_maintenance: 'custom',
    };

    setIsSubmitting(true);
    const success = await changeStage(stageTransitionOpp.id, 'won', {
      final_amount: totalAmount,
      final_currency: wonFormData.finalCurrency || 'UYU',
      payment_type: paymentTypeMap[wonFormData.paymentStructure] || 'one_time',
      start_date: wonFormData.startDate || new Date().toISOString().split('T')[0],
      won_reason: wonFormData.wonReason || null,
      custom_fields: {
        ...(stageTransitionOpp.customFields || {}),
        payment_structure: wonFormData.paymentStructure,
        dev_amount: wonFormData.paymentStructure === 'dev_plus_maintenance' ? parseFloat(wonFormData.devAmount) : 0,
        recurring_amount: wonFormData.paymentStructure !== 'one_time' ? parseFloat(wonFormData.recurringAmount) : 0,
        recurring_frequency: wonFormData.recurringFrequency || 'monthly',
      },
    });

    if (success) {
      // Execute lifecycle automation: create client, project, incomes, schedules
      const result = await useOpportunitiesStore.getState().executeOpportunityWon(stageTransitionOpp.id);
      setWonSuccessData({
        oppTitle: stageTransitionOpp.title,
        projectId: result?.projectId,
        clientId: result?.clientId,
        incomeId: result?.incomeId,
        scheduleId: result?.scheduleId,
        paymentStructure: result?.paymentStructure as PaymentStructure | undefined,
        amount: totalAmount,
        currency: wonFormData.finalCurrency || 'UYU',
      });
    }

    setIsSubmitting(false);
    setWonDialogOpen(false);
    setStageTransitionOpp(null);
  };

  const handleLostConfirm = async () => {
    if (!stageTransitionOpp) return;
    if (!lostFormData.lostReason) return;

    setIsSubmitting(true);
    await changeStage(stageTransitionOpp.id, 'lost', {
      lost_reason: lostFormData.lostReason,
      lost_note: lostFormData.lostNote || null,
    });

    setIsSubmitting(false);
    setLostDialogOpen(false);
    setStageTransitionOpp(null);
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
        title="Oportunidades"
        description={`${opportunities.length} oportunidades en el pipeline`}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  viewMode === 'stats'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Oportunidad
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar oportunidades..."
              className="flex-1 min-w-[200px]"
            />
            <Select
              placeholder="Todas las etapas"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              options={[
                { value: '', label: 'Todas las etapas' },
                ...OPP_STAGES.map(s => ({ value: s, label: opportunityStageColors[s]?.label || s })),
              ]}
            />
            <Select
              placeholder="Todas las prioridades"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              options={[
                { value: '', label: 'Todas las prioridades' },
                { value: 'low', label: 'Baja' },
                { value: 'medium', label: 'Media' },
                { value: 'high', label: 'Alta' },
                { value: 'urgent', label: 'Urgente' },
              ]}
            />
            <Button variant="outline" onClick={() => setShowStats(!showStats)}>
              {showStats ? 'Ocultar' : 'Mostrar'} Estadísticas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Dashboard */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Total"
            value={oppStats.total}
            color="indigo"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            title="Activas"
            value={oppStats.active}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title="Ganadas"
            value={oppStats.won}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Perdidas"
            value={oppStats.lost}
            color="red"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Valor Pipeline"
            value={formatCurrency(oppStats.totalValue)}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Tasa de Éxito"
            value={`${oppStats.winRate.toFixed(1)}%`}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {OPP_STAGES.map((stage) => {
            const stageStat = stageStats.find(s => s.stage === stage);
            const stageOpps = getOppsByStage(stage);

            return (
              <div
                key={stage}
                className="flex-shrink-0 w-80"
                onDrop={(e) => handleDrop(e, stage)}
                onDragOver={handleDragOver}
              >
                <div
                  className="rounded-t-lg px-4 py-3"
                  style={{ backgroundColor: `${opportunityStageColors[stage]?.color}20` }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold" style={{ color: opportunityStageColors[stage]?.color }}>
                      {opportunityStageColors[stage]?.label}
                    </h3>
                    <span className="text-sm font-medium bg-white px-2 py-0.5 rounded-full shadow-sm">
                      {stageOpps.length}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: opportunityStageColors[stage]?.color }}>
                    {formatCurrency(stageStat?.value || 0)}
                  </p>
                </div>
                <div className="bg-gray-100/50 rounded-b-lg p-3 min-h-[400px] space-y-3">
                  {stageOpps.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">Sin oportunidades</p>
                  ) : (
                    stageOpps.map((opp) => (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        className="bg-white rounded-lg shadow-sm p-4 cursor-move hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <h4 className="font-medium text-gray-900 text-sm truncate">{opp.title}</h4>
                            <CompanyBadge companyId={opp.myCompanyId} size="xs" />
                          </div>
                          <div className="flex gap-1 ml-1">
                            <button
                              onClick={() => handleOpenModal(opp)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(opp)}
                              className="p-1 hover:bg-red-50 rounded"
                            >
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 mb-3">{getClientName(opp.clientId)}</p>

                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(getOppAmount(opp))}</span>
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            priorityColors[opp.priority || 'medium']?.bg,
                            priorityColors[opp.priority || 'medium']?.text
                          )}>
                            {priorityColors[opp.priority || 'medium']?.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${opp.probability || 0}%` }}
                              />
                            </div>
                            <span className="text-gray-500">{opp.probability}%</span>
                          </div>
                          {opp.daysInStage > 0 && (
                            <span className="text-gray-400">{opp.daysInStage}d</span>
                          )}
                        </div>

                        {opp.stage === 'qualified' && opp.nextAction && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {opp.nextAction}
                            </p>
                          </div>
                        )}
                        {opp.stage === 'proposal' && opp.proposedService && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-indigo-600 font-medium">{opp.proposedService}</p>
                            {opp.proposalSent && (
                              <span className="mt-1 inline-block text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Propuesta enviada</span>
                            )}
                          </div>
                        )}
                        {opp.stage === 'negotiation' && opp.tentativeAmount && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-purple-600">Monto tentativo: {formatCurrency(opp.tentativeAmount)}</p>
                          </div>
                        )}
                        {opp.stage === 'won' && opp.wonReason && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-green-600">{opp.wonReason}</p>
                          </div>
                        )}
                        {opp.stage === 'lost' && opp.lostReason && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-red-600">{opp.lostReason}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oportunidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etapa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probabilidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días en Etapa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próxima Acción</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOpps.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">{opp.title}</div>
                        <CompanyBadge companyId={opp.myCompanyId} size="xs" />
                      </div>
                      {opp.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{opp.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getClientName(opp.clientId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={opp.stage === 'won' ? 'success' : opp.stage === 'lost' ? 'danger' : 'default'}>
                        {opportunityStageColors[opp.stage]?.label || opp.stage}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        priorityColors[opp.priority || 'medium']?.bg,
                        priorityColors[opp.priority || 'medium']?.text
                      )}>
                        {priorityColors[opp.priority || 'medium']?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(getOppAmount(opp))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${opp.probability || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{opp.probability}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {opp.daysInStage > 0 ? `${opp.daysInStage} días` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                      {opp.nextAction || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(opp)}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(opp)}>
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Stats View */}
      {viewMode === 'stats' && (
        <div className="space-y-6">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Oportunidades por Valor</h3>
              <div className="space-y-3">
                {filteredOpps
                  .filter(o => o.isActive)
                  .sort((a, b) => getOppAmount(b) - getOppAmount(a))
                  .slice(0, 10)
                  .map((opp, index) => (
                    <div key={opp.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{opp.title}</div>
                          <CompanyBadge companyId={opp.myCompanyId} size="xs" />
                        </div>
                        <div className="text-sm text-gray-500">
                          {getClientName(opp.clientId)} • {opportunityStageColors[opp.stage]?.label}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-indigo-600">{formatCurrency(getOppAmount(opp))}</div>
                        <div className="text-xs text-gray-500">{opp.probability}% prob.</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Etapa</h3>
                <div className="space-y-4">
                  {stageStats.map(stat => {
                    const percentage = oppStats.totalValue > 0 ? (stat.value / oppStats.totalValue) * 100 : 0;
                    return (
                      <div key={stat.stage}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium" style={{ color: opportunityStageColors[stat.stage]?.color }}>
                            {opportunityStageColors[stat.stage]?.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {stat.count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: opportunityStageColors[stat.stage]?.color,
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{formatCurrency(stat.value)}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas del Pipeline</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                    <div className="text-sm text-indigo-600 font-medium mb-1">Valor Total del Pipeline</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(oppStats.totalValue)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium mb-1">Valor Ponderado</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(oppStats.weightedValue)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <div className="text-sm text-green-600 font-medium mb-1">Ingresos Ganados</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(oppStats.wonValue)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                    <div className="text-sm text-orange-600 font-medium mb-1">Oportunidad Promedio</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(oppStats.avgDealSize)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Opportunity Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOpp ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información Básica
            </h3>
            <div className="space-y-4">
              <Input
                label="Título *"
                placeholder="Nombre de la oportunidad"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <Textarea
                label="Descripción"
                placeholder="Describe la oportunidad..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Etapa y Prioridad
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Etapa"
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as OpportunityStage })}
                options={OPP_STAGES.map(s => ({ value: s, label: opportunityStageColors[s]?.label || s }))}
              />
              <Select
                label="Prioridad"
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
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Cliente y Origen
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Cliente"
                placeholder="Seleccionar cliente..."
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                options={[
                  { value: '', label: 'Sin cliente' },
                  ...clients.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <Select
                label="Origen"
                placeholder="¿Cómo llegó?"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                options={[
                  { value: '', label: 'Sin especificar' },
                  { value: 'website', label: 'Sitio Web' },
                  { value: 'referral', label: 'Referido' },
                  { value: 'social_media', label: 'Redes Sociales' },
                  { value: 'email_campaign', label: 'Campaña Email' },
                  { value: 'cold_call', label: 'Llamada Fría' },
                  { value: 'event', label: 'Evento' },
                  { value: 'partner', label: 'Socio' },
                  { value: 'prospecting', label: 'Prospección' },
                  { value: 'other', label: 'Otro' },
                ]}
              />
            </div>
          </div>

          {/* Stage-specific: Qualified */}
          {formData.stage === 'qualified' && (
            <div>
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Calificación
              </h3>
              <div className="space-y-4">
                <Textarea
                  label="Necesidad Detectada"
                  placeholder="¿Qué necesita el cliente?"
                  rows={2}
                  value={formData.needDetected}
                  onChange={(e) => setFormData({ ...formData, needDetected: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Próxima Acción"
                    placeholder="Ej: Llamar, enviar info..."
                    value={formData.nextAction}
                    onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                  />
                  <Input
                    label="Fecha Próxima Acción"
                    type="date"
                    value={formData.nextActionDate}
                    onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stage-specific: Proposal */}
          {formData.stage === 'proposal' && (
            <div>
              <h3 className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Propuesta
              </h3>
              <div className="space-y-4">
                <Input
                  label="Servicio Propuesto"
                  placeholder="¿Qué servicio/producto ofreces?"
                  value={formData.proposedService}
                  onChange={(e) => setFormData({ ...formData, proposedService: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Monto Mínimo"
                    type="number"
                    placeholder="0"
                    value={formData.estimatedAmountMin}
                    onChange={(e) => setFormData({ ...formData, estimatedAmountMin: e.target.value })}
                  />
                  <Input
                    label="Monto Máximo"
                    type="number"
                    placeholder="0"
                    value={formData.estimatedAmountMax}
                    onChange={(e) => setFormData({ ...formData, estimatedAmountMax: e.target.value })}
                  />
                  <Select
                    label="Moneda"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    options={[
                      { value: 'UYU', label: 'UYU ($)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'BRL', label: 'BRL (R$)' },
                      { value: 'ARS', label: 'ARS ($)' },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Fecha Propuesta"
                    type="date"
                    value={formData.proposalDate}
                    onChange={(e) => setFormData({ ...formData, proposalDate: e.target.value })}
                  />
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.proposalSent}
                        onChange={(e) => setFormData({ ...formData, proposalSent: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Propuesta Enviada</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage-specific: Negotiation */}
          {formData.stage === 'negotiation' && (
            <div>
              <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Negociación
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Monto Tentativo"
                    type="number"
                    placeholder="0"
                    value={formData.tentativeAmount}
                    onChange={(e) => setFormData({ ...formData, tentativeAmount: e.target.value })}
                  />
                  <Input
                    label="Fecha Próximo Contacto"
                    type="date"
                    value={formData.nextInteractionDate}
                    onChange={(e) => setFormData({ ...formData, nextInteractionDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stage-specific: Won */}
          {formData.stage === 'won' && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cierre Ganado
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Monto Final"
                    type="number"
                    placeholder="0"
                    value={formData.finalAmount}
                    onChange={(e) => setFormData({ ...formData, finalAmount: e.target.value })}
                  />
                  <Select
                    label="Moneda Final"
                    value={formData.finalCurrency}
                    onChange={(e) => setFormData({ ...formData, finalCurrency: e.target.value })}
                    options={[
                      { value: 'UYU', label: 'UYU ($)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                    ]}
                  />
                  <Select
                    label="Tipo de Pago"
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    options={[
                      { value: '', label: 'Seleccionar...' },
                      { value: 'one_time', label: 'Pago Único' },
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'quarterly', label: 'Trimestral' },
                      { value: 'annual', label: 'Anual' },
                      { value: 'milestone', label: 'Por Hito' },
                      { value: 'custom', label: 'Personalizado' },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Fecha de Inicio"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                  <Input
                    label="Razón de Éxito"
                    placeholder="¿Por qué se ganó?"
                    value={formData.wonReason}
                    onChange={(e) => setFormData({ ...formData, wonReason: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stage-specific: Lost */}
          {formData.stage === 'lost' && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Motivo de Pérdida
              </h3>
              <div className="space-y-4">
                <Select
                  label="Razón"
                  value={formData.lostReason}
                  onChange={(e) => setFormData({ ...formData, lostReason: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar motivo...' },
                    { value: 'price_too_high', label: 'Precio muy alto' },
                    { value: 'budget_not_approved', label: 'Presupuesto no aprobado' },
                    { value: 'timing_not_right', label: 'Timing inadecuado' },
                    { value: 'competitor_preferred', label: 'Prefirió competidor' },
                    { value: 'feature_missing', label: 'Falta funcionalidad' },
                    { value: 'decision_maker_unavailable', label: 'Decisor no disponible' },
                    { value: 'internal_priority_change', label: 'Cambio de prioridad interna' },
                    { value: 'contract_terms', label: 'Términos contractuales' },
                    { value: 'other', label: 'Otro' },
                  ]}
                />
                <Textarea
                  label="Notas"
                  placeholder="Detalle adicional sobre la pérdida..."
                  rows={2}
                  value={formData.lostNote}
                  onChange={(e) => setFormData({ ...formData, lostNote: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Probability */}
          <div>
            <Input
              label="Probabilidad de Cierre (%)"
              type="number"
              placeholder="0-100"
              min="0"
              max="100"
              value={formData.probability}
              onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? 'Guardando...' : editingOpp ? 'Guardar Cambios' : 'Crear Oportunidad'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Oportunidad"
        message={`¿Estás seguro de que deseas eliminar "${oppToDelete?.title}"?`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* WON Stage Transition Dialog */}
      <Modal
        isOpen={wonDialogOpen}
        onClose={() => { setWonDialogOpen(false); setStageTransitionOpp(null); }}
        title="Marcar como Ganada"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-medium">
              Al marcar como ganada se ejecutará automáticamente:
            </p>
            <ul className="mt-2 text-sm text-green-700 space-y-1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Actualizar contacto como cliente
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Crear proyecto automáticamente
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Crear tarea de onboarding
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Registrar ingresos y plan de cobro
              </li>
            </ul>
          </div>

          {/* === PAYMENT STRUCTURE SELECTOR === */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estructura de Pago *</label>
            <div className="grid grid-cols-3 gap-3">
              {/* Pago Único */}
              <button
                type="button"
                onClick={() => setWonFormData({ ...wonFormData, paymentStructure: 'one_time', paymentType: 'one_time' })}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  wonFormData.paymentStructure === 'one_time'
                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-medium text-sm">Pago Único</span>
                </div>
                <p className="text-xs text-gray-500">Un solo cobro por el servicio</p>
              </button>

              {/* Recurrente */}
              <button
                type="button"
                onClick={() => setWonFormData({ ...wonFormData, paymentStructure: 'recurring', paymentType: 'monthly' })}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  wonFormData.paymentStructure === 'recurring'
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span className="font-medium text-sm">Recurrente</span>
                </div>
                <p className="text-xs text-gray-500">Pago periódico (mensual, etc.)</p>
              </button>

              {/* Desarrollo + Mantenimiento */}
              <button
                type="button"
                onClick={() => setWonFormData({ ...wonFormData, paymentStructure: 'dev_plus_maintenance', paymentType: 'custom' })}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  wonFormData.paymentStructure === 'dev_plus_maintenance'
                    ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  <span className="font-medium text-sm">Dev + Mantenimiento</span>
                </div>
                <p className="text-xs text-gray-500">Cobro por desarrollo + mensualidad</p>
              </button>
            </div>
          </div>

          {/* === CURRENCY & DATE (always shown) === */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Moneda *"
              value={wonFormData.finalCurrency}
              onChange={(e) => setWonFormData({ ...wonFormData, finalCurrency: e.target.value })}
              options={[
                { value: 'UYU', label: 'UYU ($)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
              ]}
            />
            <Input
              label="Fecha de Inicio *"
              type="date"
              value={wonFormData.startDate}
              onChange={(e) => setWonFormData({ ...wonFormData, startDate: e.target.value })}
            />
          </div>

          {/* === ONE-TIME: Single amount === */}
          {wonFormData.paymentStructure === 'one_time' && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Input
                label="Monto Total *"
                type="number"
                placeholder="0"
                value={wonFormData.finalAmount}
                onChange={(e) => setWonFormData({ ...wonFormData, finalAmount: e.target.value })}
              />
            </div>
          )}

          {/* === RECURRING: Amount + frequency === */}
          {wonFormData.paymentStructure === 'recurring' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
              <h4 className="text-sm font-medium text-blue-800">Pago Recurrente</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Monto por Período *"
                  type="number"
                  placeholder="0"
                  value={wonFormData.recurringAmount}
                  onChange={(e) => setWonFormData({ ...wonFormData, recurringAmount: e.target.value })}
                />
                <Select
                  label="Frecuencia *"
                  value={wonFormData.recurringFrequency}
                  onChange={(e) => setWonFormData({ ...wonFormData, recurringFrequency: e.target.value })}
                  options={[
                    { value: 'monthly', label: 'Mensual' },
                    { value: 'quarterly', label: 'Trimestral' },
                    { value: 'semi_annual', label: 'Semestral' },
                    { value: 'annual', label: 'Anual' },
                  ]}
                />
              </div>
              <p className="text-xs text-blue-600">
                Se generarán ingresos pendientes automáticamente cada período. Recibirás alertas si hay pagos vencidos.
              </p>
            </div>
          )}

          {/* === DEV + MAINTENANCE: Two amounts === */}
          {wonFormData.paymentStructure === 'dev_plus_maintenance' && (
            <div className="space-y-3">
              {/* Development fee */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
                <h4 className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  Cobro por Desarrollo (único)
                </h4>
                <Input
                  label="Monto de Desarrollo *"
                  type="number"
                  placeholder="0"
                  value={wonFormData.devAmount}
                  onChange={(e) => setWonFormData({ ...wonFormData, devAmount: e.target.value })}
                />
                <p className="text-xs text-amber-600">
                  Cobro único por el desarrollo del proyecto.
                </p>
              </div>

              {/* Recurring maintenance */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                <h4 className="text-sm font-medium text-purple-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Mensualidad / Mantenimiento (recurrente)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Monto Mensual *"
                    type="number"
                    placeholder="0"
                    value={wonFormData.recurringAmount}
                    onChange={(e) => setWonFormData({ ...wonFormData, recurringAmount: e.target.value })}
                  />
                  <Select
                    label="Frecuencia *"
                    value={wonFormData.recurringFrequency}
                    onChange={(e) => setWonFormData({ ...wonFormData, recurringFrequency: e.target.value })}
                    options={[
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'quarterly', label: 'Trimestral' },
                      { value: 'semi_annual', label: 'Semestral' },
                      { value: 'annual', label: 'Anual' },
                    ]}
                  />
                </div>
                <p className="text-xs text-purple-600">
                  Se generarán ingresos pendientes automáticamente. Recibirás alertas si hay pagos vencidos.
                </p>
              </div>

              {/* Summary */}
              {wonFormData.devAmount && wonFormData.recurringAmount && (
                <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 font-medium">Resumen del cobro:</p>
                  <div className="mt-1 text-sm text-gray-600 space-y-1">
                    <p>Desarrollo: {wonFormData.finalCurrency} {parseFloat(wonFormData.devAmount).toLocaleString()}</p>
                    <p>Mantenimiento: {wonFormData.finalCurrency} {parseFloat(wonFormData.recurringAmount).toLocaleString()} / {
                      wonFormData.recurringFrequency === 'monthly' ? 'mes' :
                      wonFormData.recurringFrequency === 'quarterly' ? 'trimestre' :
                      wonFormData.recurringFrequency === 'semi_annual' ? 'semestre' : 'año'
                    }</p>
                    <p className="font-semibold text-gray-800 pt-1 border-t">
                      Total inicial: {wonFormData.finalCurrency} {(parseFloat(wonFormData.devAmount) + parseFloat(wonFormData.recurringAmount)).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <Input
            label="Razón de Éxito"
            placeholder="¿Por qué se ganó?"
            value={wonFormData.wonReason}
            onChange={(e) => setWonFormData({ ...wonFormData, wonReason: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setWonDialogOpen(false); setStageTransitionOpp(null); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleWonConfirm}
              disabled={isSubmitting || !wonFormData.paymentStructure || (
                wonFormData.paymentStructure === 'one_time' ? !wonFormData.finalAmount :
                wonFormData.paymentStructure === 'recurring' ? !wonFormData.recurringAmount :
                !wonFormData.devAmount || !wonFormData.recurringAmount
              )}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Ganada'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* LOST Stage Transition Dialog */}
      <Modal
        isOpen={lostDialogOpen}
        onClose={() => { setLostDialogOpen(false); setStageTransitionOpp(null); }}
        title="Marcar como Perdida"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              Indicá el motivo de pérdida para mejorar el análisis del pipeline.
            </p>
          </div>

          <Select
            label="Razón de Pérdida *"
            value={lostFormData.lostReason}
            onChange={(e) => setLostFormData({ ...lostFormData, lostReason: e.target.value })}
            options={[
              { value: '', label: 'Seleccionar motivo...' },
              { value: 'Precio muy alto', label: 'Precio muy alto' },
              { value: 'Presupuesto no aprobado', label: 'Presupuesto no aprobado' },
              { value: 'Timing inadecuado', label: 'Timing inadecuado' },
              { value: 'Prefirió competidor', label: 'Prefirió competidor' },
              { value: 'Falta funcionalidad', label: 'Falta funcionalidad' },
              { value: 'Decisor no disponible', label: 'Decisor no disponible' },
              { value: 'Cambio de prioridad interna', label: 'Cambio de prioridad interna' },
              { value: 'Términos contractuales', label: 'Términos contractuales' },
              { value: 'Otro', label: 'Otro' },
            ]}
          />
          <Textarea
            label="Notas adicionales"
            placeholder="Detalle que pueda servir para futuras oportunidades..."
            rows={3}
            value={lostFormData.lostNote}
            onChange={(e) => setLostFormData({ ...lostFormData, lostNote: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setLostDialogOpen(false); setStageTransitionOpp(null); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleLostConfirm}
              disabled={isSubmitting || !lostFormData.lostReason}
              variant="danger"
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Perdida'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* WON Success Modal */}
      <Modal
        isOpen={!!wonSuccessData}
        onClose={() => setWonSuccessData(null)}
        title="🎉 ¡Oportunidad Ganada!"
        size="md"
      >
        {wonSuccessData && (
          <div className="space-y-5">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
              <p className="text-lg font-semibold text-green-800">{wonSuccessData.oppTitle}</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {formatCurrency(wonSuccessData.amount, wonSuccessData.currency)}
              </p>
              {wonSuccessData.paymentStructure === 'dev_plus_maintenance' && (
                <p className="text-sm text-green-600 mt-1">Desarrollo + Mantenimiento recurrente</p>
              )}
              {wonSuccessData.paymentStructure === 'recurring' && (
                <p className="text-sm text-green-600 mt-1">Plan de cobro recurrente configurado</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Se crearon automáticamente:</p>
              <div className="space-y-2">
                {wonSuccessData.projectId && (
                  <button
                    onClick={() => { router.push(`/projects`); setWonSuccessData(null); }}
                    className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-left"
                  >
                    <span className="text-xl">📁</span>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Proyecto</p>
                      <p className="text-xs text-blue-600">Ver en la lista de proyectos</p>
                    </div>
                    <svg className="w-4 h-4 ml-auto text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}

                {wonSuccessData.incomeId && (
                  <button
                    onClick={() => { router.push('/incomes'); setWonSuccessData(null); }}
                    className="w-full flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors text-left"
                  >
                    <span className="text-xl">💰</span>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Ingreso Registrado</p>
                      <p className="text-xs text-emerald-600">
                        {wonSuccessData.paymentStructure === 'one_time' ? 'Pago único pendiente de cobro' : 'Primer cobro programado'}
                      </p>
                    </div>
                    <svg className="w-4 h-4 ml-auto text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}

                {wonSuccessData.scheduleId && (
                  <button
                    onClick={() => { router.push('/incomes'); setWonSuccessData(null); }}
                    className="w-full flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors text-left"
                  >
                    <span className="text-xl">🔄</span>
                    <div>
                      <p className="text-sm font-medium text-purple-800">Cobro Recurrente</p>
                      <p className="text-xs text-purple-600">Plan de cobros automáticos configurado</p>
                    </div>
                    <svg className="w-4 h-4 ml-auto text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}

                {wonSuccessData.clientId && (
                  <button
                    onClick={() => { router.push('/clients'); setWonSuccessData(null); }}
                    className="w-full flex items-center gap-3 p-3 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors text-left"
                  >
                    <span className="text-xl">👤</span>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Cliente Actualizado</p>
                      <p className="text-xs text-amber-600">Contacto marcado como cliente activo</p>
                    </div>
                    <svg className="w-4 h-4 ml-auto text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button variant="outline" onClick={() => setWonSuccessData(null)}>
                Cerrar
              </Button>
              <Button
                onClick={() => { router.push('/incomes'); setWonSuccessData(null); }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Ir a Ingresos
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
