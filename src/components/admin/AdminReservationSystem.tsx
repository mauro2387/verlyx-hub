import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import ReservationSystem from '../enhanced/ReservationSystem';
import ReservationList from '../ReservationList';
import { Calendar as CalendarIcon, Filter, Search, Download, ChevronLeft, ChevronRight, Clock, Users, MapPin } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const AdminReservationSystem: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAmenity, setFilterAmenity] = useState('all');
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('month');
  const [activeTab, setActiveTab] = useState('all');

  // Sample reservations data
  const reservations = [
    {
      id: 1,
      date: new Date(),
      time: '10:00 - 12:00',
      amenity: 'Piscina',
      resident: 'Juan Pérez',
      apartment: 'Apt 1201',
      guests: 2,
      status: 'confirmada'
    },
    {
      id: 2,
      date: new Date(),
      time: '14:00 - 16:00',
      amenity: 'Gimnasio',
      resident: 'María González',
      apartment: 'Apt 804',
      guests: 1,
      status: 'confirmada'
    },
    {
      id: 3,
      date: addDays(new Date(), 1),
      time: '18:00 - 20:00',
      amenity: 'Parrillero',
      resident: 'Carlos Silva',
      apartment: 'Apt 1507',
      guests: 6,
      status: 'pendiente'
    }
  ];

  const getReservationsForDate = (date: Date) => {
    return reservations.filter(res => isSameDay(res.date, date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmada': return 'bg-green-100 text-green-800 border-green-200';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelada': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAmenityColor = (amenity: string) => {
    switch (amenity) {
      case 'Piscina': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Gimnasio': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Parrillero': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    if (calendarView === 'day') {
      setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : addDays(prev, -1));
    } else if (calendarView === 'week') {
      setSelectedDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setSelectedDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const renderDayView = () => {
    const dayReservations = getReservationsForDate(selectedDate);
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Panel lateral de información */}
          <div className="xl:col-span-1">
            <Card className="p-6 sticky top-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[#0A1E40] mb-2">
                  {format(selectedDate, 'd')}
                </h3>
                <div className="text-lg font-semibold text-gray-700 mb-1">
                  {format(selectedDate, 'EEEE', { locale: es })}
                </div>
                <div className="text-sm text-gray-500">
                  {format(selectedDate, 'MMMM yyyy', { locale: es })}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <div className="text-2xl font-bold text-blue-900 mb-1">{dayReservations.length}</div>
                  <div className="text-sm text-blue-700 font-medium">Total reservas</div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center">
                  <div className="text-2xl font-bold text-green-900 mb-1">
                    {Math.max(0, 100 - (dayReservations.length * 15))}%
                  </div>
                  <div className="text-sm text-green-700 font-medium">Disponibilidad</div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Button 
                    className="w-full bg-[#0A1E40] hover:bg-[#123061]"
                    onClick={() => setCalendarView('month')}
                  >
                    Volver al Mes
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Panel principal de reservas */}
          <div className="xl:col-span-3">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-2xl font-bold text-[#0A1E40] mb-2">Reservas del día</h4>
                  <p className="text-gray-600">
                    {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
                <Button 
                  className="bg-[#0A1E40] hover:bg-[#123061]"
                  onClick={() => setActiveTab('new')}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Nueva Reserva
                </Button>
              </div>
              
              {dayReservations.length > 0 ? (
                <div className="space-y-6">
                  {dayReservations.map((reservation) => (
                    <div key={reservation.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Información principal */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getAmenityColor(reservation.amenity)}`}>
                              {reservation.amenity}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(reservation.status)}`}>
                              {reservation.status.toUpperCase()}
                            </span>
                          </div>
                          
                          {/* Grid de información */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <Clock className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-lg">{reservation.time}</div>
                                <div className="text-sm text-gray-500">Horario de reserva</div>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <MapPin className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{reservation.resident}</div>
                                <div className="text-sm text-gray-500">{reservation.apartment}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <Users className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{reservation.guests} personas</div>
                                <div className="text-sm text-gray-500">Asistentes confirmados</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Botones de acción */}
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-auto">
                          <Button variant="outline" className="border-[#0A1E40] text-[#0A1E40] hover:bg-[#0A1E40] hover:text-white">
                            Ver Detalles
                          </Button>
                          <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                            Editar
                          </Button>
                          <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <CalendarIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-500 mb-3">No hay reservas para este día</h3>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    Todas las instalaciones están disponibles. Puedes crear una nueva reserva para este día.
                  </p>
                  <Button 
                    className="bg-[#0A1E40] hover:bg-[#123061]"
                    onClick={() => setActiveTab('new')}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Crear Nueva Reserva
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <Card className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {days.map((day) => {
            const dayReservations = getReservationsForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={day.toString()} className="space-y-3">
                <div className={`text-center p-3 rounded-xl transition-all ${
                  isToday 
                    ? 'bg-[#0A1E40] text-white shadow-lg' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}>
                  <div className="text-xs font-medium uppercase tracking-wide">
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div className="space-y-2 min-h-[300px]">
                  {dayReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all duration-200 ${getAmenityColor(reservation.amenity)}`}
                      onClick={() => {
                        setSelectedDate(day);
                        setCalendarView('day');
                      }}
                    >
                      <div className="font-semibold text-sm truncate">{reservation.amenity}</div>
                      <div className="text-xs opacity-75 mt-1">{reservation.time}</div>
                      <div className="text-xs opacity-75 truncate">{reservation.resident}</div>
                      <div className="text-xs opacity-75">{reservation.guests} personas</div>
                    </div>
                  ))}
                  
                  {dayReservations.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8">
                      Sin reservas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <Card className="p-4">
        {/* Tabla completa incluyendo header */}
        <div className="w-full">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th className="w-1/7 p-2 text-center text-sm font-bold text-gray-600 bg-gray-100 rounded-l border">Lun</th>
                <th className="w-1/7 p-2 text-center text-sm font-bold text-gray-600 bg-gray-100 border">Mar</th>
                <th className="w-1/7 p-2 text-center text-sm font-bold text-gray-600 bg-gray-100 border">Mié</th>
                <th className="w-1/7 p-2 text-center text-sm font-bold text-gray-600 bg-gray-100 border">Jue</th>
                <th className="w-1/7 p-2 text-center text-sm font-bold text-gray-600 bg-gray-100 border">Vie</th>
                <th className="w-1/7 p-2 text-center text-sm font-bold text-gray-600 bg-gray-100 border">Sáb</th>
                <th className="w-1/7 p-2 text-center text-sm font-bold text-gray-600 bg-gray-100 rounded-r border">Dom</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => (
                <tr key={weekIndex}>
                  {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day) => {
                    const dayReservations = getReservationsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, selectedDate);
                    
                    return (
                      <td
                        key={day.toString()}
                        className={`w-1/7 h-24 p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 align-top ${
                          isToday ? 'bg-blue-50 border-blue-300' : ''
                        } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                        onClick={() => {
                          setSelectedDate(day);
                          setCalendarView('day');
                        }}
                      >
                        <div className="h-full flex flex-col">
                          <div className={`text-sm font-semibold mb-1 ${
                            isToday ? 'text-blue-600' : 'text-gray-900'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className="flex-1 space-y-1 overflow-hidden">
                            {dayReservations.slice(0, 2).map((reservation) => (
                              <div
                                key={reservation.id}
                                className={`text-xs p-1 rounded truncate ${getAmenityColor(reservation.amenity)}`}
                              >
                                {reservation.amenity}
                              </div>
                            ))}
                            {dayReservations.length > 2 && (
                              <div className="text-xs text-gray-500">+{dayReservations.length - 2}</div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0A1E40]">Sistema de Reservas</h2>
            <p className="text-gray-600">Gestión centralizada de reservas de instalaciones</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button 
              className="bg-[#0A1E40]"
              onClick={() => setActiveTab('new')}
            >
              Nueva Reserva
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">Todas las Reservas</TabsTrigger>
            <TabsTrigger value="new">Nueva Reserva</TabsTrigger>
            <TabsTrigger value="calendar">Vista Calendario</TabsTrigger>
            <TabsTrigger value="analytics">Analíticas</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <Input
                      placeholder="Buscar por residente o apartamento..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="confirmada">Confirmadas</SelectItem>
                        <SelectItem value="pendiente">Pendientes</SelectItem>
                        <SelectItem value="cancelada">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={filterAmenity} onValueChange={setFilterAmenity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Instalación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las instalaciones</SelectItem>
                        <SelectItem value="piscina">Piscina</SelectItem>
                        <SelectItem value="gimnasio">Gimnasio</SelectItem>
                        <SelectItem value="parrillero">Parrillero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <ReservationList />
            </div>
          </TabsContent>

          <TabsContent value="new">
            <ReservationSystem />
          </TabsContent>

          <TabsContent value="calendar">
            <div className="space-y-6">
              {/* Calendar Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateCalendar('prev')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <h3 className="text-xl font-semibold text-[#0A1E40] min-w-[200px] text-center">
                      {calendarView === 'month' && format(selectedDate, 'MMMM yyyy', { locale: es })}
                      {calendarView === 'week' && `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: es })}`}
                      {calendarView === 'day' && format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
                    </h3>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateCalendar('next')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Hoy
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {(['day', 'week', 'month'] as const).map((view) => (
                      <Button
                        key={view}
                        variant={calendarView === view ? 'default' : 'ghost'}
                        size="sm"
                        className={`px-3 py-1 text-xs transition-all ${
                          calendarView === view 
                            ? 'bg-[#0A1E40] text-white shadow-sm hover:bg-[#123061]' 
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => setCalendarView(view)}
                      >
                        {view === 'day' ? 'Día' : view === 'week' ? 'Semana' : 'Mes'}
                      </Button>
                    ))}
                  </div>
                  
                  <Select value={filterAmenity} onValueChange={setFilterAmenity}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Instalación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="piscina">Piscina</SelectItem>
                      <SelectItem value="gimnasio">Gimnasio</SelectItem>
                      <SelectItem value="parrillero">Parrillero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calendar Views */}
              {calendarView === 'day' && renderDayView()}
              {calendarView === 'week' && renderWeekView()}
              {calendarView === 'month' && renderMonthView()}

              {/* Legend */}
              <Card className="p-4">
                <h4 className="font-semibold text-[#0A1E40] mb-3">Leyenda</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                    <span className="text-sm text-gray-600">Piscina</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200"></div>
                    <span className="text-sm text-gray-600">Gimnasio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></div>
                    <span className="text-sm text-gray-600">Parrillero</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                    <span className="text-sm text-gray-600">Confirmada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
                    <span className="text-sm text-gray-600">Pendiente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
                    <span className="text-sm text-gray-600">Cancelada</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-[#0A1E40] mb-4">Uso de Instalaciones</h3>
                <div className="h-64 bg-gray-100 rounded-lg"></div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Instalación más reservada</p>
                    <p className="font-semibold text-[#0A1E40]">Piscina (45%)</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Horario más popular</p>
                    <p className="font-semibold text-[#0A1E40]">16:00 - 18:00</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-[#0A1E40] mb-4">Tendencias Mensuales</h3>
                <div className="h-64 bg-gray-100 rounded-lg"></div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total de Reservas</p>
                    <p className="font-semibold text-[#0A1E40]">324 este mes</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tasa de Ocupación</p>
                    <p className="font-semibold text-green-600">78%</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminReservationSystem;