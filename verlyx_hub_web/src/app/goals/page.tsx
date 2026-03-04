'use client';

import { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Card, Button, Input, Badge, Modal } from '@/components/ui';
import { useAuthStore, useCompanyStore } from '@/lib/store';
import { CompanyBadge, CompanySelector } from '@/components/ui';
import { enterpriseHelpers } from '@/lib/enterprise-helpers';

interface Goal {
  id: string;
  name: string;
  description: string | null;
  goal_type: string;
  target_value: number;
  current_value: number;
  period_type: string;
  start_date: string;
  end_date: string;
  status: string;
  achieved_at: string | null;
  created_at: string;
}

export default function GoalsPage() {
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();
  const [formCompanyId, setFormCompanyId] = useState(selectedCompanyId || '');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalType: 'revenue',
    targetValue: '',
    periodType: 'monthly',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadGoals();
    }
  }, [user?.id]);

  const loadGoals = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await enterpriseHelpers.goals.getAll(user.id);
    if (!error && data) {
      setGoals(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (editingGoal) {
      const { error } = await enterpriseHelpers.goals.update(editingGoal.id, {
        name: formData.name,
        description: formData.description || undefined,
        targetValue: parseFloat(formData.targetValue) || 0,
      });
      if (!error) {
        loadGoals();
        closeModal();
      }
    } else {
      const { error } = await enterpriseHelpers.goals.create({
        userId: user.id,
        myCompanyId: formCompanyId || selectedCompanyId || undefined,
        name: formData.name,
        description: formData.description || undefined,
        goalType: formData.goalType,
        targetValue: parseFloat(formData.targetValue) || 0,
        periodType: formData.periodType,
        startDate: formData.startDate,
        endDate: formData.endDate,
      });
      if (!error) {
        loadGoals();
        closeModal();
      }
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      goalType: goal.goal_type,
      targetValue: goal.target_value.toString(),
      periodType: goal.period_type,
      startDate: goal.start_date,
      endDate: goal.end_date,
    });
    setShowModal(true);
  };

  const handleUpdateProgress = async (goal: Goal, newValue: number) => {
    setUpdatingId(goal.id);
    await enterpriseHelpers.goals.updateProgress(goal.id, newValue);
    await loadGoals();
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta meta?')) {
      await enterpriseHelpers.goals.delete(id);
      loadGoals();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFormData({
      name: '',
      description: '',
      goalType: 'revenue',
      targetValue: '',
      periodType: 'monthly',
      startDate: today.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
    });
  };

  const filteredGoals = goals.filter(goal => {
    return filterStatus === 'all' || goal.status === filterStatus;
  });

  const goalTypes = [
    { value: 'revenue', label: 'Ingresos', icon: '💰', unit: '$' },
    { value: 'deals_won', label: 'Deals Cerrados', icon: '🤝', unit: '' },
    { value: 'projects_completed', label: 'Proyectos Completados', icon: '✅', unit: '' },
    { value: 'clients_acquired', label: 'Clientes Nuevos', icon: '👥', unit: '' },
    { value: 'hours_worked', label: 'Horas Trabajadas', icon: '⏰', unit: 'hrs' },
    { value: 'custom', label: 'Personalizado', icon: '🎯', unit: '' },
  ];

  const periodTypes = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'yearly', label: 'Anual' },
  ];

  const getGoalType = (type: string) => goalTypes.find(t => t.value === type) || goalTypes[5];
  const getPeriodLabel = (type: string) => periodTypes.find(t => t.value === type)?.label || type;

  const getProgress = (goal: Goal) => {
    if (goal.target_value === 0) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'info';
      case 'achieved': return 'success';
      case 'failed': return 'danger';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'achieved': return 'Lograda';
      case 'failed': return 'No Lograda';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatValue = (value: number, type: string) => {
    const goalType = getGoalType(type);
    if (goalType.unit === '$') {
      return `$${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${goalType.unit}`.trim();
  };

  // Stats
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const achievedGoals = goals.filter(g => g.status === 'achieved').length;
  const avgProgress = goals.filter(g => g.status === 'active').length > 0
    ? goals.filter(g => g.status === 'active').reduce((acc, g) => acc + getProgress(g), 0) / goals.filter(g => g.status === 'active').length
    : 0;

  return (
    <MainLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metas y Objetivos</h1>
          <p className="text-gray-500">Establece y rastrea tus metas de negocio</p>
        </div>
        <Button onClick={() => {
          const today = new Date();
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          setFormData({
            ...formData,
            startDate: today.toISOString().split('T')[0],
            endDate: endOfMonth.toISOString().split('T')[0],
          });
          setShowModal(true);
        }}>
          + Nueva Meta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Metas Activas</p>
          <p className="text-2xl font-bold text-blue-600">{activeGoals}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Metas Logradas</p>
          <p className="text-2xl font-bold text-green-600">{achievedGoals}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Progreso Promedio</p>
          <p className="text-2xl font-bold text-indigo-600">{avgProgress.toFixed(0)}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Tasa de Éxito</p>
          <p className="text-2xl font-bold text-emerald-600">
            {goals.length > 0 ? ((achievedGoals / goals.length) * 100).toFixed(0) : 0}%
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'achieved', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Todas' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredGoals.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay metas</h3>
          <p className="text-gray-500 mb-4">Crea tu primera meta para empezar a rastrear tu progreso</p>
          <Button onClick={() => setShowModal(true)}>
            + Crear Meta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const progress = getProgress(goal);
            const goalType = getGoalType(goal.goal_type);
            const daysRemaining = getDaysRemaining(goal.end_date);
            
            return (
              <Card key={goal.id} className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{goalType.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                      <CompanyBadge companyId={(goal as any).my_company_id} />
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(goal.status) as 'info' | 'success' | 'danger' | 'default'}>
                          {getStatusLabel(goal.status)}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {getPeriodLabel(goal.period_type)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(goal)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {goal.description && (
                  <p className="text-sm text-gray-500 mb-4">{goal.description}</p>
                )}
                
                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{formatValue(goal.current_value, goal.goal_type)}</span>
                    <span className="text-gray-400">de {formatValue(goal.target_value, goal.goal_type)}</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-blue-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">{progress.toFixed(1)}% completado</p>
                </div>
                
                {/* Quick Update */}
                {goal.status === 'active' && (
                  <div className="flex items-center gap-2 mb-4">
                    <Input
                      type="number"
                      placeholder="Actualizar valor"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = parseFloat((e.target as HTMLInputElement).value);
                          if (!isNaN(value)) {
                            handleUpdateProgress(goal, value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateProgress(goal, goal.current_value + 1)}
                      disabled={updatingId === goal.id}
                    >
                      +1
                    </Button>
                  </div>
                )}
                
                {/* Footer */}
                <div className="flex justify-between items-center pt-3 border-t text-xs text-gray-400">
                  <span>{goal.start_date} → {goal.end_date}</span>
                  {goal.status === 'active' && (
                    <span className={daysRemaining < 0 ? 'text-red-500' : daysRemaining <= 7 ? 'text-orange-500' : ''}>
                      {daysRemaining < 0 
                        ? `${Math.abs(daysRemaining)} días vencido`
                        : daysRemaining === 0 
                          ? 'Vence hoy'
                          : `${daysRemaining} días restantes`
                      }
                    </span>
                  )}
                  {goal.status === 'achieved' && goal.achieved_at && (
                    <span className="text-green-500">
                      Lograda el {new Date(goal.achieved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingGoal ? 'Editar Meta' : 'Nueva Meta'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CompanySelector
              value={formCompanyId || selectedCompanyId || ''}
              onChange={(id) => setFormCompanyId(id)}
              label="Empresa"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Meta *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Alcanzar $100,000 en ventas"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional de la meta"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Meta</label>
                <select
                  value={formData.goalType}
                  onChange={(e) => setFormData({ ...formData, goalType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={!!editingGoal}
                >
                  {goalTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Objetivo *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                  placeholder="100000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select
                  value={formData.periodType}
                  onChange={(e) => setFormData({ ...formData, periodType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={!!editingGoal}
                >
                  {periodTypes.map((period) => (
                    <option key={period.value} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {!editingGoal && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingGoal ? 'Guardar Cambios' : 'Crear Meta'}
              </Button>
            </div>
          </form>
        </Modal>
    </div>
    </MainLayout>
  );
}
