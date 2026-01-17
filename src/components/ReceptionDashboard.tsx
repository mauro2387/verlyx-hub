import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Users, 
  UserPlus, 
  Building, 
  CreditCard, 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Phone,
  Calendar,
  Car,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

interface ReceptionDashboardProps {
  user: { role: 'reception'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function ReceptionDashboard({ user, onLogout }: ReceptionDashboardProps) {
  // Visitor Management State
  const [visitors, setVisitors] = useState([
    {
      id: 1,
      name: 'Juan Pérez',
      document: '12.345.678',
      apartment: '1205',
      purpose: 'Visita personal',
      entryTime: '14:30',
      exitTime: null,
      status: 'inside',
      phone: '+598 99 123 456'
    },
    {
      id: 2,
      name: 'María González',
      document: '98.765.432',
      apartment: '0803',
      purpose: 'Delivery',
      entryTime: '15:15',
      exitTime: '15:25',
      status: 'exited',
      phone: '+598 99 654 321'
    }
  ]);

  // Building Occupancy State
  const [occupancy, setOccupancy] = useState({
    totalApartments: 24,
    occupiedApartments: 18,
    visitorsInside: 1,
    maintenanceStaff: 2,
    parkingSpaces: 30,
    occupiedParking: 22
  });

  // Payment Management State
  const [payments, setPayments] = useState([
    {
      id: 1,
      apartment: '1205',
      resident: 'Carlos Silva',
      service: 'Expensas Octubre',
      amount: 15500,
      dueDate: '2025-11-05',
      status: 'pending',
      paymentMethod: null
    },
    {
      id: 2,
      apartment: '0803',
      resident: 'Ana Martínez',
      service: 'Expensas Octubre',
      amount: 15500,
      dueDate: '2025-11-05',
      status: 'paid',
      paymentMethod: 'Tarjeta'
    }
  ]);

  // Maintenance Reports State
  const [maintenanceReports, setMaintenanceReports] = useState([
    {
      id: 1,
      apartment: '1507',
      issue: 'Baja presión de agua',
      priority: 'high',
      status: 'in-progress',
      assignedTo: 'Roberto Méndez',
      reportedAt: '10:30'
    },
    {
      id: 2,
      apartment: '1205',
      issue: 'Aire acondicionado',
      priority: 'medium',
      status: 'pending',
      assignedTo: null,
      reportedAt: '11:45'
    }
  ]);

  // New Visitor Registration
  const [newVisitor, setNewVisitor] = useState({
    name: '',
    document: '',
    apartment: '',
    purpose: '',
    phone: ''
  });

  const handleRegisterVisitor = () => {
    if (!newVisitor.name || !newVisitor.document || !newVisitor.apartment) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    const visitor = {
      id: visitors.length + 1,
      ...newVisitor,
      entryTime: new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }),
      exitTime: null,
      status: 'inside' as const
    };

    setVisitors([visitor, ...visitors]);
    setOccupancy(prev => ({ ...prev, visitorsInside: prev.visitorsInside + 1 }));
    setNewVisitor({ name: '', document: '', apartment: '', purpose: '', phone: '' });
    toast.success('Visitante registrado correctamente');
  };

  const handleVisitorExit = (visitorId: number) => {
    setVisitors(visitors.map(visitor => 
      visitor.id === visitorId 
        ? { 
            ...visitor, 
            exitTime: new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }),
            status: 'exited' as const 
          }
        : visitor
    ));
    setOccupancy(prev => ({ ...prev, visitorsInside: prev.visitorsInside - 1 }));
    toast.success('Salida registrada');
  };

  const handlePaymentReceived = (paymentId: number, method: string) => {
    setPayments(payments.map(payment =>
      payment.id === paymentId
        ? { ...payment, status: 'paid' as const, paymentMethod: method }
        : payment
    ));
    toast.success('Pago registrado correctamente');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeVisitors = visitors.filter(v => v.status === 'inside');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[#0A1E40] mb-2" style={{ fontSize: '2rem', fontWeight: 700 }}>
            Dashboard de Recepción
          </h1>
          <p className="text-gray-600">
            Control de visitantes, ocupación y servicios del edificio
          </p>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {activeVisitors.length}
                </div>
                <p className="text-gray-600 text-sm">Visitantes Dentro</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Building className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {occupancy.occupiedApartments}/{occupancy.totalApartments}
                </div>
                <p className="text-gray-600 text-sm">Ocupación</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {pendingPayments.length}
                </div>
                <p className="text-gray-600 text-sm">Pagos Pendientes</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-[#0A1E40]" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {occupancy.occupiedParking}/{occupancy.parkingSpaces}
                </div>
                <p className="text-gray-600 text-sm">Estacionamiento</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visitor Management */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#0A1E40]" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Registro de Visitantes
                </h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0A1E40] hover:bg-[#0f2952] text-white">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Nuevo Visitante
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Nuevo Visitante</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="block mb-2 text-[#0A1E40]">Nombre *</label>
                        <Input
                          value={newVisitor.name}
                          onChange={(e) => setNewVisitor({...newVisitor, name: e.target.value})}
                          placeholder="Nombre completo del visitante"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-[#0A1E40]">Documento *</label>
                        <Input
                          value={newVisitor.document}
                          onChange={(e) => setNewVisitor({...newVisitor, document: e.target.value})}
                          placeholder="Número de cédula"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-[#0A1E40]">Apartamento *</label>
                        <Select onValueChange={(value: string) => setNewVisitor({...newVisitor, apartment: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar apartamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0601">Apt 0601</SelectItem>
                            <SelectItem value="0803">Apt 0803</SelectItem>
                            <SelectItem value="1205">Apt 1205</SelectItem>
                            <SelectItem value="1507">Apt 1507</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block mb-2 text-[#0A1E40]">Motivo de la visita</label>
                        <Input
                          value={newVisitor.purpose}
                          onChange={(e) => setNewVisitor({...newVisitor, purpose: e.target.value})}
                          placeholder="Visita personal, delivery, mantenimiento..."
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-[#0A1E40]">Teléfono</label>
                        <Input
                          value={newVisitor.phone}
                          onChange={(e) => setNewVisitor({...newVisitor, phone: e.target.value})}
                          placeholder="+598 99 123 456"
                        />
                      </div>
                      <Button 
                        onClick={handleRegisterVisitor}
                        className="w-full bg-[#C9A961] hover:bg-[#b8956b] text-white"
                      >
                        Registrar Ingreso
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Active Visitors */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Visitantes Activos</h3>
                {activeVisitors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No hay visitantes en el edificio</p>
                  </div>
                ) : (
                  activeVisitors.map((visitor) => (
                    <Card key={visitor.id} className="p-4 bg-green-50 border-green-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-[#0A1E40]">{visitor.name}</span>
                            <Badge variant="outline" className="bg-green-100 text-green-700">
                              Dentro
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Apt {visitor.apartment} • {visitor.purpose}</p>
                            <p>Ingreso: {visitor.entryTime}</p>
                            {visitor.phone && <p>📞 {visitor.phone}</p>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVisitorExit(visitor.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          Registrar Salida
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>

            {/* Maintenance Status */}
            <Card className="p-6">
              <h2 className="text-[#0A1E40] mb-4" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Estado del Mantenimiento
              </h2>
              <div className="space-y-3">
                {maintenanceReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Apt {report.apartment}</span>
                          <Badge className={getPriorityColor(report.priority)}>
                            {report.priority === 'high' ? 'Alta' : report.priority === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{report.issue}</p>
                        {report.assignedTo && (
                          <p className="text-xs text-gray-500">Asignado a: {report.assignedTo}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === 'in-progress' ? (
                        <Clock className="w-4 h-4 text-blue-500" />
                      ) : report.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-xs text-gray-500">{report.reportedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Payment Management */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-[#0A1E40] mb-4" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Control de Pagos
              </h2>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <Card key={payment.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#0A1E40]">
                            Apt {payment.apartment}
                          </span>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{payment.resident}</p>
                        <p className="text-sm text-gray-600">{payment.service}</p>
                        <p className="text-sm font-medium text-[#0A1E40]">
                          ${payment.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Vence: {new Date(payment.dueDate).toLocaleDateString('es-UY')}
                        </p>
                        {payment.paymentMethod && (
                          <p className="text-xs text-green-600">
                            Pagado por: {payment.paymentMethod}
                          </p>
                        )}
                      </div>
                      {payment.status === 'pending' && (
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            onClick={() => handlePaymentReceived(payment.id, 'Efectivo')}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            Efectivo
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePaymentReceived(payment.id, 'Tarjeta')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          >
                            Tarjeta
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePaymentReceived(payment.id, 'Transferencia')}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                          >
                            Transfer.
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Building Status Summary */}
            <Card className="p-6">
              <h2 className="text-[#0A1E40] mb-4" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Resumen del Edificio
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Building className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-[#0A1E40]">
                    {Math.round((occupancy.occupiedApartments / occupancy.totalApartments) * 100)}%
                  </div>
                  <p className="text-sm text-gray-600">Ocupación</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <Car className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-[#0A1E40]">
                    {Math.round((occupancy.occupiedParking / occupancy.parkingSpaces) * 100)}%
                  </div>
                  <p className="text-sm text-gray-600">Parking</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Wrench className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-[#0A1E40]">
                    {occupancy.maintenanceStaff}
                  </div>
                  <p className="text-sm text-gray-600">Personal</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <Bell className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-[#0A1E40]">
                    {maintenanceReports.filter(r => r.status === 'pending').length}
                  </div>
                  <p className="text-sm text-gray-600">Pendientes</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}