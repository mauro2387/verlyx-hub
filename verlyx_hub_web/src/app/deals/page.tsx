'use client';

import { useEffect, useState, useMemo } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Loading, Modal, Input, Textarea, Select, ConfirmDialog, StatCard, Badge, Avatar, SearchInput } from '@/components/ui';
import { useDealsStore, useClientsStore, useCompanyStore } from '@/lib/store';
import { Deal, DealStage } from '@/lib/types';
import { dealStageColors, priorityColors, formatCurrency, formatDate, cn } from '@/lib/utils';

const DEAL_STAGES: DealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

type ViewMode = 'kanban' | 'table' | 'stats';

interface DealFormData {
  title: string;
  description: string;
  stage: DealStage;
  priority: string;
  clientId: string;
  amount: string;
  currency: string;
  probability: string;
  expectedCloseDate: string;
  nextAction: string;
  source: string;
  tags: string[];
}

export default function DealsPage() {
  const { deals, isLoading, fetchDeals, addDeal, updateDeal, deleteDeal, moveDeal, getStageStats } = useDealsStore();
  const { clients, fetchClients } = useClientsStore();
  const { selectedCompanyId } = useCompanyStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  
  const [formData, setFormData] = useState<DealFormData>({
    title: '',
    description: '',
    stage: 'LEAD' as DealStage,
    priority: 'MEDIUM',
    clientId: '',
    amount: '',
    currency: 'UYU',
    probability: '20',
    expectedCloseDate: '',
    nextAction: '',
    source: '',
    tags: [],
  });

  useEffect(() => {
    fetchDeals();
    fetchClients();
  }, [fetchDeals, fetchClients]);

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const matchesSearch = !searchTerm || 
        deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = !filterStage || deal.stage === filterStage;
      const matchesPriority = !filterPriority || deal.priority === filterPriority;
      return matchesSearch && matchesStage && matchesPriority;
    });
  }, [deals, searchTerm, filterStage, filterPriority]);

  // Deal Statistics
  const dealStats = useMemo(() => {
    const activeDeals = deals.filter(d => d.isActive);
    const wonDeals = deals.filter(d => d.stage === 'CLOSED_WON');
    const lostDeals = deals.filter(d => d.stage === 'CLOSED_LOST');
    
    return {
      total: deals.length,
      active: activeDeals.length,
      won: wonDeals.length,
      lost: lostDeals.length,
      totalValue: activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
      weightedValue: activeDeals.reduce((sum, d) => sum + (d.expectedRevenue || 0), 0),
      wonValue: wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
      avgDealSize: activeDeals.length > 0 ? activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0) / activeDeals.length : 0,
      winRate: (wonDeals.length + lostDeals.length) > 0 ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0,
    };
  }, [deals]);

  const stageStats = getStageStats();
  const getDealsByStage = (stage: DealStage) => filteredDeals.filter((d) => d.stage === stage);
  const getClientName = (clientId: string | null | undefined) => {
    if (!clientId) return 'Sin cliente';
    return clients.find((c) => c.id === clientId)?.name || 'Cliente';
  };

  const handleOpenModal = (deal?: Deal) => {
    if (deal) {
      setEditingDeal(deal);
      setFormData({
        title: deal.title,
        description: deal.description || '',
        stage: deal.stage,
        priority: deal.priority || 'MEDIUM',
        clientId: deal.clientId || '',
        amount: deal.amount?.toString() || '',
        currency: deal.currency || 'UYU',
        probability: deal.probability?.toString() || '20',
        expectedCloseDate: deal.expectedCloseDate?.split('T')[0] || '',
        nextAction: deal.nextAction || '',
        source: deal.source || '',
        tags: [],
      });
    } else {
      setEditingDeal(null);
      setFormData({
        title: '',
        description: '',
        stage: 'LEAD',
        priority: 'MEDIUM',
        clientId: '',
        amount: '',
        currency: 'UYU',
        probability: '20',
        expectedCloseDate: '',
        nextAction: '',
        source: '',
        tags: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const amount = formData.amount ? parseFloat(formData.amount) : 0;
    const probability = parseInt(formData.probability) || 0;

    const dealData = {
      myCompanyId: selectedCompanyId || '1',
      clientId: formData.clientId || undefined,
      organizationId: null,
      title: formData.title,
      description: formData.description || null,
      stage: formData.stage,
      priority: formData.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
      amount,
      currency: formData.currency,
      probability,
      expectedRevenue: amount * (probability / 100),
      expectedCloseDate: formData.expectedCloseDate || null,
      actualCloseDate: null,
      lostReason: null,
      wonReason: null,
      source: formData.source || null,
      daysInStage: 0,
      nextAction: formData.nextAction || null,
      nextActionDate: null,
      isActive: !['CLOSED_WON', 'CLOSED_LOST'].includes(formData.stage),
    };

    if (editingDeal) {
      updateDeal(editingDeal.id, dealData);
    } else {
      addDeal(dealData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (deal: Deal) => {
    setDealToDelete(deal);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (dealToDelete) {
      deleteDeal(dealToDelete.id);
      setDeleteDialogOpen(false);
      setDealToDelete(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('dealId', dealId);
  };

  const handleDrop = (e: React.DragEvent, newStage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) {
      moveDeal(dealId, newStage);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Calculate pipeline totals
  const pipelineTotal = deals.filter(d => d.isActive).reduce((sum, d) => sum + (d.amount || 0), 0);
  const weightedTotal = deals.filter(d => d.isActive).reduce((sum, d) => sum + (d.expectedRevenue || 0), 0);

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
        description={`${deals.length} oportunidades en el pipeline`}
        actions={
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
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
                ...DEAL_STAGES.map(s => ({ value: s, label: dealStageColors[s]?.label || s })),
              ]}
            />
            <Select
              placeholder="Todas las prioridades"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              options={[
                { value: '', label: 'Todas las prioridades' },
                { value: 'LOW', label: 'Baja' },
                { value: 'MEDIUM', label: 'Media' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'URGENT', label: 'Urgente' },
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
            value={dealStats.total}
            color="indigo"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            title="Activas"
            value={dealStats.active}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title="Ganadas"
            value={dealStats.won}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Perdidas"
            value={dealStats.lost}
            color="red"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Valor Pipeline"
            value={formatCurrency(dealStats.totalValue)}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Tasa de Éxito"
            value={`${dealStats.winRate.toFixed(1)}%`}
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
          {DEAL_STAGES.map((stage) => {
            const stageStat = stageStats.find(s => s.stage === stage);
            const stageDeals = getDealsByStage(stage);
            
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-80"
                onDrop={(e) => handleDrop(e, stage)}
                onDragOver={handleDragOver}
              >
                <div 
                  className="rounded-t-lg px-4 py-3"
                  style={{ backgroundColor: `${dealStageColors[stage]?.color}20` }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold" style={{ color: dealStageColors[stage]?.color }}>
                      {dealStageColors[stage]?.label}
                  </h3>
                  <span className="text-sm font-medium bg-white px-2 py-0.5 rounded-full shadow-sm">
                    {stageDeals.length}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: dealStageColors[stage]?.color }}>
                  {formatCurrency(stageStat?.value || 0)}
                </p>
              </div>
              <div className="bg-gray-100/50 rounded-b-lg p-3 min-h-[400px] space-y-3">
                {stageDeals.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">Sin oportunidades</p>
                ) : (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      className="bg-white rounded-lg shadow-sm p-4 cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{deal.title}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenModal(deal)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(deal)}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-3">{getClientName(deal.clientId)}</p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(deal.amount || 0)}</span>
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          priorityColors[deal.priority || 'MEDIUM']?.bg,
                          priorityColors[deal.priority || 'MEDIUM']?.text
                        )}>
                          {priorityColors[deal.priority || 'MEDIUM']?.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 rounded-full" 
                              style={{ width: `${deal.probability || 0}%` }}
                            />
                          </div>
                          <span className="text-gray-500">{deal.probability}%</span>
                        </div>
                        {deal.daysInStage !== undefined && deal.daysInStage > 0 && (
                          <span className="text-gray-400">{deal.daysInStage}d</span>
                        )}
                      </div>
                      
                      {deal.nextAction && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {deal.nextAction}
                          </p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oportunidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Etapa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Probabilidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Esperado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Cierre
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{deal.title}</div>
                      {deal.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{deal.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getClientName(deal.clientId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={deal.stage === 'CLOSED_WON' ? 'success' : deal.stage === 'CLOSED_LOST' ? 'danger' : 'default'}>
                        {dealStageColors[deal.stage]?.label || deal.stage}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        priorityColors[deal.priority || 'MEDIUM']?.bg,
                        priorityColors[deal.priority || 'MEDIUM']?.text
                      )}>
                        {priorityColors[deal.priority || 'MEDIUM']?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(deal.amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full" 
                            style={{ width: `${deal.probability || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{deal.probability}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      {formatCurrency(deal.expectedRevenue || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(deal)}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(deal)}>
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
          {/* Top Deals by Value */}
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Oportunidades por Valor</h3>
              <div className="space-y-3">
                {filteredDeals
                  .filter(d => d.isActive)
                  .sort((a, b) => (b.amount || 0) - (a.amount || 0))
                  .slice(0, 10)
                  .map((deal, index) => (
                    <div key={deal.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{deal.title}</div>
                        <div className="text-sm text-gray-500">
                          {getClientName(deal.clientId)} • {dealStageColors[deal.stage]?.label}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-indigo-600">{formatCurrency(deal.amount || 0)}</div>
                        <div className="text-xs text-gray-500">{deal.probability}% prob.</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Etapa</h3>
                <div className="space-y-4">
                  {stageStats.map(stat => {
                    const percentage = dealStats.totalValue > 0 ? (stat.value / dealStats.totalValue) * 100 : 0;
                    return (
                      <div key={stat.stage}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium" style={{ color: dealStageColors[stat.stage]?.color }}>
                            {dealStageColors[stat.stage]?.label}
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
                              backgroundColor: dealStageColors[stat.stage]?.color
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
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(dealStats.totalValue)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium mb-1">Valor Ponderado</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(dealStats.weightedValue)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <div className="text-sm text-green-600 font-medium mb-1">Ingresos Ganados</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(dealStats.wonValue)}</div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                    <div className="text-sm text-orange-600 font-medium mb-1">Deal Promedio</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(dealStats.avgDealSize)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Deal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDeal ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
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

          {/* Stage & Priority */}
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
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as DealStage })}
                options={DEAL_STAGES.map(s => ({ value: s, label: dealStageColors[s]?.label || s }))}
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
          </div>

          {/* Client & Source */}
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
                  { value: 'other', label: 'Otro' },
                ]}
              />
            </div>
          </div>

          {/* Financial Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información Financiera
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input
                  label="Monto"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
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
            <div className="mt-4">
              <Input
                label="Probabilidad de Cierre (%)"
                type="number"
                placeholder="0-100"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
              />
              {formData.amount && formData.probability && (
                <p className="text-xs text-gray-500 mt-1">
                  Valor Esperado: {formatCurrency(parseFloat(formData.amount) * (parseInt(formData.probability) / 100))}
                </p>
              )}
            </div>
          </div>

          {/* Timeline & Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fechas y Próximos Pasos
            </h3>
            <div className="space-y-4">
              <Input
                label="Fecha Esperada de Cierre"
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              />
              <Input
                label="Próxima Acción"
                placeholder="¿Qué sigue? Ej: Llamar al cliente, Enviar propuesta..."
                value={formData.nextAction}
                onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingDeal ? 'Guardar Cambios' : 'Crear Oportunidad'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Oportunidad"
        message={`¿Estás seguro de que deseas eliminar "${dealToDelete?.title}"?`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
