/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - ACCESS AUTHORIZATION MANAGEMENT COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Panel completo de gestión de autorizaciones de acceso.
 * Incluye: CRUD, cambios de estado, filtros, exportación, auditoría.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Plus,
  Download,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  QrCode,
  Car,
  Calendar,
  Phone,
  Mail,
  Building,
  Shield,
  History,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Pause,
  Play,
  Ban,
  FileText,
  UserPlus,
} from 'lucide-react';

import type {
  AccessAuthorization,
  AccessStatus,
  AccessType,
  VisitorRelationship,
  DocumentType,
  DayOfWeek,
} from '../../types/core.types';

import {
  createAccessAuthorization,
  updateAccessAuthorization,
  getAccessAuthorization,
  listAccessAuthorizations,
  approveAccessAuthorization,
  rejectAccessAuthorization,
  revokeAccessAuthorization,
  suspendAccessAuthorization,
  reactivateAccessAuthorization,
  registerAccessUsage,
  getAccessStatistics,
  processExpirations,
  type AccessFilters,
  type CreateAccessInput,
} from '../../services/accessService';

import { getEntityHistory } from '../../services/auditService';
import type { AuditLogEntry } from '../../types/core.types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES Y CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<AccessStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending_approval: { 
    label: 'Pendiente', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock className="w-3 h-3" />
  },
  approved: { 
    label: 'Aprobado', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <CheckCircle className="w-3 h-3" />
  },
  rejected: { 
    label: 'Rechazado', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="w-3 h-3" />
  },
  active: { 
    label: 'Activo', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle className="w-3 h-3" />
  },
  expired: { 
    label: 'Expirado', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <Clock className="w-3 h-3" />
  },
  revoked: { 
    label: 'Revocado', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <Ban className="w-3 h-3" />
  },
  suspended: { 
    label: 'Suspendido', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <Pause className="w-3 h-3" />
  },
};

const TYPE_LABELS: Record<AccessType, string> = {
  single_visit: 'Visita única',
  multiple_visits: 'Visitas múltiples',
  recurring_weekly: 'Recurrente semanal',
  recurring_monthly: 'Recurrente mensual',
  permanent: 'Permanente',
  emergency: 'Emergencia',
};

const RELATIONSHIP_LABELS: Record<VisitorRelationship, string> = {
  family: 'Familiar',
  friend: 'Amigo',
  service_provider: 'Proveedor de servicios',
  delivery: 'Delivery',
  contractor: 'Contratista',
  real_estate_agent: 'Agente inmobiliario',
  medical: 'Personal médico',
  government: 'Funcionario público',
  other: 'Otro',
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface AccessManagementProps {
  buildingId: string;
}

const AccessManagement: React.FC<AccessManagementProps> = ({ buildingId }) => {
  // Estado principal
  const [authorizations, setAuthorizations] = useState<AccessAuthorization[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState<AccessFilters>({
    buildingId,
    status: undefined,
    search: '',
  });
  const [activeTab, setActiveTab] = useState('all');
  
  // Diálogos
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState<{
    type: 'approve' | 'reject' | 'revoke' | 'suspend' | 'reactivate';
    authorization: AccessAuthorization;
  } | null>(null);
  
  // Selección
  const [selectedAuthorization, setSelectedAuthorization] = useState<AccessAuthorization | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);
  
  // Estadísticas
  const [stats, setStats] = useState<ReturnType<typeof getAccessStatistics> | null>(null);

  // Cargar datos
  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = listAccessAuthorizations(
        { ...filters, buildingId },
        currentPage,
        pageSize
      );
      setAuthorizations(result.data);
      setTotalItems(result.pagination.totalItems);
      
      const statsData = getAccessStatistics(buildingId);
      setStats(statsData);
    } catch (error) {
      toast.error('Error al cargar autorizaciones');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [buildingId, currentPage, filters]);

  // Actualizar filtros por tab
  useEffect(() => {
    if (activeTab === 'all') {
      setFilters(f => ({ ...f, status: undefined }));
    } else if (activeTab === 'pending') {
      setFilters(f => ({ ...f, status: 'pending_approval' }));
    } else if (activeTab === 'active') {
      setFilters(f => ({ ...f, status: ['active', 'approved'] }));
    } else if (activeTab === 'inactive') {
      setFilters(f => ({ ...f, status: ['expired', 'revoked', 'suspended', 'rejected'] }));
    }
    setCurrentPage(1);
  }, [activeTab]);

  // Handlers
  const handleSearch = (value: string) => {
    setFilters(f => ({ ...f, search: value }));
    setCurrentPage(1);
  };

  const handleApprove = async () => {
    if (!showActionDialog?.authorization) return;
    
    const result = await approveAccessAuthorization(showActionDialog.authorization.id);
    if (result.success) {
      toast.success('Autorización aprobada');
      loadData();
    } else {
      toast.error(result.error?.message || 'Error al aprobar');
    }
    setShowActionDialog(null);
  };

  const handleReject = async (reason: string) => {
    if (!showActionDialog?.authorization) return;
    
    const result = await rejectAccessAuthorization(showActionDialog.authorization.id, reason);
    if (result.success) {
      toast.success('Autorización rechazada');
      loadData();
    } else {
      toast.error(result.error?.message || 'Error al rechazar');
    }
    setShowActionDialog(null);
  };

  const handleRevoke = async (reason: string) => {
    if (!showActionDialog?.authorization) return;
    
    const result = await revokeAccessAuthorization(showActionDialog.authorization.id, reason);
    if (result.success) {
      toast.success('Autorización revocada');
      loadData();
    } else {
      toast.error(result.error?.message || 'Error al revocar');
    }
    setShowActionDialog(null);
  };

  const handleSuspend = async (reason: string, until?: string) => {
    if (!showActionDialog?.authorization) return;
    
    const result = await suspendAccessAuthorization(
      showActionDialog.authorization.id,
      reason,
      until
    );
    if (result.success) {
      toast.success('Autorización suspendida');
      loadData();
    } else {
      toast.error(result.error?.message || 'Error al suspender');
    }
    setShowActionDialog(null);
  };

  const handleReactivate = async () => {
    if (!showActionDialog?.authorization) return;
    
    const result = await reactivateAccessAuthorization(showActionDialog.authorization.id);
    if (result.success) {
      toast.success('Autorización reactivada');
      loadData();
    } else {
      toast.error(result.error?.message || 'Error al reactivar');
    }
    setShowActionDialog(null);
  };

  const handleViewDetails = (auth: AccessAuthorization) => {
    setSelectedAuthorization(auth);
    setShowDetailsDialog(true);
  };

  const handleViewHistory = async (auth: AccessAuthorization) => {
    setSelectedAuthorization(auth);
    const history = await getEntityHistory('access_authorization', auth.id);
    setAuditHistory(history);
    setShowHistoryDialog(true);
  };

  const handleProcessExpirations = async () => {
    const result = await processExpirations();
    toast.success(
      `Procesado: ${result.expired} expirados, ${result.activated} activados, ${result.unsuspended} reactivados`
    );
    loadData();
  };

  const handleExport = () => {
    // Exportar a CSV
    const headers = ['ID', 'Visitante', 'Documento', 'Unidad', 'Tipo', 'Estado', 'Válido desde', 'Válido hasta', 'Código'];
    const rows = authorizations.map(a => [
      a.id,
      `${a.visitor.firstName} ${a.visitor.lastName}`,
      a.visitor.documentNumber,
      a.unitId,
      TYPE_LABELS[a.type],
      STATUS_CONFIG[a.status].label,
      a.validFrom,
      a.validUntil,
      a.accessCode || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `autorizaciones_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Exportación completada');
  };

  // Calcular páginas
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1E40] flex items-center gap-2">
            <Shield className="w-7 h-7 text-[#C9A961]" />
            Autorizaciones de Acceso
          </h2>
          <p className="text-gray-600 mt-1">
            Gestión completa de permisos de entrada al edificio
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleProcessExpirations}
            className="border-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Procesar Vencimientos
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
            className="border-[#0A1E40] text-[#0A1E40]"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#0A1E40] hover:bg-[#123061]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nueva Autorización
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-[#0A1E40]">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {stats.byStatus.active || 0}
            </div>
            <div className="text-sm text-green-600">Activos</div>
          </Card>
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">
              {stats.byStatus.pending_approval || 0}
            </div>
            <div className="text-sm text-yellow-600">Pendientes</div>
          </Card>
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="text-2xl font-bold text-orange-700">
              {stats.expiringThisWeek}
            </div>
            <div className="text-sm text-orange-600">Expiran esta semana</div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-2xl font-bold text-blue-700">
              {stats.usedToday}
            </div>
            <div className="text-sm text-blue-600">Usados hoy</div>
          </Card>
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="text-2xl font-bold text-gray-700">
              {(stats.byStatus.expired || 0) + (stats.byStatus.revoked || 0)}
            </div>
            <div className="text-sm text-gray-600">Inactivos</div>
          </Card>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, documento o código..."
                className="pl-10"
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={filters.type as string || 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, type: v === 'all' ? undefined : v as AccessType }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de acceso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabs y tabla */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            Todos ({stats?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendientes ({stats?.byStatus.pending_approval || 0})
          </TabsTrigger>
          <TabsTrigger value="active">
            Activos ({(stats?.byStatus.active || 0) + (stats?.byStatus.approved || 0)})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactivos
          </TabsTrigger>
        </TabsList>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Visitante</TableHead>
                <TableHead className="font-semibold">Unidad</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold">Vigencia</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Código</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">Cargando...</p>
                  </TableCell>
                </TableRow>
              ) : authorizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No hay autorizaciones que mostrar</p>
                  </TableCell>
                </TableRow>
              ) : (
                authorizations.map((auth) => (
                  <TableRow key={auth.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0A1E40]/10 flex items-center justify-center text-[#0A1E40] font-semibold">
                          {auth.visitor.firstName.charAt(0)}{auth.visitor.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-[#0A1E40]">
                            {auth.visitor.firstName} {auth.visitor.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {auth.visitor.documentType}: {auth.visitor.documentNumber}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {auth.unitId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{TYPE_LABELS[auth.type]}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {new Date(auth.validFrom).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          →  {new Date(auth.validUntil).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_CONFIG[auth.status].color} flex items-center gap-1 w-fit`}>
                        {STATUS_CONFIG[auth.status].icon}
                        {STATUS_CONFIG[auth.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {auth.accessCode && (
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {auth.accessCode}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(auth)}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(auth)}
                          title="Ver historial"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        
                        {auth.status === 'pending_approval' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setShowActionDialog({ type: 'approve', authorization: auth })}
                              title="Aprobar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setShowActionDialog({ type: 'reject', authorization: auth })}
                              title="Rechazar"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {auth.status === 'active' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => setShowActionDialog({ type: 'suspend', authorization: auth })}
                              title="Suspender"
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setShowActionDialog({ type: 'revoke', authorization: auth })}
                              title="Revocar"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {auth.status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => setShowActionDialog({ type: 'reactivate', authorization: auth })}
                            title="Reactivar"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalItems)} de {totalItems}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Tabs>

      {/* Dialog: Crear Autorización */}
      <CreateAccessDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        buildingId={buildingId}
        onSuccess={() => {
          loadData();
          setShowCreateDialog(false);
        }}
      />

      {/* Dialog: Detalles */}
      {selectedAuthorization && (
        <AccessDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          authorization={selectedAuthorization}
        />
      )}

      {/* Dialog: Historial */}
      {selectedAuthorization && (
        <AccessHistoryDialog
          open={showHistoryDialog}
          onOpenChange={setShowHistoryDialog}
          authorization={selectedAuthorization}
          history={auditHistory}
        />
      )}

      {/* Dialog: Acciones */}
      {showActionDialog && (
        <ActionDialog
          type={showActionDialog.type}
          authorization={showActionDialog.authorization}
          open={true}
          onOpenChange={() => setShowActionDialog(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRevoke={handleRevoke}
          onSuspend={handleSuspend}
          onReactivate={handleReactivate}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

interface CreateAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  onSuccess: () => void;
}

const CreateAccessDialog: React.FC<CreateAccessDialogProps> = ({
  open,
  onOpenChange,
  buildingId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<CreateAccessInput>>({
    buildingId,
    type: 'single_visit',
    autoApprove: true,
    visitor: {
      firstName: '',
      lastName: '',
      documentType: 'CI',
      documentNumber: '',
      phone: '',
      relationship: 'other',
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await createAccessAuthorization(formData as CreateAccessInput);
      if (result.success) {
        toast.success('Autorización creada exitosamente');
        onSuccess();
      } else {
        toast.error(result.error?.message || 'Error al crear autorización');
      }
    } catch (error) {
      toast.error('Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#C9A961]" />
            Nueva Autorización de Acceso
          </DialogTitle>
          <DialogDescription>
            Complete los datos del visitante y configure los permisos de acceso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Datos del visitante */}
          <div className="space-y-4">
            <h4 className="font-semibold text-[#0A1E40] flex items-center gap-2">
              <Users className="w-4 h-4" />
              Datos del Visitante
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.visitor?.firstName || ''}
                  onChange={(e) => setFormData(f => ({
                    ...f,
                    visitor: { ...f.visitor!, firstName: e.target.value }
                  }))}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <Label>Apellido *</Label>
                <Input
                  value={formData.visitor?.lastName || ''}
                  onChange={(e) => setFormData(f => ({
                    ...f,
                    visitor: { ...f.visitor!, lastName: e.target.value }
                  }))}
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de documento</Label>
                <Select
                  value={formData.visitor?.documentType || 'CI'}
                  onValueChange={(v) => setFormData(f => ({
                    ...f,
                    visitor: { ...f.visitor!, documentType: v as DocumentType }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CI">Cédula</SelectItem>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="passport">Pasaporte</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número de documento *</Label>
                <Input
                  value={formData.visitor?.documentNumber || ''}
                  onChange={(e) => setFormData(f => ({
                    ...f,
                    visitor: { ...f.visitor!, documentNumber: e.target.value }
                  }))}
                  placeholder="12.345.678"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.visitor?.phone || ''}
                  onChange={(e) => setFormData(f => ({
                    ...f,
                    visitor: { ...f.visitor!, phone: e.target.value }
                  }))}
                  placeholder="+598 99 123 456"
                />
              </div>
              <div>
                <Label>Relación</Label>
                <Select
                  value={formData.visitor?.relationship || 'other'}
                  onValueChange={(v) => setFormData(f => ({
                    ...f,
                    visitor: { ...f.visitor!, relationship: v as VisitorRelationship }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Configuración del acceso */}
          <div className="space-y-4">
            <h4 className="font-semibold text-[#0A1E40] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Configuración del Acceso
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unidad *</Label>
                <Input
                  value={formData.unitId || ''}
                  onChange={(e) => setFormData(f => ({ ...f, unitId: e.target.value }))}
                  placeholder="Ej: 1205"
                />
              </div>
              <div>
                <Label>Tipo de acceso *</Label>
                <Select
                  value={formData.type || 'single_visit'}
                  onValueChange={(v) => setFormData(f => ({ ...f, type: v as AccessType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Válido desde *</Label>
                <Input
                  type="datetime-local"
                  value={formData.validFrom || ''}
                  onChange={(e) => setFormData(f => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label>Válido hasta *</Label>
                <Input
                  type="datetime-local"
                  value={formData.validUntil || ''}
                  onChange={(e) => setFormData(f => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={formData.observations || ''}
                onChange={(e) => setFormData(f => ({ ...f, observations: e.target.value }))}
                placeholder="Notas adicionales sobre la visita..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoApprove"
                checked={formData.autoApprove}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, autoApprove: !!checked }))}
              />
              <Label htmlFor="autoApprove" className="cursor-pointer">
                Aprobar automáticamente (no requiere validación)
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#0A1E40] hover:bg-[#123061]"
          >
            {isSubmitting ? 'Creando...' : 'Crear Autorización'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface AccessDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorization: AccessAuthorization;
}

const AccessDetailsDialog: React.FC<AccessDetailsDialogProps> = ({
  open,
  onOpenChange,
  authorization,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#C9A961]" />
            Detalles de Autorización
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Estado y código */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Badge className={`${STATUS_CONFIG[authorization.status].color} text-sm`}>
                {STATUS_CONFIG[authorization.status].icon}
                <span className="ml-1">{STATUS_CONFIG[authorization.status].label}</span>
              </Badge>
            </div>
            {authorization.accessCode && (
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Código de acceso</div>
                <code className="text-2xl font-bold font-mono tracking-wider text-[#0A1E40]">
                  {authorization.accessCode}
                </code>
              </div>
            )}
          </div>

          {/* Datos del visitante */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#0A1E40]">Visitante</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Nombre:</span>
                <span className="ml-2 font-medium">
                  {authorization.visitor.firstName} {authorization.visitor.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Documento:</span>
                <span className="ml-2 font-medium">
                  {authorization.visitor.documentType}: {authorization.visitor.documentNumber}
                </span>
              </div>
              {authorization.visitor.phone && (
                <div>
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="ml-2 font-medium">{authorization.visitor.phone}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Relación:</span>
                <span className="ml-2 font-medium">
                  {RELATIONSHIP_LABELS[authorization.visitor.relationship]}
                </span>
              </div>
            </div>
          </div>

          {/* Configuración del acceso */}
          <div className="space-y-3">
            <h4 className="font-semibold text-[#0A1E40]">Acceso</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Unidad:</span>
                <span className="ml-2 font-medium">{authorization.unitId}</span>
              </div>
              <div>
                <span className="text-gray-500">Tipo:</span>
                <span className="ml-2 font-medium">{TYPE_LABELS[authorization.type]}</span>
              </div>
              <div>
                <span className="text-gray-500">Válido desde:</span>
                <span className="ml-2 font-medium">
                  {new Date(authorization.validFrom).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Válido hasta:</span>
                <span className="ml-2 font-medium">
                  {new Date(authorization.validUntil).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Usos:</span>
                <span className="ml-2 font-medium">
                  {authorization.usageCount}
                  {authorization.maxUsages ? ` / ${authorization.maxUsages}` : ' (ilimitado)'}
                </span>
              </div>
            </div>
          </div>

          {/* Registro de uso */}
          {authorization.usageLog.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-[#0A1E40]">Registro de Uso</h4>
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {authorization.usageLog.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border-b last:border-0 text-sm">
                    <div className="flex items-center gap-2">
                      {entry.action === 'entry' ? (
                        <Badge className="bg-green-100 text-green-800">Entrada</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800">Salida</Badge>
                      )}
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <span className="text-gray-500">{entry.registeredByName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información de auditoría */}
          <div className="space-y-2 pt-4 border-t text-xs text-gray-500">
            <div>Creado: {new Date(authorization.audit.createdAt).toLocaleString()} por {authorization.audit.createdByName}</div>
            <div>Actualizado: {new Date(authorization.audit.updatedAt).toLocaleString()} por {authorization.audit.updatedByName}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AccessHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorization: AccessAuthorization;
  history: AuditLogEntry[];
}

const AccessHistoryDialog: React.FC<AccessHistoryDialogProps> = ({
  open,
  onOpenChange,
  authorization,
  history,
}) => {
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Creación',
      update: 'Actualización',
      approval: 'Aprobación',
      rejection: 'Rechazo',
      revocation: 'Revocación',
      expiration: 'Expiración',
      status_change: 'Cambio de estado',
    };
    return labels[action] || action;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#C9A961]" />
            Historial de Cambios
          </DialogTitle>
          <DialogDescription>
            Registro completo de auditoría para esta autorización
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay registros de auditoría
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              {history.map((entry, idx) => (
                <div key={entry.id} className="relative pl-10 pb-6">
                  <div className="absolute left-2.5 w-3 h-3 rounded-full bg-[#0A1E40]" />
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{getActionLabel(entry.action)}</Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      Por: <span className="font-medium">{entry.userName}</span>
                      <span className="text-gray-400 ml-2">({entry.source})</span>
                    </div>
                    {entry.changedFields.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Campos modificados: {entry.changedFields.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ActionDialogProps {
  type: 'approve' | 'reject' | 'revoke' | 'suspend' | 'reactivate';
  authorization: AccessAuthorization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRevoke: (reason: string) => void;
  onSuspend: (reason: string, until?: string) => void;
  onReactivate: () => void;
}

const ActionDialog: React.FC<ActionDialogProps> = ({
  type,
  authorization,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onRevoke,
  onSuspend,
  onReactivate,
}) => {
  const [reason, setReason] = useState('');
  const [suspendUntil, setSuspendUntil] = useState('');

  const configs = {
    approve: {
      title: 'Aprobar Autorización',
      description: `¿Confirma que desea aprobar el acceso para ${authorization.visitor.firstName} ${authorization.visitor.lastName}?`,
      action: 'Aprobar',
      needsReason: false,
      color: 'bg-green-600 hover:bg-green-700',
    },
    reject: {
      title: 'Rechazar Autorización',
      description: 'Indique el motivo del rechazo:',
      action: 'Rechazar',
      needsReason: true,
      color: 'bg-red-600 hover:bg-red-700',
    },
    revoke: {
      title: 'Revocar Autorización',
      description: 'Esta acción es permanente. Indique el motivo:',
      action: 'Revocar',
      needsReason: true,
      color: 'bg-red-600 hover:bg-red-700',
    },
    suspend: {
      title: 'Suspender Autorización',
      description: 'Suspenda temporalmente este acceso:',
      action: 'Suspender',
      needsReason: true,
      color: 'bg-orange-600 hover:bg-orange-700',
    },
    reactivate: {
      title: 'Reactivar Autorización',
      description: `¿Confirma que desea reactivar el acceso para ${authorization.visitor.firstName} ${authorization.visitor.lastName}?`,
      action: 'Reactivar',
      needsReason: false,
      color: 'bg-green-600 hover:bg-green-700',
    },
  };

  const config = configs[type];

  const handleConfirm = () => {
    switch (type) {
      case 'approve':
        onApprove();
        break;
      case 'reject':
        onReject(reason);
        break;
      case 'revoke':
        onRevoke(reason);
        break;
      case 'suspend':
        onSuspend(reason, suspendUntil || undefined);
        break;
      case 'reactivate':
        onReactivate();
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {config.needsReason && (
          <div className="space-y-4 py-4">
            <div>
              <Label>Motivo *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describa el motivo..."
                rows={3}
              />
            </div>
            {type === 'suspend' && (
              <div>
                <Label>Suspender hasta (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={suspendUntil}
                  onChange={(e) => setSuspendUntil(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={config.needsReason && !reason.trim()}
            className={config.color}
          >
            {config.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccessManagement;
