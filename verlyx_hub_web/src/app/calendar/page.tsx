'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Modal, Badge, Input, Select, Textarea, StatCard, SearchInput, Loading } from '@/components/ui';
import { useCalendarStore, useProjectsStore, useClientsStore, useDealsStore, useTasksStore, CalendarEvent, CalendarEventType, CalendarEventStatus, CalendarEventPriority } from '@/lib/store';
import { formatDateTime, cn } from '@/lib/utils';

type ViewMode = 'month' | 'week' | 'day' | 'agenda' | 'list';

interface EventFormData {
  title: string;
  description: string;
  type: CalendarEventType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  location: string;
  attendees: string;
  priority: CalendarEventPriority;
  status: CalendarEventStatus;
  relatedType: string;
  relatedId: string;
}

const typeConfig: Record<CalendarEventType, { label: string; icon: string; bgClass: string; textClass: string }> = {
  meeting: { label: 'Reunión', icon: '📅', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  task: { label: 'Tarea', icon: '✓', bgClass: 'bg-purple-100', textClass: 'text-purple-800' },
  reminder: { label: 'Recordatorio', icon: '🔔', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
  deadline: { label: 'Deadline', icon: '⏰', bgClass: 'bg-red-100', textClass: 'text-red-800' },
  payment: { label: 'Pago', icon: '💰', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800' },
  call: { label: 'Llamada', icon: '📞', bgClass: 'bg-cyan-100', textClass: 'text-cyan-800' },
  other: { label: 'Otro', icon: '📌', bgClass: 'bg-gray-100', textClass: 'text-gray-800' },
};

const priorityConfig: Record<CalendarEventPriority, { label: string; variant: 'default' | 'info' | 'warning' }> = {
  low: { label: 'Baja', variant: 'default' },
  medium: { label: 'Media', variant: 'info' },
  high: { label: 'Alta', variant: 'warning' },
};

const statusConfig: Record<CalendarEventStatus, { label: string; variant: 'warning' | 'success' | 'danger' | 'default' }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  completed: { label: 'Completado', variant: 'default' },
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarPage() {
  const { 
    events, 
    isLoading, 
    currentDate, 
    fetchEvents, 
    addEvent, 
    updateEvent, 
    deleteEvent,
    setCurrentDate,
    getFilteredEvents,
    getEventsForDate,
    filter,
    setFilter,
  } = useCalendarStore();
  
  const { projects, fetchProjects } = useProjectsStore();
  const { clients, fetchClients } = useClientsStore();
  const { deals, fetchDeals } = useDealsStore();
  const { tasks, fetchTasks } = useTasksStore();

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const getDefaultFormData = (): EventFormData => {
    const today = new Date();
    return {
      title: '',
      description: '',
      type: 'meeting',
      startDate: today.toISOString().split('T')[0],
      startTime: '09:00',
      endDate: today.toISOString().split('T')[0],
      endTime: '10:00',
      allDay: false,
      location: '',
      attendees: '',
      priority: 'medium',
      status: 'pending',
      relatedType: '',
      relatedId: '',
    };
  };

  const [formData, setFormData] = useState<EventFormData>(getDefaultFormData());

  useEffect(() => {
    fetchEvents();
    fetchProjects();
    fetchClients();
    fetchDeals();
    fetchTasks();
  }, [fetchEvents, fetchProjects, fetchClients, fetchDeals, fetchTasks]);

  const filteredEvents = getFilteredEvents();

  // Event statistics
  const eventStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      total: events.length,
      today: events.filter(e => {
        const d = new Date(e.startDate);
        return d >= todayStart && d < todayEnd;
      }).length,
      thisWeek: events.filter(e => {
        const d = new Date(e.startDate);
        return d >= weekStart && d < weekEnd;
      }).length,
      thisMonth: events.filter(e => {
        const d = new Date(e.startDate);
        return d >= monthStart && d <= monthEnd;
      }).length,
      pending: events.filter(e => e.status === 'pending').length,
      confirmed: events.filter(e => e.status === 'confirmed').length,
      completed: events.filter(e => e.status === 'completed').length,
    };
  }, [events]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [year, month]);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(year, month + (direction === 'next' ? 1 : -1), 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  const handleOpenCreateModal = (day?: Date) => {
    setIsEditMode(false);
    setSelectedEvent(null);
    const targetDate = day || new Date();
    setFormData({
      ...getDefaultFormData(),
      startDate: targetDate.toISOString().split('T')[0],
      endDate: targetDate.toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setIsEditMode(true);
    setSelectedEvent(event);
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    setFormData({
      title: event.title,
      description: event.description || '',
      type: event.type,
      startDate: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate.toISOString().split('T')[0],
      endTime: endDate.toTimeString().slice(0, 5),
      allDay: event.allDay,
      location: event.location || '',
      attendees: event.attendees?.join(', ') || '',
      priority: event.priority,
      status: event.status,
      relatedType: event.relatedType || '',
      relatedId: event.relatedId || '',
    });
    setIsViewModalOpen(false);
    setIsModalOpen(true);
  };

  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('El título es obligatorio');
      return;
    }
    if (!formData.startDate) {
      alert('La fecha de inicio es obligatoria');
      return;
    }

    // Build start date
    let startDateTime: string;
    if (formData.allDay) {
      startDateTime = new Date(formData.startDate + 'T00:00:00').toISOString();
    } else {
      const startStr = `${formData.startDate}T${formData.startTime || '09:00'}:00`;
      const startDate = new Date(startStr);
      if (isNaN(startDate.getTime())) {
        alert('Fecha de inicio inválida');
        return;
      }
      startDateTime = startDate.toISOString();
    }

    // Build end date
    let endDateTime: string;
    if (formData.allDay) {
      endDateTime = new Date(formData.endDate + 'T23:59:59').toISOString();
    } else {
      const endStr = `${formData.endDate || formData.startDate}T${formData.endTime || '10:00'}:00`;
      const endDate = new Date(endStr);
      if (isNaN(endDate.getTime())) {
        endDateTime = startDateTime;
      } else {
        endDateTime = endDate.toISOString();
      }
    }

    const eventData = {
      title: formData.title.trim(),
      description: formData.description || undefined,
      type: formData.type,
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: formData.allDay,
      location: formData.location || undefined,
      attendees: formData.attendees ? formData.attendees.split(',').map(a => a.trim()).filter(Boolean) : undefined,
      priority: formData.priority,
      status: formData.status,
      relatedType: (formData.relatedType || undefined) as 'project' | 'client' | 'deal' | 'task' | '' | undefined,
      relatedId: formData.relatedId || undefined,
    };

    if (isEditMode && selectedEvent) {
      await updateEvent(selectedEvent.id, eventData);
    } else {
      await addEvent(eventData);
    }
    
    setIsModalOpen(false);
    setIsEditMode(false);
    setSelectedEvent(null);
    setFormData(getDefaultFormData());
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent && confirm('¿Estás seguro de eliminar este evento?')) {
      await deleteEvent(selectedEvent.id);
      setIsViewModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const handleMarkCompleted = async () => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, { status: 'completed' });
      setIsViewModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const getRelatedName = (type: string, id: string): string => {
    switch (type) {
      case 'project':
        return projects.find(p => p.id === id)?.name || 'Proyecto';
      case 'client':
        return clients.find(c => c.id === id)?.name || 'Cliente';
      case 'deal':
        return deals.find(d => d.id === id)?.title || 'Oportunidad';
      case 'task':
        return tasks.find(t => t.id === id)?.title || 'Tarea';
      default:
        return '';
    }
  };

  const getRelatedItems = () => {
    switch (formData.relatedType) {
      case 'project':
        return projects.map(p => ({ value: p.id, label: p.name }));
      case 'client':
        return clients.map(c => ({ value: c.id, label: c.name }));
      case 'deal':
        return deals.map(d => ({ value: d.id, label: d.title }));
      case 'task':
        return tasks.map(t => ({ value: t.id, label: t.title }));
      default:
        return [];
    }
  };

  // Get upcoming events for sidebar
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter(e => new Date(e.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 8);
  }, [filteredEvents]);

  // Get events for selected day
  const selectedDayEvents = selectedDay ? getEventsForDate(selectedDay) : [];

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
        title="Calendario"
        description={`${events.length} eventos programados`}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={goToToday}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Hoy
            </Button>
            <Button onClick={() => handleOpenCreateModal()}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Evento
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <SearchInput
              value={filter.search || ''}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Buscar eventos..."
              className="flex-1 min-w-[200px]"
            />
            <Select
              value={filter.type || ''}
              onChange={(e) => setFilter({ type: e.target.value || null })}
              options={[
                { value: '', label: 'Todos los tipos' },
                ...Object.entries(typeConfig).map(([key, config]) => ({ value: key, label: config.label })),
              ]}
            />
            <Select
              value={filter.status || ''}
              onChange={(e) => setFilter({ status: e.target.value || null })}
              options={[
                { value: '', label: 'Todos los estados' },
                ...Object.entries(statusConfig).map(([key, config]) => ({ value: key, label: config.label })),
              ]}
            />
            <Select
              value={filter.priority || ''}
              onChange={(e) => setFilter({ priority: e.target.value || null })}
              options={[
                { value: '', label: 'Todas las prioridades' },
                ...Object.entries(priorityConfig).map(([key, config]) => ({ value: key, label: config.label })),
              ]}
            />
            <Button variant="outline" onClick={() => setShowStats(!showStats)}>
              {showStats ? 'Ocultar' : 'Mostrar'} Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <StatCard title="Total" value={eventStats.total} color="indigo" icon={<span className="text-2xl">📅</span>} />
          <StatCard title="Hoy" value={eventStats.today} color="blue" icon={<span className="text-2xl">📆</span>} />
          <StatCard title="Esta Semana" value={eventStats.thisWeek} color="purple" icon={<span className="text-2xl">📊</span>} />
          <StatCard title="Este Mes" value={eventStats.thisMonth} color="green" icon={<span className="text-2xl">📈</span>} />
          <StatCard title="Pendientes" value={eventStats.pending} color="orange" icon={<span className="text-2xl">⏳</span>} />
          <StatCard title="Confirmados" value={eventStats.confirmed} color="green" icon={<span className="text-2xl">✅</span>} />
          <StatCard title="Completados" value={eventStats.completed} color="blue" icon={<span className="text-2xl">🎉</span>} />
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-1">
          {(['month', 'week', 'day', 'agenda', 'list'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-4 py-2 font-medium text-sm rounded-t-lg transition-colors',
                viewMode === mode
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              {mode === 'month' && 'Mes'}
              {mode === 'week' && 'Semana'}
              {mode === 'day' && 'Día'}
              {mode === 'agenda' && 'Agenda'}
              {mode === 'list' && 'Lista'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar Area */}
        <div className="lg:col-span-3">
          {/* Month View */}
          {viewMode === 'month' && (
            <Card>
              <CardContent className="p-6">
                {/* Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate)}
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day Headers */}
                  {DAYS.map((day) => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2 bg-gray-50 rounded">
                      {day}
                    </div>
                  ))}

                  {/* Calendar Days */}
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50 rounded" />;
                    }

                    const dayEvents = getEventsForDate(day);
                    const isSelected = selectedDay?.toDateString() === day.toDateString();
                    const isTodayDate = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(day)}
                        onDoubleClick={() => handleOpenCreateModal(day)}
                        className={cn(
                          'min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all',
                          'bg-white hover:bg-gray-50',
                          isSelected && 'ring-2 ring-indigo-500',
                          isTodayDate && 'bg-indigo-50 border-indigo-200'
                        )}
                      >
                        <div className={cn(
                          'text-sm font-medium mb-1',
                          isTodayDate ? 'text-indigo-600 font-bold' : 'text-gray-700'
                        )}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewEvent(event);
                              }}
                              className={cn(
                                'text-xs p-1 rounded truncate cursor-pointer',
                                typeConfig[event.type].bgClass,
                                typeConfig[event.type].textClass
                              )}
                              title={event.title}
                            >
                              <span className="mr-1">{typeConfig[event.type].icon}</span>
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 font-medium">
                              +{dayEvents.length - 3} más
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Semana del {currentDate.getDate()} de {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate)}
                </h2>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-8 gap-1 min-w-[800px]">
                    <div className="font-semibold text-gray-600 p-2">Hora</div>
                    {DAYS.slice(1).concat(DAYS.slice(0, 1)).map(day => (
                      <div key={day} className="font-semibold text-gray-600 p-2 text-center bg-gray-50 rounded">{day}</div>
                    ))}
                    {Array.from({ length: 12 }).map((_, hourIdx) => {
                      const hour = 8 + hourIdx;
                      return (
                        <React.Fragment key={hour}>
                          <div className="text-xs text-gray-500 p-2 border-t">{hour.toString().padStart(2, '0')}:00</div>
                          {Array.from({ length: 7 }).map((_, dayIdx) => {
                            const hourEvents = filteredEvents.filter(e => {
                              const eventHour = new Date(e.startDate).getHours();
                              return eventHour === hour;
                            });
                            return (
                              <div key={dayIdx} className="border border-gray-100 p-1 min-h-[50px] hover:bg-gray-50">
                                {hourEvents.slice(0, 1).map(event => (
                                  <div
                                    key={event.id}
                                    onClick={() => handleViewEvent(event)}
                                    className={cn(
                                      'text-xs p-1 rounded truncate cursor-pointer',
                                      typeConfig[event.type].bgClass,
                                      typeConfig[event.type].textClass
                                    )}
                                  >
                                    {event.title}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Day View */}
          {viewMode === 'day' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDay || currentDate)}
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedDay(new Date((selectedDay || currentDate).getTime() - 86400000))}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDay(new Date((selectedDay || currentDate).getTime() + 86400000))}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const hourEvents = getEventsForDate(selectedDay || currentDate).filter(e => {
                      const eventHour = new Date(e.startDate).getHours();
                      return eventHour === hour;
                    });
                    return (
                      <div key={hour} className="flex gap-4 border-t border-gray-100 py-2">
                        <div className="w-16 text-sm text-gray-500 font-medium">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="flex-1 min-h-[40px]">
                          {hourEvents.map(event => (
                            <div
                              key={event.id}
                              onClick={() => handleViewEvent(event)}
                              className={cn(
                                'p-2 rounded-lg cursor-pointer mb-1',
                                typeConfig[event.type].bgClass
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span>{typeConfig[event.type].icon}</span>
                                <span className={cn('font-medium', typeConfig[event.type].textClass)}>{event.title}</span>
                                <Badge variant={statusConfig[event.status].variant}>{statusConfig[event.status].label}</Badge>
                              </div>
                              {event.location && (
                                <p className="text-sm text-gray-600 mt-1">📍 {event.location}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agenda View */}
          {viewMode === 'agenda' && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Eventos</h2>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">No hay eventos próximos</p>
                    <Button className="mt-4" onClick={() => handleOpenCreateModal()}>Crear Evento</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleViewEvent(event)}
                        className={cn(
                          'p-4 rounded-lg cursor-pointer border-l-4 hover:shadow-md transition-shadow bg-white',
                          event.type === 'meeting' && 'border-blue-500',
                          event.type === 'task' && 'border-purple-500',
                          event.type === 'reminder' && 'border-amber-500',
                          event.type === 'deadline' && 'border-red-500',
                          event.type === 'payment' && 'border-emerald-500',
                          event.type === 'call' && 'border-cyan-500',
                          event.type === 'other' && 'border-gray-500'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{typeConfig[event.type].icon}</span>
                              <h3 className="font-semibold text-gray-900">{event.title}</h3>
                            </div>
                            <p className="text-sm text-gray-600">{formatDateTime(event.startDate)}</p>
                            {event.location && <p className="text-sm text-gray-500 mt-1">📍 {event.location}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={priorityConfig[event.priority].variant}>{priorityConfig[event.priority].label}</Badge>
                            <Badge variant={statusConfig[event.status].variant}>{statusConfig[event.status].label}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Evento</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Prioridad</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No hay eventos. <button onClick={() => handleOpenCreateModal()} className="text-indigo-600 hover:underline">Crear uno</button>
                          </td>
                        </tr>
                      ) : (
                        filteredEvents.map(event => (
                          <tr key={event.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span>{typeConfig[event.type].icon}</span>
                                <span className="font-medium text-gray-900">{event.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('px-2 py-1 rounded text-xs font-medium', typeConfig[event.type].bgClass, typeConfig[event.type].textClass)}>
                                {typeConfig[event.type].label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(event.startDate)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={statusConfig[event.status].variant}>{statusConfig[event.status].label}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={priorityConfig[event.priority].variant}>{priorityConfig[event.priority].label}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleViewEvent(event)}>Ver</Button>
                                <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(event)}>Editar</Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Day Events */}
          {selectedDay && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(selectedDay)}
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => handleOpenCreateModal(selectedDay)}>+</Button>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay eventos este día</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleViewEvent(event)}
                        className={cn(
                          'p-2 rounded cursor-pointer',
                          typeConfig[event.type].bgClass
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{typeConfig[event.type].icon}</span>
                          <span className={cn('text-sm font-medium truncate', typeConfig[event.type].textClass)}>{event.title}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {event.allDay ? 'Todo el día' : new Date(event.startDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Tipos de Evento</h3>
              <div className="space-y-2">
                {Object.entries(typeConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', config.bgClass, config.textClass)}>
                      {config.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Eventos hoy:</span>
                  <span className="font-medium text-gray-900">{eventStats.today}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Esta semana:</span>
                  <span className="font-medium text-gray-900">{eventStats.thisWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pendientes:</span>
                  <span className="font-medium text-amber-600">{eventStats.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completados:</span>
                  <span className="font-medium text-green-600">{eventStats.completed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Event Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setSelectedEvent(null); }}
        title="Detalle del Evento"
        size="md"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className={cn('p-4 rounded-lg', typeConfig[selectedEvent.type].bgClass)}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{typeConfig[selectedEvent.type].icon}</span>
                <div>
                  <h3 className={cn('text-xl font-bold', typeConfig[selectedEvent.type].textClass)}>{selectedEvent.title}</h3>
                  <p className="text-sm text-gray-700">{typeConfig[selectedEvent.type].label}</p>
                </div>
              </div>
            </div>

            {selectedEvent.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Descripción</h4>
                <p className="text-gray-600">{selectedEvent.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Inicio</h4>
                <p className="text-gray-600">{formatDateTime(selectedEvent.startDate)}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Fin</h4>
                <p className="text-gray-600">{formatDateTime(selectedEvent.endDate)}</p>
              </div>
            </div>

            {selectedEvent.location && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Ubicación</h4>
                <p className="text-gray-600">📍 {selectedEvent.location}</p>
              </div>
            )}

            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Asistentes</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.attendees.map((a, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">{a}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Estado</h4>
                <Badge variant={statusConfig[selectedEvent.status].variant}>{statusConfig[selectedEvent.status].label}</Badge>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Prioridad</h4>
                <Badge variant={priorityConfig[selectedEvent.priority].variant}>{priorityConfig[selectedEvent.priority].label}</Badge>
              </div>
            </div>

            {selectedEvent.relatedType && selectedEvent.relatedId && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Relacionado con</h4>
                <p className="text-gray-600">{getRelatedName(selectedEvent.relatedType, selectedEvent.relatedId)}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => handleOpenEditModal(selectedEvent)}>Editar</Button>
              {selectedEvent.status !== 'completed' && (
                <Button variant="outline" onClick={handleMarkCompleted}>Marcar Completado</Button>
              )}
              <Button variant="danger" onClick={handleDeleteEvent}>Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setIsEditMode(false); setSelectedEvent(null); setFormData(getDefaultFormData()); }}
        title={isEditMode ? 'Editar Evento' : 'Nuevo Evento'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título del evento"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del evento"
              rows={3}
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CalendarEventType })}
                options={Object.entries(typeConfig).map(([key, config]) => ({ value: key, label: `${config.icon} ${config.label}` }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as CalendarEventPriority })}
                options={Object.entries(priorityConfig).map(([key, config]) => ({ value: key, label: config.label }))}
              />
            </div>
          </div>

          {/* All Day */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.allDay}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700">Todo el día</label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio *</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                required
              />
            </div>
            {!formData.allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
            {!formData.allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ej: Sala de reuniones, Zoom, etc."
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asistentes</label>
            <Input
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              placeholder="Emails separados por coma"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CalendarEventStatus })}
              options={Object.entries(statusConfig).map(([key, config]) => ({ value: key, label: config.label }))}
            />
          </div>

          {/* Related Entity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vincular a</label>
              <Select
                value={formData.relatedType}
                onChange={(e) => setFormData({ ...formData, relatedType: e.target.value, relatedId: '' })}
                options={[
                  { value: '', label: 'Sin vincular' },
                  { value: 'project', label: 'Proyecto' },
                  { value: 'client', label: 'Cliente' },
                  { value: 'deal', label: 'Oportunidad' },
                  { value: 'task', label: 'Tarea' },
                ]}
              />
            </div>
            {formData.relatedType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar</label>
                <Select
                  value={formData.relatedId}
                  onChange={(e) => setFormData({ ...formData, relatedId: e.target.value })}
                  options={[{ value: '', label: 'Seleccionar...' }, ...getRelatedItems()]}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditMode ? 'Guardar Cambios' : 'Crear Evento'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
