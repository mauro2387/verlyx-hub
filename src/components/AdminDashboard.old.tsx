import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Wrench, Calendar, TrendingUp, Download, FileText, MessageSquare, AlertCircle, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import AdminReservationSystem from './admin/AdminReservationSystem';
import AdminStaffManagement from './admin/AdminStaffManagement';

interface AdminDashboardProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Sample data for charts
  const claimsData = [
    { category: 'Electricidad', count: 12 },
    { category: 'Plomería', count: 18 },
    { category: 'Limpieza', count: 8 },
    { category: 'Aire Acond.', count: 15 },
    { category: 'Carpintería', count: 6 },
    { category: 'Seguridad', count: 4 }
  ];

  const reservationsData = [
    { month: 'Mayo', reservations: 45 },
    { month: 'Junio', reservations: 52 },
    { month: 'Julio', reservations: 48 },
    { month: 'Agosto', reservations: 61 },
    { month: 'Sept.', reservations: 55 },
    { month: 'Oct.', reservations: 58 }
  ];

  const residents = [
    { id: 1, name: 'María Rodríguez', apartment: '1205', status: 'active', balance: -450 },
    { id: 2, name: 'Carlos Silva', apartment: '0803', status: 'active', balance: 0 },
    { id: 3, name: 'Ana Martínez', apartment: '1507', status: 'active', balance: -1200 },
    { id: 4, name: 'Diego Fernández', apartment: '0601', status: 'inactive', balance: -2500 },
    { id: 5, name: 'Laura Santos', apartment: '1108', status: 'active', balance: 0 }
  ];

  const staffMembers = [
    { id: 1, name: 'Juan Perez', role: 'Mantenimiento', status: 'available', tasksToday: 3 },
    { id: 2, name: 'Sofia Lopez', role: 'Limpieza', status: 'busy', tasksToday: 5 },
    { id: 3, name: 'Miguel Torres', role: 'Seguridad', status: 'available', tasksToday: 1 },
    { id: 4, name: 'Carmen Ruiz', role: 'Recepción', status: 'available', tasksToday: 0 }
  ];

  const activeClaims = [
    { id: 1, apartment: '1205', issue: 'Aire no enfría', category: 'Aire Acond.', urgency: 'medium', assignedTo: 'Juan Perez' },
    { id: 2, apartment: '0803', issue: 'Ruido en ascensor', category: 'Mantenimiento', urgency: 'low', assignedTo: 'Sin Asignar' },
    { id: 3, apartment: '1507', issue: 'Baja presión de agua', category: 'Plomería', urgency: 'high', assignedTo: 'Juan Perez' }
  ];

  const handleExportReport = (type: string) => {
    toast.success(`¡Informe ${type} generado exitosamente!`);
  };

  const handleImportStatements = () => {
    toast.success('Estados de cuenta importados del sistema contable');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'available': return 'Disponible';
      case 'busy': return 'Ocupado';
      default: return status;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
     <DashboardLayout user={user} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
       <div className="flex-1">
          <h1 className="text-[#0A1E40] mb-2 text-3xl md:text-4xl font-bold tracking-tight">
            Panel de Administración
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">Gestión integral del edificio</p>
            <Badge variant="outline" className="hidden sm:flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              Sistema Activo
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-center">
            <Button onClick={handleImportStatements} variant="outline" className="border-[#0A1E40] text-[#0A1E40]">
              <Download className="w-4 h-4 mr-2" />
              Importar Estados
            </Button>
            <Button onClick={() => handleExportReport('Daily Summary')} className="bg-[#0A1E40] hover:bg-[#0f2952] text-white">
              <FileText className="w-4 h-4 mr-2" />
              Resumen Diario
            </Button>
       </div>
          </div>

        {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-red-50 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-8 h-8 text-[#C9A961]" />
                </div>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 animate-pulse">Pendiente</Badge>
              </div>
              <div className="text-[#0A1E40] text-3xl font-bold mb-2">$45,231</div>
              <p className="text-gray-600 font-medium">Pagos Pendientes</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-red-600 text-sm">↑ 8%</span>
                <span className="text-gray-400 text-sm">vs mes anterior</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-50 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Total</Badge>
              </div>
              <div className="text-[#0A1E40] text-3xl font-bold mb-2">142</div>
              <p className="text-gray-600 font-medium">Total Residentes</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                </div>
                <span className="text-blue-600 text-sm whitespace-nowrap">95% ocupación</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-yellow-50 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <Wrench className="w-8 h-8 text-yellow-500" />
                </div>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Activos</Badge>
              </div>
              <div className="text-[#0A1E40] text-3xl font-bold mb-2">23</div>
              <p className="text-gray-600 font-medium">Reclamos Pendientes</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-green-600 text-sm">↑ 12%</span>
                <span className="text-gray-400 text-sm">vs mes anterior</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-8 h-8 text-purple-500" />
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Nuevos</Badge>
              </div>
              <div className="text-[#0A1E40] text-3xl font-bold mb-2">12</div>
              <p className="text-gray-600 font-medium">Mensajes sin Leer</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-gray-400 text-sm">De residentes</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h3 className="text-[#0A1E40] font-semibold text-lg">Reclamos por Categoría</h3>
                <p className="text-gray-500 text-sm">Distribución de solicitudes de mantenimiento</p>
              </div>
              <div className="mt-2 sm:mt-0">
                <select 
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0A1E40]/20"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="week">Esta Semana</option>
                  <option value="month">Este Mes</option>
                  <option value="quarter">Este Trimestre</option>
                </select>
              </div>
            </div>
            <div className="relative group">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={claimsData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickLine={{ stroke: '#666' }}
                  />
                  <YAxis 
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickLine={{ stroke: '#666' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      padding: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#0A1E40"
                    radius={[4, 4, 0, 0]}
                    className="transition-opacity duration-200"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h3 className="text-[#0A1E40] font-semibold text-lg">Tendencia de Reservas Mensuales</h3>
                <p className="text-gray-500 text-sm">Actividad de reservas en áreas comunes</p>
              </div>
              <div className="mt-2 sm:mt-0">
                <Button variant="outline" size="sm" className="border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
            <div className="relative group">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reservationsData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickLine={{ stroke: '#666' }}
                  />
                  <YAxis 
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickLine={{ stroke: '#666' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      padding: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="reservations" 
                    stroke="#C9A961" 
                    strokeWidth={2}
                    dot={{ fill: '#C9A961', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#C9A961', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

          {/* Tabs for detailed views */}
        <Tabs defaultValue="residents" className="space-y-6">
          <TabsList className="w-full max-w-3xl overflow-x-auto flex space-x-2 p-1 bg-gray-100/80 rounded-lg">
            <TabsTrigger value="residents" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Residentes</span>
            </TabsTrigger>
            <TabsTrigger value="claims" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Reclamos</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Informes</span>
            </TabsTrigger>
          </TabsList>          {/* Residents Tab */}
          <TabsContent value="residents">
            <Card className="p-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-[#0A1E40] font-semibold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Directorio de Residentes
                  </h3>
                  <p className="text-gray-600 text-sm">Gestionar ocupantes de apartamentos</p>
                </div>
                <div className="flex items-center gap-3 self-stretch sm:self-auto">
                  <div className="relative">
                    <input
                      type="search"
                      placeholder="Buscar residentes..."
                      className="px-4 py-2 w-full sm:w-[200px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1E40]/20"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="border-[#0A1E40] text-[#0A1E40] whitespace-nowrap">
                    Exportar
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="font-semibold">Nombre</TableHead>
                      <TableHead className="font-semibold">Apartamento</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Balance</TableHead>
                      <TableHead className="font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {residents.map((resident) => (
                      <TableRow 
                        key={resident.id}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <TableCell>
                          <div className="font-medium flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#0A1E40] font-semibold">
                              {resident.name.charAt(0)}
                            </div>
                            {resident.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            APT {resident.apartment}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(resident.status)}>
                            {getStatusText(resident.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${resident.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {resident.balance === 0 ? (
                              <span className="text-gray-400">--</span>
                            ) : (
                              <>
                                {resident.balance < 0 ? '-' : ''}${Math.abs(resident.balance)}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[#0A1E40] hover:text-[#0A1E40] hover:bg-[#0A1E40]/5"
                            >
                              Ver Detalles
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                <div>Mostrando {residents.length} residentes</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>Anterior</Button>
                  <Button variant="outline" size="sm">Siguiente</Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <AdminReservationSystem />
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card className="p-6 bg-red-50 border-red-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-red-800 font-medium">Alta Prioridad</p>
                </div>
                <div className="text-2xl font-bold text-red-900 mb-1">
                  {activeClaims.filter(c => c.urgency === 'high').length}
                </div>
                <p className="text-red-600 text-sm">Atención urgente requerida</p>
              </Card>

              <Card className="p-6 bg-yellow-50 border-yellow-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-yellow-800 font-medium">Prioridad Media</p>
                </div>
                <div className="text-2xl font-bold text-yellow-900 mb-1">
                  {activeClaims.filter(c => c.urgency === 'medium').length}
                </div>
                <p className="text-yellow-600 text-sm">En progreso</p>
              </Card>

              <Card className="p-6 bg-blue-50 border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-blue-800 font-medium">Baja Prioridad</p>
                </div>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {activeClaims.filter(c => c.urgency === 'low').length}
                </div>
                <p className="text-blue-600 text-sm">Programado</p>
              </Card>
            </div>

            <Card className="p-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-[#0A1E40] font-semibold text-lg flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Reclamos de Mantenimiento Activos
                  </h3>
                  <p className="text-gray-600 text-sm">Seguimiento y gestión de solicitudes de mantenimiento</p>
                </div>
                <div className="flex items-center gap-3 self-stretch sm:self-auto">
                  <select 
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0A1E40]/20"
                    defaultValue="all"
                  >
                    <option value="all">Todas las Categorías</option>
                    <option value="hvac">Aire Acondicionado</option>
                    <option value="plumbing">Plomería</option>
                    <option value="electrical">Electricidad</option>
                  </select>
                  <Button className="bg-[#0A1E40] text-white">
                    Nuevo Reclamo
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="font-semibold">Apartamento</TableHead>
                      <TableHead className="font-semibold">Problema</TableHead>
                      <TableHead className="font-semibold">Categoría</TableHead>
                      <TableHead className="font-semibold">Urgencia</TableHead>
                      <TableHead className="font-semibold">Asignado a</TableHead>
                      <TableHead className="font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeClaims.map((claim) => (
                      <TableRow 
                        key={claim.id}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            APT {claim.apartment}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[250px]">
                            <p className="font-medium text-[#0A1E40]">{claim.issue}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {claim.category === 'HVAC' && <span className="material-icons text-blue-500">ac_unit</span>}
                            {claim.category === 'Plumbing' && <span className="material-icons text-blue-500">water_drop</span>}
                            {claim.category === 'Maintenance' && <Wrench className="w-4 h-4 text-yellow-500" />}
                            {claim.category}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getUrgencyColor(claim.urgency)} flex items-center gap-1 w-fit`}>
                            {claim.urgency === 'high' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>}
                            {claim.urgency === 'high' ? 'Alta' : claim.urgency === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {claim.assignedTo === 'Sin Asignar' ? (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                              Sin Asignar
                            </Badge>
                          ) : (
                            <div className="font-medium flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[#0A1E40] text-xs font-semibold">
                                {claim.assignedTo.charAt(0)}
                              </div>
                              {claim.assignedTo}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {claim.assignedTo === 'Sin Asignar' ? (
                              <Button 
                                variant="outline"
                                size="sm" 
                                className="text-[#0A1E40] border-[#0A1E40]"
                              >
                                Asignar
                              </Button>
                            ) : (
                              <Button 
                                variant="outline"
                                size="sm" 
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                Marcar Completo
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#0A1E40] hover:text-[#0A1E40] hover:bg-[#0A1E40]/5"
                            >
                              Ver Detalles
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                <div>Mostrando {activeClaims.length} reclamos</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>Anterior</Button>
                  <Button variant="outline" size="sm">Siguiente</Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            <AdminStaffManagement />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Financial')}>
                <FileText className="w-10 h-10 text-[#C9A961] mb-4" />
                <h3 className="text-[#0A1E40] mb-2">Informe Financiero</h3>
                <p className="text-gray-600 text-sm mb-4">Ingresos mensuales, gastos y saldos pendientes</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Maintenance')}>
                <Wrench className="w-10 h-10 text-blue-500 mb-4" />
                <h3 className="text-[#0A1E40] mb-2">Informe de Mantenimiento</h3>
                <p className="text-gray-600 text-sm mb-4">Análisis de reclamos, tiempos de resolución y rendimiento del personal</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Occupancy')}>
                <Users className="w-10 h-10 text-green-500 mb-4" />
                <h3 className="text-[#0A1E40] mb-2">Informe de Ocupación</h3>
                <p className="text-gray-600 text-sm mb-4">Estadísticas de residentes, tasa de rotación y demografía</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Reservations')}>
                <Calendar className="w-10 h-10 text-purple-500 mb-4" />
                <h3 className="text-[#0A1E40] mb-2">Informe de Reservas</h3>
                <p className="text-gray-600 text-sm mb-4">Patrones de uso de amenidades y horarios pico</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('AI Analytics')}>
                <TrendingUp className="w-10 h-10 text-[#C9A961] mb-4" />
                <h3 className="text-[#0A1E40] mb-2">Informe de Análisis IA</h3>
                <p className="text-gray-600 text-sm mb-4">Información predictiva y análisis de tendencias</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Custom')}>
                <FileText className="w-10 h-10 text-gray-500 mb-4" />
                <h3 className="text-[#0A1E40] mb-2">Informe Personalizado</h3>
                <p className="text-gray-600 text-sm mb-4">Crea tu propio informe con métricas específicas</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  Crear Personalizado
                </Button>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  </DashboardLayout>
);
}
