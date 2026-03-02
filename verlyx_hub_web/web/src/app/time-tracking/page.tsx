'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, Badge, Button, Loading, Input, Select } from '@/components/ui';
import { enterpriseHelpers } from '@/lib/enterprise-helpers';
import { useAuthStore } from '@/lib/store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface TimeEntry {
  id: string;
  user_id: string;
  project_name: string | null;
  task_name: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_billable: boolean;
  hourly_rate: number | null;
  created_at: string;
}

interface ActiveTimer {
  id: string;
  user_id: string;
  project_name: string | null;
  task_name: string | null;
  description: string | null;
  started_at: string;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatElapsedTime(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffSecs / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);
  const seconds = diffSecs % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function TimeTrackingPage() {
  const { user } = useAuthStore();
  
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  // Timer form
  const [newTimerProjectName, setNewTimerProjectName] = useState('');
  const [newTimerTaskName, setNewTimerTaskName] = useState('');
  const [newTimerDescription, setNewTimerDescription] = useState('');
  
  // Manual entry form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('10:00');
  const [manualProjectName, setManualProjectName] = useState('');
  const [manualTaskName, setManualTaskName] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualIsBillable, setManualIsBillable] = useState(true);
  const [manualHourlyRate, setManualHourlyRate] = useState('');
  
  // Filters
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    
    // Calculate date filters
    const now = new Date();
    let startDate: string | undefined;
    
    switch (filterPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).toISOString();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        break;
    }
    
    const [entriesResult, timerResult] = await Promise.all([
      enterpriseHelpers.timeTracking.getEntries(user.id, {
        startDate,
      }),
      enterpriseHelpers.timeTracking.getActiveTimer(user.id),
    ]);
    
    if (entriesResult.data) {
      setEntries(entriesResult.data);
    }
    
    if (timerResult.data) {
      setActiveTimer(timerResult.data);
    } else {
      setActiveTimer(null);
    }
    
    setIsLoading(false);
  }, [user?.id, filterPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (!activeTimer) {
      setElapsedTime('00:00:00');
      return;
    }
    
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(activeTimer.started_at));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeTimer]);

  async function handleStartTimer() {
    if (!user?.id) return;
    
    const { error } = await enterpriseHelpers.timeTracking.startTimer({
      userId: user.id,
      projectName: newTimerProjectName || undefined,
      taskName: newTimerTaskName || undefined,
      description: newTimerDescription || undefined,
    });
    
    if (error) {
      alert('Error al iniciar timer: ' + error.message);
    } else {
      setNewTimerProjectName('');
      setNewTimerTaskName('');
      setNewTimerDescription('');
      loadData();
    }
  }

  async function handleStopTimer() {
    if (!user?.id) return;
    
    const { error } = await enterpriseHelpers.timeTracking.stopTimer(user.id);
    
    if (error) {
      alert('Error al detener timer: ' + error.message);
    } else {
      loadData();
    }
  }

  async function handleCreateManualEntry() {
    if (!user?.id) return;
    
    const startDateTime = `${manualDate}T${manualStartTime}:00`;
    const endDateTime = `${manualDate}T${manualEndTime}:00`;
    
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      alert('La hora de fin debe ser posterior a la de inicio');
      return;
    }
    
    const { error } = await enterpriseHelpers.timeTracking.createManualEntry({
      userId: user.id,
      projectName: manualProjectName || undefined,
      taskName: manualTaskName || undefined,
      description: manualDescription || undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      isBillable: manualIsBillable,
      hourlyRate: manualHourlyRate ? parseFloat(manualHourlyRate) : undefined,
    });
    
    if (error) {
      alert('Error al crear entrada: ' + error.message);
    } else {
      setShowManualForm(false);
      setManualDescription('');
      loadData();
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!confirm('¿Eliminar esta entrada de tiempo?')) return;
    
    const { error } = await enterpriseHelpers.timeTracking.deleteEntry(entryId);
    
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      loadData();
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);
    const billableMinutes = entries.filter(e => e.is_billable).reduce((sum, e) => sum + e.duration_minutes, 0);
    const billableAmount = entries
      .filter(e => e.is_billable && e.hourly_rate)
      .reduce((sum, e) => sum + (e.duration_minutes / 60 * (e.hourly_rate || 0)), 0);
    
    // Group by project
    const byProject = entries.reduce((acc, entry) => {
      const projectName = entry.project_name || 'Sin proyecto';
      if (!acc[projectName]) {
        acc[projectName] = { minutes: 0, count: 0 };
      }
      acc[projectName].minutes += entry.duration_minutes;
      acc[projectName].count++;
      return acc;
    }, {} as Record<string, { minutes: number; count: number }>);
    
    return {
      totalMinutes,
      billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      billableAmount,
      entriesCount: entries.length,
      byProject: Object.entries(byProject).sort((a, b) => b[1].minutes - a[1].minutes),
    };
  }, [entries]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, TimeEntry[]> = {};
    
    entries.forEach(entry => {
      const date = entry.start_time.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });
    
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  if (isLoading && entries.length === 0) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Time Tracking"
        description="Registra y analiza tu tiempo de trabajo"
      />

      {/* Active Timer */}
      <Card className={cn('mb-6', activeTimer && 'border-green-500 border-2')}>
        <CardContent className="py-6">
          {activeTimer ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-500">Timer activo</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-mono font-bold text-gray-900">{elapsedTime}</span>
                  <div className="text-sm text-gray-600">
                    {activeTimer.project_name || 'Sin proyecto'}
                    {activeTimer.task_name && ` / ${activeTimer.task_name}`}
                    {activeTimer.description && (
                      <p className="text-gray-400">{activeTimer.description}</p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleStopTimer}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Detener
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    value={newTimerProjectName}
                    onChange={(e) => setNewTimerProjectName(e.target.value)}
                    placeholder="Nombre del proyecto"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={newTimerTaskName}
                    onChange={(e) => setNewTimerTaskName(e.target.value)}
                    placeholder="Tarea (opcional)"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={newTimerDescription}
                    onChange={(e) => setNewTimerDescription(e.target.value)}
                    placeholder="¿En qué estás trabajando?"
                  />
                </div>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleStartTimer}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Iniciar
                </Button>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualForm(!showManualForm)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Entrada manual
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Form */}
      {showManualForm && (
        <Card className="mb-6 border-dashed">
          <CardContent className="py-6">
            <h3 className="font-semibold text-gray-900 mb-4">Nueva entrada manual</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <Input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                <Input
                  type="time"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
                <Input
                  type="time"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                <Input
                  value={manualProjectName}
                  onChange={(e) => setManualProjectName(e.target.value)}
                  placeholder="Nombre del proyecto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarea</label>
                <Input
                  value={manualTaskName}
                  onChange={(e) => setManualTaskName(e.target.value)}
                  placeholder="Nombre de la tarea"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa/hora</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualHourlyRate}
                  onChange={(e) => setManualHourlyRate(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <Input
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="¿En qué trabajaste?"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualIsBillable}
                    onChange={(e) => setManualIsBillable(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Facturable</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowManualForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateManualEntry}>
                Guardar entrada
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Tiempo Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalMinutes)}</p>
            <p className="text-xs text-gray-400">{stats.entriesCount} entradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Facturable</p>
            <p className="text-2xl font-bold text-green-600">{formatDuration(stats.billableMinutes)}</p>
            <p className="text-xs text-gray-400">
              {stats.totalMinutes > 0 ? Math.round((stats.billableMinutes / stats.totalMinutes) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">No Facturable</p>
            <p className="text-2xl font-bold text-gray-600">{formatDuration(stats.nonBillableMinutes)}</p>
            <p className="text-xs text-gray-400">
              {stats.totalMinutes > 0 ? Math.round((stats.nonBillableMinutes / stats.totalMinutes) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Valor Facturable</p>
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.billableAmount)}</p>
            <p className="text-xs text-gray-400">basado en tarifas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value as 'today' | 'week' | 'month' | 'all')}
          options={[
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Esta semana' },
            { value: 'month', label: 'Este mes' },
            { value: 'all', label: 'Todo' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entries List */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registros de tiempo</h3>
              
              {entriesByDate.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay registros en este período</p>
              ) : (
                <div className="space-y-6">
                  {entriesByDate.map(([date, dayEntries]) => {
                    const dayTotal = dayEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
                    
                    return (
                      <div key={date}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-700">{formatDate(date)}</h4>
                          <span className="text-sm text-gray-500">{formatDuration(dayTotal)}</span>
                        </div>
                        <div className="space-y-2">
                          {dayEntries.map(entry => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 truncate">
                                    {entry.project_name || 'Sin proyecto'}
                                  </span>
                                  {entry.is_billable && (
                                    <Badge variant="success" className="text-xs">Facturable</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                  {entry.task_name || entry.description || 'Sin descripción'}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(entry.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  {' - '}
                                  {new Date(entry.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-mono font-medium text-gray-900">
                                  {formatDuration(entry.duration_minutes)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:bg-red-50"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary by Project */}
        <div>
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Proyecto</h3>
              
              {stats.byProject.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {stats.byProject.map(([project, data]) => (
                    <div key={project}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">{project}</span>
                        <span className="text-sm text-gray-500">{formatDuration(data.minutes)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(data.minutes / stats.totalMinutes) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{data.count} entradas</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Promedio Diario</h3>
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">
                  {entriesByDate.length > 0 
                    ? formatDuration(Math.round(stats.totalMinutes / entriesByDate.length))
                    : '0h'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-1">por día trabajado</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
