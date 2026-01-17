import { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar, DollarSign, Wrench, CalendarCheck, QrCode, Upload, CheckCircle, Clock, AlertCircle, Star, Ticket, FileText, Loader2 } from 'lucide-react';
import OwnerReservationSystem from './owner/OwnerReservationSystem';
import { toast } from 'sonner';

// Hooks de servicios reales
import { useOwnerDashboard } from '../hooks/useServices';
import { useAuth } from '../contexts/AuthContext';
import * as MaintenanceService from '../services/maintenance/MaintenanceService';
import * as AccessService from '../services/accessService';

interface OwnerDashboardProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function OwnerDashboard({ user, onLogout }: OwnerDashboardProps) {
  // Hook combinado que trae todos los datos del propietario
  const {
    debt,
    statement,
    reservations,
    maintenance,
    announcements,
    activities,
    isLoading,
    refetchAll,
  } = useOwnerDashboard();

  const { user: authUser } = useAuth();

  const [newReport, setNewReport] = useState({
    title: '',
    description: '',
    category: 'other' as MaintenanceService.MaintenanceCategory,
    priority: 'normal' as MaintenanceService.MaintenancePriority,
  });

  const [visitorForm, setVisitorForm] = useState({
    firstName: '',
    lastName: '',
    documentNumber: '',
    phone: '',
    visitDate: '',
    details: ''
  });

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MaintenanceService.MaintenanceRequest | null>(null);
  const [ratingForm, setRatingForm] = useState({ score: 0, feedback: '' });
  const [billDetailsOpen, setBillDetailsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Enviar reporte de mantenimiento
  const handleSubmitReport = async () => {
    if (!newReport.title.trim()) {
      toast.error('Ingresa un título para el reporte');
      return;
    }

    if (!authUser) {
      toast.error('Debes iniciar sesión');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await MaintenanceService.createMaintenanceRequest({
        buildingId: authUser.buildingIds[0] || '',
        unitId: authUser.unitIds[0] || '',
        category: newReport.category,
        priority: newReport.priority,
        title: newReport.title,
        description: newReport.description,
        type: 'request',
        location: authUser.unitIds[0] || 'Unidad del propietario',
        requester: {
          userId: authUser.id,
          name: `${authUser.firstName} ${authUser.lastName}`,
          email: authUser.email,
          phone: authUser.phone,
          unitNumber: authUser.unitIds[0],
        },
      }, {
        userId: authUser.id,
        name: `${authUser.firstName} ${authUser.lastName}`,
        role: authUser.role,
      });

      if (result.success) {
        toast.success('Reporte enviado exitosamente', {
          description: `ID: ${result.data?.id.substring(0, 8).toUpperCase()}`,
        });
        setNewReport({ title: '', description: '', category: 'other', priority: 'normal' });
        refetchAll();
      } else {
        toast.error(result.error?.message || 'Error al enviar reporte');
      }
    } catch (e) {
      toast.error('Error al enviar reporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Autorizar visitante
  const handleVisitorSubmit = async () => {
    if (!visitorForm.firstName || !visitorForm.lastName || !visitorForm.documentNumber || !visitorForm.visitDate) {
      toast.error('Completa los datos obligatorios del visitante');
      return;
    }

    if (!authUser) {
      toast.error('Debes iniciar sesión');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await AccessService.createAccessAuthorization({
        buildingId: authUser.buildingIds[0] || '',
        unitId: authUser.unitIds[0] || '',
        visitor: {
          firstName: visitorForm.firstName,
          lastName: visitorForm.lastName,
          documentNumber: visitorForm.documentNumber,
          documentType: 'CI',
          phone: visitorForm.phone,
          relationship: 'other',
        },
        type: 'single_visit',
        validFrom: visitorForm.visitDate,
        validUntil: visitorForm.visitDate,
        observations: visitorForm.details,
        autoApprove: true,
      });

      if (result.success) {
        toast.success('Autorización creada', {
          description: `Código de acceso: ${result.data?.accessCode}`,
        });
        setVisitorForm({ firstName: '', lastName: '', documentNumber: '', phone: '', visitDate: '', details: '' });
        refetchAll();
      } else {
        toast.error(result.error?.message || 'Error al crear autorización');
      }
    } catch (e) {
      toast.error('Error al crear autorización');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calificar trabajo de mantenimiento
  const handleSubmitRating = async () => {
    if (!ratingForm.score || !selectedReport) {
      toast.error('Selecciona una calificación');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await MaintenanceService.rateWork(
        selectedReport.id,
        ratingForm.score as 1 | 2 | 3 | 4 | 5,
        ratingForm.feedback
      );

      if (result.success) {
        toast.success('¡Gracias por tu calificación!');
        setRatingDialogOpen(false);
        refetchAll();
      } else {
        toast.error(result.error?.message || 'Error al enviar calificación');
      }
    } catch (e) {
      toast.error('Error al enviar calificación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'pending_approval': 'Pendiente',
      'approved': 'Aprobado',
      'in_progress': 'En progreso',
      'completed': 'Completado',
      'rejected': 'Rechazado',
      'cancelled': 'Cancelado',
      'on_hold': 'En espera',
    };
    return labels[status] || status;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#0A1E40] mx-auto mb-4" />
            <p className="text-gray-600">Cargando tu información...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calcular estadísticas
  const pendingMaintenanceCount = maintenance.filter(m => m.status !== 'completed' && m.status !== 'cancelled').length;
  const upcomingReservationsCount = reservations.filter(r => r.status === 'confirmed' || r.status === 'pending').length;
  const currentBalance = debt?.totalDebt || 0;
  const hasOverdue = debt && debt.overdueDebt > 0;

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[#0A1E40] mb-2" style={{ fontSize: '2rem', fontWeight: 700 }}>
            Bienvenido de nuevo, {user.name}
          </h1>
          <p className="text-gray-600">Apartamento {user.apartment} • Esto es lo que sucede hoy</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-[#C9A961]" />
              {hasOverdue ? (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Vencido</Badge>
              ) : currentBalance > 0 ? (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>
              ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Al día</Badge>
              )}
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {formatCurrency(currentBalance)}
            </div>
            <p className="text-gray-600 text-sm">Saldo actual</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Wrench className="w-8 h-8 text-blue-500" />
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Activas</Badge>
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {pendingMaintenanceCount}
            </div>
            <p className="text-gray-600 text-sm">Solicitudes abiertas</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CalendarCheck className="w-8 h-8 text-green-500" />
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Próximas</Badge>
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {upcomingReservationsCount}
            </div>
            <p className="text-gray-600 text-sm">Reservas</p>
          </Card>

          <Card className="p-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-[#0A1E40] hover:bg-[#0f2952] text-white">
                  <QrCode className="w-4 h-4 mr-2" />
                  Autorizar visitante
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Autorizar nuevo visitante</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0A1E40]">Nombre *</label>
                      <Input
                        value={visitorForm.firstName}
                        onChange={(e) => setVisitorForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Ej: Laura"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0A1E40]">Apellido *</label>
                      <Input
                        value={visitorForm.lastName}
                        onChange={(e) => setVisitorForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Ej: Gómez"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0A1E40]">Documento *</label>
                      <Input
                        value={visitorForm.documentNumber}
                        onChange={(e) => setVisitorForm(prev => ({ ...prev, documentNumber: e.target.value }))}
                        placeholder="Ej: 4.567.890"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0A1E40]">Teléfono</label>
                      <Input
                        value={visitorForm.phone}
                        onChange={(e) => setVisitorForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Ej: 0981 123 456"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0A1E40]">Fecha de visita *</label>
                    <Input
                      type="date"
                      value={visitorForm.visitDate}
                      onChange={(e) => setVisitorForm(prev => ({ ...prev, visitDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0A1E40]">Observaciones</label>
                    <Textarea
                      value={visitorForm.details}
                      onChange={(e) => setVisitorForm(prev => ({ ...prev, details: e.target.value }))}
                      placeholder="Motivo de la visita, horario estimado..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <Button 
                    onClick={handleVisitorSubmit} 
                    className="w-full bg-[#C9A961] hover:bg-[#b39350] text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Crear autorización
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </Card>
        </div>

        {/* Anuncios recientes */}
        {announcements.length > 0 && (
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">{announcements[0].title}</h4>
                <p className="text-sm text-blue-700 line-clamp-2">{announcements[0].content}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="payments">
              <DollarSign className="w-4 h-4 mr-2" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              <Wrench className="w-4 h-4 mr-2" />
              Mantenimiento
            </TabsTrigger>
            <TabsTrigger value="reservations">
              <Calendar className="w-4 h-4 mr-2" />
              Reservas
            </TabsTrigger>
            <TabsTrigger value="activities">
              <Ticket className="w-4 h-4 mr-2" />
              Actividades
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <h3 className="text-[#0A1E40] font-bold mb-4">Movimientos recientes</h3>
                {statement && statement.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {statement.transactions.slice(0, 10).map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-[#0A1E40] font-semibold">{tx.description}</p>
                          <p className="text-gray-600 text-sm">{formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.type === 'charge' ? 'text-red-600' : 'text-green-600'}`}>
                            {tx.type === 'charge' ? '-' : '+'}{formatCurrency(tx.amount)}
                          </p>
                          <Badge className={tx.amount < 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {tx.amount < 0 ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay movimientos registrados</p>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-[#0A1E40] font-bold mb-4">Resumen de cuenta</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Saldo actual</p>
                    <p className={`font-bold text-2xl ${currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(currentBalance)}
                    </p>
                  </div>
                  
                  {debt && debt.overdueDebt > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-gray-600 text-sm mb-1">Monto vencido</p>
                      <p className="text-red-600 font-bold">
                        {formatCurrency(debt.overdueDebt)}
                      </p>
                      <p className="text-red-500 text-xs">{debt.overdueMonths} mes(es) vencido(s)</p>
                    </div>
                  )}

                  {statement && statement.transactions.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-gray-600 text-sm mb-1">Último movimiento</p>
                      <p className="text-[#0A1E40] font-semibold">
                        {formatCurrency(statement.transactions[0].amount)}
                      </p>
                      <p className="text-gray-500 text-xs">{formatDate(statement.transactions[0].createdAt)}</p>
                    </div>
                  )}

                  <Button className="w-full bg-[#C9A961] hover:bg-[#b39350] text-white mt-4">
                    Realizar pago
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-[#0A1E40] text-[#0A1E40]"
                    onClick={() => setBillDetailsOpen(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Estado de Cuenta
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <h3 className="text-[#0A1E40] font-bold mb-4">Mis solicitudes de mantenimiento</h3>
                {maintenance.length > 0 ? (
                  <div className="space-y-3">
                    {maintenance.map((request) => (
                      <div key={request.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-2">
                            {getPriorityIcon(request.priority)}
                            <div>
                              <p className="text-[#0A1E40] font-semibold">{request.title}</p>
                              <p className="text-gray-600 text-sm">
                                {request.id.substring(0, 8).toUpperCase()} • {formatDate(request.audit.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getStatusColor(request.status)}>
                              {getStatusLabel(request.status)}
                            </Badge>
                            {request.status === 'completed' && !request.rating && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-100 bg-white text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setSelectedReport(request);
                                  setRatingForm({ score: 0, feedback: '' });
                                  setRatingDialogOpen(true);
                                }}
                              >
                                <Star className="mr-2 h-4 w-4" /> Calificar
                              </Button>
                            )}
                            {request.rating && (
                              <Badge className="bg-blue-100 text-blue-800">
                                {request.rating.score}/5 ⭐
                              </Badge>
                            )}
                          </div>
                        </div>
                        {request.description && (
                          <p className="text-gray-600 text-sm mt-2 line-clamp-2">{request.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No tienes solicitudes de mantenimiento</p>
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-[#0A1E40] font-bold mb-4">Nuevo reporte</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-[#0A1E40] text-sm font-medium">Título *</label>
                    <Input
                      value={newReport.title}
                      onChange={(e) => setNewReport(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Descripción breve del problema"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-[#0A1E40] text-sm font-medium">Categoría</label>
                    <select
                      value={newReport.category}
                      onChange={(e) => setNewReport(prev => ({ ...prev, category: e.target.value as MaintenanceService.MaintenanceCategory }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="general">General</option>
                      <option value="plumbing">Plomería</option>
                      <option value="electrical">Electricidad</option>
                      <option value="hvac">Climatización</option>
                      <option value="structural">Estructura</option>
                      <option value="painting">Pintura</option>
                      <option value="cleaning">Limpieza</option>
                      <option value="security">Seguridad</option>
                      <option value="elevator">Ascensores</option>
                      <option value="pool">Piscina</option>
                      <option value="garden">Jardín</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-[#0A1E40] text-sm font-medium">Prioridad</label>
                    <select
                      value={newReport.priority}
                      onChange={(e) => setNewReport(prev => ({ ...prev, priority: e.target.value as MaintenanceService.MaintenancePriority }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-[#0A1E40] text-sm font-medium">Descripción</label>
                    <Textarea
                      value={newReport.description}
                      onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe con detalle el problema"
                      rows={4}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-900">
                      Tu reporte será asignado automáticamente al equipo correspondiente.
                    </p>
                  </div>

                  <Button 
                    onClick={handleSubmitReport} 
                    className="w-full bg-[#0A1E40] hover:bg-[#0f2952] text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Enviar reporte
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <OwnerReservationSystem />
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <Card key={activity.id} className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-[#0A1E40] font-bold text-lg">{activity.title}</h4>
                      <Badge className={getStatusColor(activity.status)}>
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{activity.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(activity.startDate)}</span>
                      </div>
                      {activity.location && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">📍 {activity.location}</span>
                        </div>
                      )}
                      {activity.maxCapacity && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">
                            👥 Capacidad: {activity.maxCapacity}
                          </span>
                        </div>
                      )}
                    </div>
                    {activity.requiresRegistration && (
                      <Button className="w-full mt-4 bg-[#C9A961] hover:bg-[#b39350] text-white">
                        Inscribirme
                      </Button>
                    )}
                  </Card>
                ))
              ) : (
                <Card className="col-span-2 p-8 text-center">
                  <Ticket className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500">No hay actividades programadas</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Rating Dialog */}
        <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Calificar trabajo completado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedReport && (
                <p className="text-sm text-gray-600">
                  {selectedReport.title} • {selectedReport.id.substring(0, 8).toUpperCase()}
                </p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#0A1E40]">Calificación</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRatingForm(prev => ({ ...prev, score: value }))}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                        ratingForm.score >= value
                          ? 'border-[#0A1E40] bg-[#0A1E40] text-white'
                          : 'border-gray-300 bg-white text-[#0A1E40] hover:bg-gray-100'
                      }`}
                    >
                      <Star className={`h-5 w-5 ${ratingForm.score >= value ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0A1E40]">Comentarios</label>
                <Textarea
                  rows={3}
                  placeholder="Comparte tu experiencia..."
                  value={ratingForm.feedback}
                  onChange={(e) => setRatingForm(prev => ({ ...prev, feedback: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRatingDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitRating} 
                  className="bg-[#0A1E40] text-white hover:bg-[#0f2952]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Enviar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Statement Dialog */}
        <Dialog open={billDetailsOpen} onOpenChange={setBillDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Estado de Cuenta - {user.apartment}
              </DialogTitle>
            </DialogHeader>
            
            {statement && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="bg-[#0A1E40] text-white p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm opacity-80">Saldo actual</p>
                      <p className="text-2xl font-bold">{formatCurrency(statement.closingBalance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">Período</p>
                      <p className="font-semibold">{statement.period}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {statement.transactions.map((tx, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-gray-500">{formatDate(tx.createdAt)}</p>
                      </div>
                      <p className={`font-bold ${tx.type === 'charge' ? 'text-red-600' : 'text-green-600'}`}>
                        {tx.type === 'charge' ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button className="flex-1 bg-[#C9A961] hover:bg-[#b39350] text-white">
                <DollarSign className="w-4 h-4 mr-2" />
                Pagar
              </Button>
              <Button variant="outline" onClick={() => setBillDetailsOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
