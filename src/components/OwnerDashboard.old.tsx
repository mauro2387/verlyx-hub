import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar, DollarSign, Wrench, CalendarCheck, QrCode, Upload, CheckCircle, Clock, AlertCircle, Star, Ticket, FileText } from 'lucide-react';
import OwnerReservationSystem from './owner/OwnerReservationSystem';
import { toast } from 'sonner';

interface OwnerDashboardProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function OwnerDashboard({ user, onLogout }: OwnerDashboardProps) {
  const [newReport, setNewReport] = useState({
    title: '',
    description: '',
    category: ''
  });
  const [visitorForm, setVisitorForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    visitDate: '',
    details: ''
  });
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<(typeof maintenanceReports)[number] | null>(null);
  const [ratingForm, setRatingForm] = useState({
    score: 0,
    feedback: ''
  });
  const [experienceDetailsOpen, setExperienceDetailsOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<(typeof curatedExperiences)[number] | null>(null);
  const [billDetailsOpen, setBillDetailsOpen] = useState(false);
  const accountBalance = {
    current: -450.00,
    lastPayment: 2500.00,
    lastPaymentDate: '2025-10-15',
    nextDue: '2025-11-15'
  };

  const recentPayments = [
    { date: '2025-10-15', amount: 2500.00, description: 'Cuota mensual + gastos', status: 'paid' },
    { date: '2025-09-15', amount: 2500.00, description: 'Cuota mensual + gastos', status: 'paid' },
    { date: '2025-08-15', amount: 2500.00, description: 'Cuota mensual + gastos', status: 'paid' }
  ];

  // Planilla detallada del mes actual
  const monthlyBillDetail = {
    month: 'Noviembre 2025',
    apartment: user.apartment || '1205',
    dueDate: '2025-11-15',
    issueDate: '2025-11-01',
    items: [
      {
        category: 'Cuota de Administración',
        items: [
          { description: 'Cuota básica mensual', amount: 1850.00 },
          { description: 'Fondo de reserva (5%)', amount: 92.50 },
          { description: 'Seguro del edificio', amount: 85.00 }
        ]
      },
      {
        category: 'Servicios Comunes',
        items: [
          { description: 'Electricidad áreas comunes', amount: 125.00 },
          { description: 'Agua y saneamiento', amount: 110.00 },
          { description: 'Gas calefacción central', amount: 95.00 },
          { description: 'Internet fibra óptica', amount: 45.00 }
        ]
      },
      {
        category: 'Personal y Mantenimiento',
        items: [
          { description: 'Portería 24hs', amount: 180.00 },
          { description: 'Limpieza y mantenimiento', amount: 95.00 },
          { description: 'Jardinería', amount: 35.00 },
          { description: 'Técnico ascensores', amount: 25.00 }
        ]
      },
      {
        category: 'Servicios Adicionales',
        items: [
          { description: 'Gimnasio y spa', amount: 65.00 },
          { description: 'Piscina climatizada', amount: 45.00 },
          { description: 'Sala de eventos', amount: 30.00 },
          { description: 'Concierge premium', amount: 40.00 }
        ]
      }
    ],
    credits: [
      { description: 'Descuento pago anticipado', amount: -50.00 },
      { description: 'Bonificación referido', amount: -25.00 }
    ],
    previousBalance: -450.00,
    total: 2500.00
  };

  const [maintenanceReports, setMaintenanceReports] = useState([
    { id: 1, title: 'El aire acondicionado no enfría correctamente', category: 'Climatización', status: 'in-progress', date: '2025-10-28', urgency: 'medium', rated: false, score: null as number | null, feedback: '' },
    { id: 2, title: 'Grifo con fuga en el baño', category: 'Plomería', status: 'completed', date: '2025-10-25', urgency: 'low', rated: false, score: null as number | null, feedback: '' },
    { id: 3, title: 'Cerradura del balcón con problemas', category: 'Carpintería', status: 'pending', date: '2025-10-30', urgency: 'high', rated: false, score: null as number | null, feedback: '' }
  ]);

  const myReservations = [
    { amenity: 'Piscina', date: '2025-11-05', time: '10:00 - 12:00', status: 'confirmed' },
    { amenity: 'Área de BBQ', date: '2025-11-08', time: '18:00 - 21:00', status: 'confirmed' }
  ];

  const curatedExperiences = [
    {
      id: 'exp-1',
      title: 'Ciclo gastronómico sunset',
      description: 'Experiencia privada con chef residente, maridaje de autor y vista 360° en el sky lounge.',
      status: 'approved' as const,
      date: '2025-11-18',
      time: '19:30 - 22:00',
      location: 'Sky Lounge • Piso 32',
      quota: '12 lugares exclusivos',
      tags: ['Chef invitado', 'Maridaje premium']
    },
    {
      id: 'exp-2',
      title: 'Noches de jazz en lobby bar',
      description: 'Sesión íntima con cuarteto residente, cóctel signature y menú finger food del bar del edificio.',
      status: 'pending' as const,
      date: '2025-11-29',
      time: '21:00 - 23:30',
      location: 'Lobby bar • Planta baja',
      quota: '20 cupos por noche',
      tags: ['Música en vivo', 'Mixología house']
    },
    {
      id: 'exp-3',
      title: 'Wellness sunrise experience',
      description: 'Clase guiada de yoga y breathwork en la terraza wellness con estaciones de cold-press juicing.',
      status: 'pending' as const,
      date: '2025-12-05',
      time: '06:30 - 08:00',
      location: 'Terraza wellness • Piso 12',
      quota: '16 mats disponibles',
      tags: ['Bienestar', 'Concierge']
    }
  ];



  const handleSubmitReport = () => {
    toast.success('Reporte de mantenimiento enviado. Nuestra IA lo clasificó como: ' + (newReport.category || 'Mantenimiento general'));
    setNewReport({ title: '', description: '', category: '' });
  };
  const handleVisitorSubmit = () => {
    if (!visitorForm.firstName || !visitorForm.lastName || !visitorForm.phone || !visitorForm.visitDate) {
      toast.error('Completa los datos del visitante antes de enviar.');
      return;
    }

    toast.success('Solicitud de autorización enviada a recepción.');
    setVisitorForm({ firstName: '', lastName: '', phone: '', visitDate: '', details: '' });
  };

  const handleOpenRating = (report: (typeof maintenanceReports)[number]) => {
    setSelectedReport(report);
    setRatingForm({ score: 0, feedback: '' });
    setRatingDialogOpen(true);
  };

  const handleSubmitRating = () => {
    if (!ratingForm.score) {
      toast.error('Selecciona una calificación antes de enviar.');
      return;
    }

    toast.success('¡Gracias por calificar al equipo de mantenimiento!', {
      description: `${selectedReport?.title} • ${ratingForm.score}/5 estrellas`
    });
    if (selectedReport) {
      setMaintenanceReports((prev) =>
        prev.map((report) =>
          report.id === selectedReport.id
            ? { ...report, rated: true, score: ratingForm.score, feedback: ratingForm.feedback }
            : report
        )
      );
    }
    setRatingDialogOpen(false);
  };

  const handleRequestExperience = (experience: (typeof curatedExperiences)[number]) => {
    if (experience.status === 'pending') {
      toast.info('Esta experiencia está en evaluación. Te notificaremos cuando esté disponible para reservas.');
      return;
    }
    
    if (experience.status === 'approved') {
      toast.success('¡Solicitud enviada exitosamente!', {
        description: `Se ha registrado tu interés en "${experience.title}". Recibirás confirmación por email.`
      });
    }
  };

  const handleViewExperienceDetails = (experience: (typeof curatedExperiences)[number]) => {
    setSelectedExperience(experience);
    setExperienceDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Pagado', className: 'bg-green-100 text-green-800' };
      case 'pending':
        return { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' };
      default:
        return { label: 'Sin estado', className: 'bg-gray-100 text-gray-800' };
    }
  };

  const getMaintenanceStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'in-progress':
        return 'En progreso';
      case 'pending':
        return 'Pendiente';
      default:
        return 'Sin estado';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  // Nuevo helper para badge de experiencias
  const getExperienceBadge = (status: string) => {
    switch (status) {
      case 'approved': return { label: 'Aprobada', className: 'bg-green-100 text-green-800' };
      case 'pending': return { label: 'En evaluación', className: 'bg-yellow-100 text-yellow-800' };
      case 'rejected': return { label: 'Rechazada', className: 'bg-red-100 text-red-800' };
      default: return { label: 'Sin estado', className: 'bg-gray-100 text-gray-800' };
    }
  };

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
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Vencido</Badge>
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              ${Math.abs(accountBalance.current).toFixed(2)}
            </div>
            <p className="text-gray-600 text-sm">Saldo pendiente</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Wrench className="w-8 h-8 text-blue-500" />
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Activas</Badge>
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {maintenanceReports.filter(r => r.status !== 'completed').length}
            </div>
            <p className="text-gray-600 text-sm">Solicitudes abiertas</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CalendarCheck className="w-8 h-8 text-green-500" />
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Próximas</Badge>
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {myReservations.length}
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[#0A1E40]">Nombre</label>
                      <Input
                        value={visitorForm.firstName}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, firstName: event.target.value }))}
                        placeholder="Ej: Laura"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0A1E40]">Apellido</label>
                      <Input
                        value={visitorForm.lastName}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, lastName: event.target.value }))}
                        placeholder="Ej: Gómez"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[#0A1E40]">Teléfono</label>
                      <Input
                        value={visitorForm.phone}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, phone: event.target.value }))}
                        placeholder="Ej: +598 99 123 456"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0A1E40]">Fecha de visita</label>
                      <Input
                        type="date"
                        value={visitorForm.visitDate}
                        onChange={(event) => setVisitorForm((prev) => ({ ...prev, visitDate: event.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0A1E40]">Detalles adicionales</label>
                    <Textarea
                      value={visitorForm.details}
                      onChange={(event) => setVisitorForm((prev) => ({ ...prev, details: event.target.value }))}
                      placeholder="Ej: Motivo de la visita, horario estimado, necesidades especiales."
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <Button onClick={handleVisitorSubmit} className="w-full bg-[#C9A961] hover:bg-[#b39350] text-white">
                    Enviar autorización
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Esta información se envía automáticamente al equipo de recepción.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </Card>
        </div>

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
            <TabsTrigger value="experiences">
              <Ticket className="w-4 h-4 mr-2" />
              Experiencias
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <h3 className="text-[#0A1E40] mb-4">Historial de pagos</h3>
                <div className="space-y-3">
                  {recentPayments.map((payment, idx) => {
                    const { label, className } = getPaymentStatusBadge(payment.status);

                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{payment.description}</p>
                          <p className="text-gray-600 text-sm">{payment.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#0A1E40]" style={{ fontWeight: 700 }}>${payment.amount.toFixed(2)}</p>
                          <Badge className={className}>{label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-[#0A1E40] mb-4">Resumen de cuenta</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Saldo actual</p>
                    <p className="text-red-600" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      -${Math.abs(accountBalance.current).toFixed(2)}
                    </p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-gray-600 text-sm mb-1">Último pago</p>
                    <p className="text-[#0A1E40]" style={{ fontWeight: 700 }}>
                      ${accountBalance.lastPayment.toFixed(2)}
                    </p>
                    <p className="text-gray-500 text-xs">{accountBalance.lastPaymentDate}</p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-gray-600 text-sm mb-1">Próximo vencimiento</p>
                    <p className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{accountBalance.nextDue}</p>
                  </div>
                  <Button className="w-full bg-[#C9A961] hover:bg-[#b39350] text-white mt-4">
                    Realizar pago
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-[#0A1E40] text-[#0A1E40] hover:bg-[#0A1E40]/5 mt-3"
                    onClick={() => setBillDetailsOpen(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Planilla Completa
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <h3 className="text-[#0A1E40] mb-4">Mis solicitudes de mantenimiento</h3>
                <div className="space-y-3">
                  {maintenanceReports.map((report) => (
                    <div key={report.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2">
                          {getUrgencyIcon(report.urgency)}
                          <div>
                            <p className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{report.title}</p>
                            <p className="text-gray-600 text-sm">{report.category} • {report.date}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(report.status)}>
                            {getMaintenanceStatusLabel(report.status)}
                          </Badge>
                          {report.status === 'completed' && !report.rated && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-blue-100 bg-white text-blue-600 hover:bg-blue-50"
                              onClick={() => handleOpenRating(report)}
                            >
                              <Star className="mr-2 h-4 w-4" /> Calificar
                            </Button>
                          )}
                          {report.status === 'completed' && report.rated && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Calificado {report.score}/5
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-[#0A1E40] mb-4">Nuevo reporte</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-[#0A1E40]">Título del incidente</label>
                    <Input
                      value={newReport.title}
                      onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                      placeholder="Descripción breve"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-[#0A1E40]">Descripción</label>
                    <Textarea
                      value={newReport.description}
                      onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                      placeholder="Describe con detalle el problema"
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-[#0A1E40]">Subir fotos</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#C9A961] transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Haz clic para subir imágenes</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-900">
                      <strong>Clasificación por IA:</strong> Tu reporte se categorizará automáticamente y se asignará al equipo adecuado.
                    </p>
                  </div>
                  <Button onClick={handleSubmitReport} className="w-full bg-[#0A1E40] hover:bg-[#0f2952] text-white">
                    Enviar reporte
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <div className="grid grid-cols-1 gap-6">
              <OwnerReservationSystem />
            </div>
          </TabsContent>

          {/* Experiences Tab */}
          <TabsContent value="experiences">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 p-0 overflow-hidden bg-white border shadow-lg">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-[#0A1E40] text-2xl font-bold">
                        Experiencias Exclusivas
                      </h3>
                      <p className="text-gray-600 mt-2 text-base">
                        Actividades boutique diseñadas especialmente para nuestra comunidad de residentes
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {curatedExperiences.map((exp) => {
                      const badge = getExperienceBadge(exp.status);
                      return (
                        <div key={exp.id} className="group relative overflow-hidden rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-md">
                          <div className="p-6">
                            <div className="flex gap-6">
                              <div className="w-32 h-24 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-500 text-sm font-medium">
                                Imagen
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="text-[#0A1E40] font-bold text-lg mb-1">{exp.title}</h4>
                                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{exp.description}</p>
                                  </div>
                                  <Badge className={`${badge.className} ml-4 px-3 py-1 text-xs font-semibold`}>
                                    {badge.label}
                                  </Badge>
                                </div>

                                <div className="space-y-2 mb-4">
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[#0A1E40] font-semibold">{exp.date}</span>
                                      <span className="text-gray-400">•</span>
                                      <span className="text-[#0A1E40] font-semibold">{exp.time}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                      {exp.quota}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{exp.location}</span>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    {exp.tags.map((tag, idx) => (
                                      <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleRequestExperience(exp)}
                                    className="px-6 py-2 rounded-lg text-sm font-semibold bg-[#0A1E40] text-white hover:bg-[#0f2952] transition-colors duration-200"
                                    aria-label={`Solicitar ${exp.title}`}
                                  >
                                    Solicitar Plaza
                                  </button>
                                  <button
                                    onClick={() => handleViewExperienceDetails(exp)}
                                    className="px-6 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-[#0A1E40] hover:bg-gray-50 transition-colors duration-200"
                                    aria-label={`Ver detalles ${exp.title}`}
                                  >
                                    Ver Detalles
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border shadow-lg">
                <div className="mb-6">
                  <h3 className="text-[#0A1E40] text-xl font-bold mb-2">Proponer Experiencia</h3>
                  <p className="text-sm text-gray-600">
                    Comparte tu propuesta con el equipo de concierge para evaluación.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    Las propuestas serán evaluadas considerando viabilidad, interés comunitario y recursos disponibles.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <Input 
                    placeholder="Título de la experiencia" 
                    className="border border-gray-300 focus:border-[#0A1E40] focus:ring-1 focus:ring-[#0A1E40] rounded-lg"
                  />
                  <Textarea 
                    placeholder="Descripción detallada: objetivos, actividades previstas, público objetivo y recursos necesarios" 
                    rows={4}
                    className="border border-gray-300 focus:border-[#0A1E40] focus:ring-1 focus:ring-[#0A1E40] rounded-lg resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      type="date" 
                      className="border border-gray-300 focus:border-[#0A1E40] focus:ring-1 focus:ring-[#0A1E40] rounded-lg"
                    />
                    <Input 
                      type="text" 
                      placeholder="Aforo estimado" 
                      className="border border-gray-300 focus:border-[#0A1E40] focus:ring-1 focus:ring-[#0A1E40] rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full bg-[#C9A961] hover:bg-[#b39350] text-white font-semibold py-2.5 rounded-lg transition-colors duration-200">
                    Enviar Propuesta
                  </Button>

                  <Button variant="outline" className="w-full border border-gray-300 text-[#0A1E40] hover:bg-gray-50 font-semibold py-2.5 rounded-lg transition-colors duration-200">
                    Ver Historial
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Calificar trabajo completado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  {selectedReport ? `${selectedReport.title} • ${selectedReport.date}` : 'Selecciona una solicitud completada para calificar.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#0A1E40]">Calificación</p>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    const isSelected = ratingForm.score >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRatingForm((prev) => ({ ...prev, score: value }))}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? 'border-[#0A1E40] bg-[#0A1E40] text-white'
                            : 'border-[#0A1E40]/30 bg-white text-[#0A1E40] hover:bg-[#0A1E40]/10'
                        }`}
                      >
                        <Star className={`h-5 w-5 ${isSelected ? 'fill-current text-white' : 'text-[#0A1E40]'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0A1E40]" htmlFor="maintenance-feedback">Comentarios</label>
                <Textarea
                  id="maintenance-feedback"
                  rows={4}
                  placeholder="Comparte tu experiencia con el servicio realizado."
                  value={ratingForm.feedback}
                  onChange={(event) => setRatingForm((prev) => ({ ...prev, feedback: event.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRatingDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmitRating} className="bg-[#0A1E40] text-white hover:bg-[#0f2952]">
                  Enviar calificación
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={experienceDetailsOpen} onOpenChange={setExperienceDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#0A1E40]">
                {selectedExperience?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedExperience && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                    Imagen
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const badge = getExperienceBadge(selectedExperience.status);
                        return (
                          <Badge className={badge.className}>
                            {badge.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedExperience.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-[#0A1E40] mb-1">Fecha y Hora</h4>
                      <p className="text-sm text-gray-600">{selectedExperience.date}</p>
                      <p className="text-sm text-gray-600">{selectedExperience.time}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#0A1E40] mb-1">Ubicación</h4>
                      <p className="text-sm text-gray-600">{selectedExperience.location}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-[#0A1E40] mb-1">Disponibilidad</h4>
                      <p className="text-sm text-gray-600">{selectedExperience.quota}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#0A1E40] mb-1">Características</h4>
                      <div className="flex gap-2 flex-wrap">
                        {selectedExperience.tags.map((tag, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-[#0A1E40] mb-2">Información Adicional</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>• Esta experiencia es exclusiva para residentes del edificio</p>
                    <p>• Se requiere confirmación previa para participar</p>
                    <p>• En caso de cancelación, notificar con 24 horas de anticipación</p>
                    {selectedExperience.status === 'pending' && (
                      <p className="text-yellow-600">• Esta experiencia está en proceso de evaluación</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setExperienceDetailsOpen(false)}
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Cerrar
                  </Button>
                  <Button 
                    onClick={() => {
                      handleRequestExperience(selectedExperience);
                      setExperienceDetailsOpen(false);
                    }}
                    className="bg-[#0A1E40] text-white hover:bg-[#0f2952]"
                    disabled={selectedExperience.status !== 'approved'}
                  >
                    {selectedExperience.status === 'approved' ? 'Solicitar Plaza' : 'No Disponible'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Planilla Detallada */}
        <Dialog open={billDetailsOpen} onOpenChange={setBillDetailsOpen}>
          <DialogContent className="max-w-4xl h-[70vh] flex flex-col my-4">
            <DialogHeader className="flex-shrink-0 pb-1">
              <DialogTitle className="text-base font-bold text-[#0A1E40] flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Planilla - {monthlyBillDetail.month}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {/* Header compacto */}
              <div className="bg-gradient-to-r from-[#0A1E40] to-[#0f2952] text-white p-2 rounded">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="font-semibold">Apto {monthlyBillDetail.apartment}</p>
                    <p>{user.name}</p>
                  </div>
                  <div>
                    <p className="font-semibold">{monthlyBillDetail.month}</p>
                    <p>{monthlyBillDetail.issueDate}</p>
                  </div>
                  <div>
                    <p className="text-yellow-300 font-bold">{monthlyBillDetail.dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Saldo anterior compacto */}
              {monthlyBillDetail.previousBalance !== 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-red-800">Saldo anterior:</span>
                    <span className="text-red-600 font-bold">
                      ${Math.abs(monthlyBillDetail.previousBalance).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Categorías compactas */}
              <div className="space-y-1.5">
                {monthlyBillDetail.items.map((category, idx) => {
                  const categoryTotal = category.items.reduce((sum, item) => sum + item.amount, 0);
                  
                  return (
                    <div key={idx} className="border border-gray-200 rounded overflow-hidden">
                      <div className="bg-gray-50 p-1.5 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-[#0A1E40] text-xs">{category.category}</h3>
                          <span className="font-bold text-[#0A1E40] text-xs">
                            ${categoryTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {category.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="p-1 px-1.5 flex justify-between items-center hover:bg-gray-50 text-xs">
                            <span className="text-gray-700">{item.description}</span>
                            <span className="font-semibold text-[#0A1E40]">
                              ${item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen compacto */}
              <div className="bg-[#0A1E40] text-white p-2 rounded">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(monthlyBillDetail.total + Math.abs(monthlyBillDetail.previousBalance)).toFixed(2)}</span>
                  </div>
                  
                  {monthlyBillDetail.previousBalance !== 0 && (
                    <div className="flex justify-between text-red-300">
                      <span>Saldo anterior:</span>
                      <span>${Math.abs(monthlyBillDetail.previousBalance).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-white/20 pt-1">
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL:</span>
                      <span className="text-yellow-300">${monthlyBillDetail.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info compacta */}
              <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                <p className="text-xs text-blue-700">
                  <strong>Vence:</strong> {monthlyBillDetail.dueDate} • <strong>Consultas:</strong> administracion@aquarela.com
                </p>
              </div>
            </div>

            {/* Botones compactos fijos */}
            <div className="flex-shrink-0 flex gap-2 pt-1.5 border-t border-gray-200">
              <Button 
                className="flex-1 bg-[#C9A961] hover:bg-[#b39350] text-white text-xs py-1"
                onClick={() => {
                  setBillDetailsOpen(false);
                  toast.success('Redirigiendo a pagos...');
                }}
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Pagar
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-[#0A1E40] text-[#0A1E40] hover:bg-[#0A1E40]/5 text-xs py-1"
                onClick={() => {
                  toast.success('Descargando PDF...');
                }}
              >
                <FileText className="w-3 h-3 mr-1" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setBillDetailsOpen(false)}
                className="border-gray-300 text-gray-600 hover:bg-gray-50 text-xs py-1 px-2"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
