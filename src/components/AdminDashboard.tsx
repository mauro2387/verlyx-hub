import { useState, useMemo } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from './ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Wrench, Calendar, TrendingUp, Download, FileText, MessageSquare, AlertCircle, DollarSign, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminReservationSystem from './admin/AdminReservationSystem';
import AdminStaffManagement from './admin/AdminStaffManagement';

// Hooks de servicios reales
import { useAdminDashboard } from '../hooks/useServices';
import { useAuth } from '../contexts/AuthContext';
import type { MaintenanceRequest, MaintenancePriority } from '../services/maintenance/MaintenanceService';

interface AdminDashboardProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Hook combinado que trae datos del admin
  const {
    buildingStats,
    financialStats,
    maintenanceStats,
    pendingMaintenance,
    users,
    pendingUsers,
    announcements,
    isLoading,
    refetchAll,
  } = useAdminDashboard();

  const { user: authUser } = useAuth();

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

  // Datos de gráficos basados en mantenimiento real
  const claimsData = useMemo(() => {
    if (!maintenanceStats) return [];
    const categoryMap: Record<string, string> = {
      'plumbing': 'Plomería',
      'electrical': 'Electricidad',
      'hvac': 'Climatización',
      'general': 'General',
      'cleaning': 'Limpieza',
      'security': 'Seguridad',
      'elevator': 'Ascensores',
      'pool': 'Piscina',
      'garden': 'Jardín',
      'painting': 'Pintura',
      'structural': 'Estructura',
    };
    return Object.entries(maintenanceStats.byCategory || {}).map(([cat, count]) => ({
      category: categoryMap[cat] || cat,
      count,
    }));
  }, [maintenanceStats]);

  // Datos de tendencia de reservas (simulado por ahora - se puede conectar a ReservationService)
  const reservationsData = [
    { month: 'Mayo', reservations: 45 },
    { month: 'Junio', reservations: 52 },
    { month: 'Julio', reservations: 48 },
    { month: 'Agosto', reservations: 61 },
    { month: 'Sept.', reservations: 55 },
    { month: 'Oct.', reservations: 58 },
  ];

  // Residentes con datos reales
  const residents = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    return users
      .filter((u) => u.role === 'owner' || u.role === 'tenant')
      .map((u) => ({
        id: u.id,
        name: `${u.profile.firstName} ${u.profile.lastName}`,
        apartment: u.unitAssociations[0]?.unitId || 'N/A',
        status: u.status === 'active' ? 'active' : 'inactive',
        balance: 0, // Se puede conectar a FinancialService
      }));
  }, [users]);

  // Staff con datos reales
  const staffMembers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    return users
      .filter((u) => u.role === 'admin' || u.permissions?.canManageBuildings || u.permissions?.canManageUsers)
      .map((u) => ({
        id: u.id,
        name: `${u.profile.firstName} ${u.profile.lastName}`,
        role: u.role === 'admin' ? 'Administración' : 'Personal',
        status: u.status === 'active' ? 'available' : 'inactive',
        tasksToday: 0,
      }));
  }, [users]);

  // Reclamos activos con datos reales
  const activeClaims = useMemo(() => {
    if (!pendingMaintenance || !Array.isArray(pendingMaintenance)) return [];
    return pendingMaintenance.map((m: MaintenanceRequest) => ({
      id: m.id,
      apartment: m.unitId || 'Área común',
      issue: m.title,
      category: m.category,
      urgency: m.priority,
      assignedTo: m.assignedProvider?.name || m.assignedStaff?.name || 'Sin Asignar',
      status: m.status,
      ticketNumber: m.id.substring(0, 8).toUpperCase(),
    }));
  }, [pendingMaintenance]);

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
      case 'high': case 'urgent': case 'emergency': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      'plumbing': 'Plomería',
      'electrical': 'Electricidad',
      'hvac': 'Climatización',
      'general': 'General',
      'cleaning': 'Limpieza',
      'security': 'Seguridad',
      'elevator': 'Ascensores',
    };
    return labels[cat] || cat;
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#0A1E40] mx-auto mb-4" />
            <p className="text-gray-600">Cargando panel de administración...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calcular KPIs
  const totalPendingPayments = financialStats?.totalPending || 0;
  const totalResidents = buildingStats?.totalUnits || users.filter((u) => u.role === 'owner' || u.role === 'tenant').length;
  const occupancyRate = buildingStats && buildingStats.totalUnits > 0 
    ? Math.round(((buildingStats.totalUnits - (buildingStats.inactive || 0)) / buildingStats.totalUnits) * 100) 
    : 95;
  const pendingClaimsCount = maintenanceStats?.byStatus?.pending || activeClaims.length;
  const unreadMessages = pendingUsers.length;

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
                <Badge variant="outline" className={`${totalPendingPayments > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                  {totalPendingPayments > 0 ? 'Pendiente' : 'Al día'}
                </Badge>
              </div>
              <div className="text-[#0A1E40] text-3xl font-bold mb-2">{formatCurrency(totalPendingPayments)}</div>
              <p className="text-gray-600 font-medium">Pagos Pendientes</p>
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
              <div className="text-[#0A1E40] text-3xl font-bold mb-2">{totalResidents}</div>
              <p className="text-gray-600 font-medium">Total Unidades</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-full bg-gray-100 h-2 rounded-full">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
                </div>
                <span className="text-blue-600 text-sm whitespace-nowrap">{occupancyRate}% ocupación</span>
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
              <div className="text-[#0A1E40] text-3xl font-bold mb-2">{pendingClaimsCount}</div>
              <p className="text-gray-600 font-medium">Reclamos Pendientes</p>
              {maintenanceStats && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-green-600 text-sm">{maintenanceStats.byStatus?.completed || 0} completados</span>
                </div>
              )}
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
              <div className="text-[#0A1E40] text-3xl font-bold mb-2">{unreadMessages}</div>
              <p className="text-gray-600 font-medium">Usuarios Pendientes</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400 text-sm">Solicitudes de registro</span>
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
              {claimsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={claimsData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis dataKey="category" tick={{ fill: '#666', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                    />
                    <Bar dataKey="count" fill="#0A1E40" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin datos de reclamos</p>
                  </div>
                </div>
              )}
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
                  <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#666', fontSize: 12 }} />
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
          </TabsList>

          {/* Residents Tab */}
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
                      <TableHead className="font-semibold">Unidad</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Balance</TableHead>
                      <TableHead className="font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {residents.length > 0 ? (
                      residents.map((resident: { id: string; name: string; apartment: string; status: string; balance: number }) => (
                        <TableRow key={resident.id} className="hover:bg-gray-50/50 transition-colors group">
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
                              {resident.apartment}
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
                                formatCurrency(resident.balance)
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-[#0A1E40] hover:text-[#0A1E40] hover:bg-[#0A1E40]/5">
                              Ver Detalles
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No hay residentes registrados
                        </TableCell>
                      </TableRow>
                    )}
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
                  {activeClaims.filter(c => c.urgency === 'high' || c.urgency === 'urgent').length}
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
                  {activeClaims.filter((c: { urgency: MaintenancePriority }) => c.urgency === 'normal').length}
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
                <Button className="bg-[#0A1E40] text-white">Nuevo Reclamo</Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="font-semibold">Ticket</TableHead>
                      <TableHead className="font-semibold">Problema</TableHead>
                      <TableHead className="font-semibold">Categoría</TableHead>
                      <TableHead className="font-semibold">Urgencia</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeClaims.length > 0 ? (
                      activeClaims.map((claim) => (
                        <TableRow key={claim.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {claim.ticketNumber}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-[#0A1E40] max-w-[200px] truncate">{claim.issue}</p>
                          </TableCell>
                          <TableCell>
                            <span>{getCategoryLabel(claim.category)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getUrgencyColor(claim.urgency)} flex items-center gap-1 w-fit`}>
                              {(claim.urgency === 'high' || claim.urgency === 'urgent' || claim.urgency === 'emergency') && (
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                              )}
                              {claim.urgency === 'high' || claim.urgency === 'urgent' || claim.urgency === 'emergency' ? 'Alta' : claim.urgency === 'normal' ? 'Media' : 'Baja'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(claim.status)}>
                              {claim.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="text-[#0A1E40] border-[#0A1E40]">
                                Gestionar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          <Wrench className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          No hay reclamos pendientes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                <div>Mostrando {activeClaims.length} reclamos</div>
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
                <h3 className="text-[#0A1E40] mb-2 font-semibold">Informe Financiero</h3>
                <p className="text-gray-600 text-sm mb-4">Ingresos mensuales, gastos y saldos pendientes</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Maintenance')}>
                <Wrench className="w-10 h-10 text-blue-500 mb-4" />
                <h3 className="text-[#0A1E40] mb-2 font-semibold">Informe de Mantenimiento</h3>
                <p className="text-gray-600 text-sm mb-4">Análisis de reclamos, tiempos de resolución y rendimiento del personal</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Occupancy')}>
                <Users className="w-10 h-10 text-green-500 mb-4" />
                <h3 className="text-[#0A1E40] mb-2 font-semibold">Informe de Ocupación</h3>
                <p className="text-gray-600 text-sm mb-4">Estadísticas de residentes, tasa de rotación y demografía</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Reservations')}>
                <Calendar className="w-10 h-10 text-purple-500 mb-4" />
                <h3 className="text-[#0A1E40] mb-2 font-semibold">Informe de Reservas</h3>
                <p className="text-gray-600 text-sm mb-4">Patrones de uso de amenidades y horarios pico</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('AI Analytics')}>
                <TrendingUp className="w-10 h-10 text-[#C9A961] mb-4" />
                <h3 className="text-[#0A1E40] mb-2 font-semibold">Informe de Análisis IA</h3>
                <p className="text-gray-600 text-sm mb-4">Información predictiva y análisis de tendencias</p>
                <Button variant="outline" className="w-full border-[#0A1E40] text-[#0A1E40]">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportReport('Custom')}>
                <FileText className="w-10 h-10 text-gray-500 mb-4" />
                <h3 className="text-[#0A1E40] mb-2 font-semibold">Informe Personalizado</h3>
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
