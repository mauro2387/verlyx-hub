/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - AUTOMATION MANAGEMENT COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Panel de gestión de automatizaciones inteligentes.
 * Permite crear, editar, activar/desactivar reglas y ver historial de ejecución.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { toast } from 'sonner';
import {
  Zap,
  Plus,
  Search,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  History,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Target,
  Filter,
  ArrowRight,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Eye,
  ChevronRight,
  BarChart3,
  Calendar,
  Bell,
  Mail,
  Webhook,
  FileText,
  Archive,
  AlertCircle,
  Users,
  Database,
} from 'lucide-react';

import type {
  AutomationRule,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  AutomationExecution,
  TriggerType,
  ActionType,
  ExecutionStatus,
} from '../../types/automation.types';

import {
  getAllRules,
  getRulesByBuilding,
  getRule,
  createRule,
  updateRule,
  toggleRuleStatus,
  deleteRule,
  executeRuleManually,
  getExecutions,
  getAutomationStats,
  exportAutomationConfig,
  importAutomationConfig,
} from '../../services/automationService';

import { DEFAULT_AUTOMATION_TEMPLATES } from '../../types/automation.types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const TRIGGER_TYPE_CONFIG: Record<TriggerType, { label: string; icon: React.ReactNode; description: string }> = {
  event: { 
    label: 'Evento', 
    icon: <Zap className="w-4 h-4" />,
    description: 'Se activa cuando ocurre un evento específico' 
  },
  schedule: { 
    label: 'Programado', 
    icon: <Clock className="w-4 h-4" />,
    description: 'Se ejecuta en horarios definidos' 
  },
  threshold: { 
    label: 'Umbral', 
    icon: <Target className="w-4 h-4" />,
    description: 'Se activa cuando un valor cruza un límite' 
  },
  manual: { 
    label: 'Manual', 
    icon: <Play className="w-4 h-4" />,
    description: 'Se ejecuta manualmente por un usuario' 
  },
};

const ACTION_TYPE_CONFIG: Record<ActionType, { label: string; icon: React.ReactNode }> = {
  notification: { label: 'Notificación', icon: <Bell className="w-4 h-4" /> },
  status_change: { label: 'Cambiar Estado', icon: <RefreshCw className="w-4 h-4" /> },
  assignment: { label: 'Asignar', icon: <Users className="w-4 h-4" /> },
  create_task: { label: 'Crear Tarea', icon: <FileText className="w-4 h-4" /> },
  data_update: { label: 'Actualizar Datos', icon: <Database className="w-4 h-4" /> },
  webhook: { label: 'Webhook', icon: <Webhook className="w-4 h-4" /> },
  email: { label: 'Email', icon: <Mail className="w-4 h-4" /> },
  report: { label: 'Generar Reporte', icon: <BarChart3 className="w-4 h-4" /> },
  archive: { label: 'Archivar', icon: <Archive className="w-4 h-4" /> },
  escalation: { label: 'Escalar', icon: <AlertCircle className="w-4 h-4" /> },
};

const STATUS_CONFIG: Record<ExecutionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-3 h-3" /> },
  running: { label: 'Ejecutando', color: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  partial_success: { label: 'Parcial', color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-3 h-3" /> },
  failed: { label: 'Fallido', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  skipped: { label: 'Omitido', color: 'bg-gray-100 text-gray-500', icon: <ChevronRight className="w-3 h-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-500', icon: <XCircle className="w-3 h-3" /> },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  access_control: { label: 'Control de Acceso', color: 'bg-purple-100 text-purple-700' },
  payments: { label: 'Pagos', color: 'bg-green-100 text-green-700' },
  reservations: { label: 'Reservas', color: 'bg-blue-100 text-blue-700' },
  maintenance: { label: 'Mantenimiento', color: 'bg-orange-100 text-orange-700' },
  communications: { label: 'Comunicaciones', color: 'bg-cyan-100 text-cyan-700' },
  security: { label: 'Seguridad', color: 'bg-red-100 text-red-700' },
  reporting: { label: 'Reportes', color: 'bg-indigo-100 text-indigo-700' },
  other: { label: 'Otro', color: 'bg-gray-100 text-gray-700' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface AutomationManagementProps {
  buildingId: string;
}

const AutomationManagement: React.FC<AutomationManagementProps> = ({ buildingId }) => {
  // Estado principal
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getAutomationStats> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  
  // Diálogos
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<AutomationExecution | null>(null);

  // Cargar datos
  const loadData = () => {
    setIsLoading(true);
    try {
      const rulesData = getRulesByBuilding(buildingId);
      setRules(rulesData);
      
      const executionsData = getExecutions({ limit: 100 });
      setExecutions(executionsData);
      
      const statsData = getAutomationStats(buildingId);
      setStats(statsData);
    } catch (error) {
      toast.error('Error al cargar automatizaciones');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [buildingId]);

  // Filtrar reglas
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || rule.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'enabled' && rule.enabled) ||
                         (statusFilter === 'disabled' && !rule.enabled);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Handlers
  const handleToggleRule = async (rule: AutomationRule) => {
    const result = await toggleRuleStatus(rule.id, !rule.enabled);
    if (result.success) {
      toast.success(rule.enabled ? 'Regla desactivada' : 'Regla activada');
      loadData();
    } else {
      toast.error(result.error || 'Error al cambiar estado');
    }
  };

  const handleDeleteRule = async (rule: AutomationRule) => {
    if (!confirm(`¿Seguro que desea eliminar la regla "${rule.name}"?`)) return;
    
    const result = await deleteRule(rule.id);
    if (result.success) {
      toast.success('Regla eliminada');
      loadData();
    } else {
      toast.error(result.error || 'Error al eliminar');
    }
  };

  const handleRunManually = async (rule: AutomationRule) => {
    const result = await executeRuleManually(rule.id);
    if (result.success) {
      toast.success('Regla ejecutada manualmente');
      loadData();
    } else {
      toast.error(result.error || 'Error al ejecutar');
    }
  };

  const handleDuplicateRule = async (rule: AutomationRule) => {
    const { id, executionStats, createdAt, updatedAt, ...ruleData } = rule;
    const result = await createRule({
      ...ruleData,
      name: `${rule.name} (copia)`,
      enabled: false,
    });
    
    if (result.success) {
      toast.success('Regla duplicada');
      loadData();
    } else {
      toast.error(result.error || 'Error al duplicar');
    }
  };

  const handleExport = () => {
    const config = exportAutomationConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `automatizaciones_${buildingId}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast.success('Configuración exportada');
  };

  const handleImport = async (configJson: string) => {
    const result = await importAutomationConfig(configJson);
    if (result.success) {
      toast.success(`${result.imported} reglas importadas`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} reglas con errores`);
      }
      loadData();
      setShowImportDialog(false);
    } else {
      toast.error(result.errors[0] || 'Error en la importación');
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    const template = DEFAULT_AUTOMATION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    
    const result = await createRule({
      ...template,
      scope: { 
        ...template.scope, 
        buildingIds: [buildingId] 
      },
      enabled: false, // Crear deshabilitado para configurar
    });
    
    if (result.success) {
      toast.success('Regla creada desde plantilla');
      setShowTemplatesDialog(false);
      setSelectedRule(result.data!);
      setShowEditDialog(true);
      loadData();
    } else {
      toast.error(result.error || 'Error al crear desde plantilla');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1E40] flex items-center gap-2">
            <Zap className="w-7 h-7 text-[#C9A961]" />
            Automatizaciones Inteligentes
          </h2>
          <p className="text-gray-600 mt-1">
            Configure reglas automáticas para optimizar la operación del edificio
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
            className="border-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowImportDialog(true)}
            className="border-gray-300"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowTemplatesDialog(true)}
            className="border-[#0A1E40] text-[#0A1E40]"
          >
            <FileText className="w-4 h-4 mr-2" />
            Plantillas
          </Button>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#0A1E40] hover:bg-[#123061]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Regla
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-[#0A1E40]">{stats.totalRules}</div>
                <div className="text-sm text-gray-600">Reglas totales</div>
              </div>
              <Settings className="w-8 h-8 text-gray-300" />
            </div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-700">{stats.activeRules}</div>
                <div className="text-sm text-green-600">Reglas activas</div>
              </div>
              <Play className="w-8 h-8 text-green-300" />
            </div>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.totalExecutions}</div>
                <div className="text-sm text-blue-600">Ejecuciones</div>
              </div>
              <Activity className="w-8 h-8 text-blue-300" />
            </div>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-700">{stats.successRate.toFixed(1)}%</div>
                <div className="text-sm text-purple-600">Tasa de éxito</div>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-300" />
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">
            <Settings className="w-4 h-4 mr-2" />
            Reglas ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analíticas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Reglas */}
        <TabsContent value="rules" className="space-y-4">
          {/* Filtros */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nombre o descripción..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="enabled">Activas</SelectItem>
                  <SelectItem value="disabled">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Lista de reglas */}
          <div className="space-y-4">
            {filteredRules.length === 0 ? (
              <Card className="p-8 text-center">
                <Zap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  No hay reglas configuradas
                </h3>
                <p className="text-gray-500 mb-4">
                  Comience creando una regla desde cero o usando una plantilla
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => setShowTemplatesDialog(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Plantillas
                  </Button>
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-[#0A1E40]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Regla
                  </Button>
                </div>
              </Card>
            ) : (
              filteredRules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={() => handleToggleRule(rule)}
                  onEdit={() => {
                    setSelectedRule(rule);
                    setShowEditDialog(true);
                  }}
                  onDelete={() => handleDeleteRule(rule)}
                  onRun={() => handleRunManually(rule)}
                  onDuplicate={() => handleDuplicateRule(rule)}
                  onViewHistory={() => {
                    setSelectedRule(rule);
                    setShowHistoryDialog(true);
                  }}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Regla</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No hay ejecuciones registradas</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  executions.slice(0, 50).map(exec => (
                    <TableRow key={exec.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {new Date(exec.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{exec.ruleName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TRIGGER_TYPE_CONFIG[exec.triggeredBy.type]?.label || exec.triggeredBy.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[exec.status].color}>
                          {STATUS_CONFIG[exec.status].icon}
                          <span className="ml-1">{STATUS_CONFIG[exec.status].label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {exec.totalDuration}ms
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExecution(exec)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab: Analíticas */}
        <TabsContent value="analytics">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ejecuciones por estado */}
              <Card className="p-6">
                <h3 className="font-semibold text-[#0A1E40] mb-4">Ejecuciones por Estado</h3>
                <div className="space-y-3">
                  {Object.entries(stats.executionsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_CONFIG[status as ExecutionStatus].color}>
                          {STATUS_CONFIG[status as ExecutionStatus].icon}
                          <span className="ml-1">{STATUS_CONFIG[status as ExecutionStatus].label}</span>
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top reglas */}
              <Card className="p-6">
                <h3 className="font-semibold text-[#0A1E40] mb-4">Reglas más ejecutadas</h3>
                <div className="space-y-3">
                  {stats.topRulesByExecutions.map((item, idx) => (
                    <div key={item.ruleId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#0A1E40]/10 flex items-center justify-center text-xs font-semibold text-[#0A1E40]">
                          {idx + 1}
                        </span>
                        <span className="text-sm truncate max-w-[200px]">{item.ruleName}</span>
                      </div>
                      <Badge variant="outline">{item.executions}</Badge>
                    </div>
                  ))}
                  {stats.topRulesByExecutions.length === 0 && (
                    <p className="text-gray-500 text-sm">Sin datos suficientes</p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Plantillas */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C9A961]" />
              Plantillas de Automatización
            </DialogTitle>
            <DialogDescription>
              Seleccione una plantilla predefinida para comenzar rápidamente
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[50vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEFAULT_AUTOMATION_TEMPLATES.map(template => (
                <Card 
                  key={template.id} 
                  className="p-4 cursor-pointer hover:border-[#C9A961] transition-colors"
                  onClick={() => handleCreateFromTemplate(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0A1E40]/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[#0A1E40]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#0A1E40]">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={CATEGORY_CONFIG[template.category]?.color || 'bg-gray-100'}>
                          {CATEGORY_CONFIG[template.category]?.label || template.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.triggers.length} triggers
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.actions.length} acciones
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: Importar */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
      />

      {/* Dialog: Crear/Editar Regla */}
      {(showCreateDialog || showEditDialog) && (
        <RuleEditorDialog
          open={showCreateDialog || showEditDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setShowEditDialog(false);
              setSelectedRule(null);
            }
          }}
          rule={selectedRule}
          buildingId={buildingId}
          onSave={() => {
            loadData();
            setShowCreateDialog(false);
            setShowEditDialog(false);
            setSelectedRule(null);
          }}
        />
      )}

      {/* Dialog: Detalles de ejecución */}
      {selectedExecution && (
        <ExecutionDetailsDialog
          open={true}
          onOpenChange={() => setSelectedExecution(null)}
          execution={selectedExecution}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

interface RuleCardProps {
  rule: AutomationRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onDuplicate: () => void;
  onViewHistory: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  onToggle,
  onEdit,
  onDelete,
  onRun,
  onDuplicate,
  onViewHistory,
}) => {
  return (
    <Card className={`p-4 ${rule.enabled ? 'border-l-4 border-l-green-500' : 'opacity-60'}`}>
      <div className="flex items-start gap-4">
        {/* Toggle */}
        <div className="pt-1">
          <Switch
            checked={rule.enabled}
            onCheckedChange={onToggle}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[#0A1E40] truncate">{rule.name}</h3>
            <Badge className={CATEGORY_CONFIG[rule.category]?.color || 'bg-gray-100'}>
              {CATEGORY_CONFIG[rule.category]?.label || rule.category}
            </Badge>
            {rule.priority === 'high' && (
              <Badge className="bg-red-100 text-red-700">Alta prioridad</Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{rule.description}</p>
          
          {/* Triggers y acciones */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-500">
              <Target className="w-4 h-4" />
              <span>{rule.triggers.length} trigger(s):</span>
              {rule.triggers.slice(0, 2).map((t, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {TRIGGER_TYPE_CONFIG[t.type]?.label}
                </Badge>
              ))}
              {rule.triggers.length > 2 && (
                <span className="text-gray-400">+{rule.triggers.length - 2}</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <ArrowRight className="w-4 h-4" />
              <span>{rule.actions.length} acción(es):</span>
              {rule.actions.slice(0, 2).map((a, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {ACTION_TYPE_CONFIG[a.type]?.label}
                </Badge>
              ))}
              {rule.actions.length > 2 && (
                <span className="text-gray-400">+{rule.actions.length - 2}</span>
              )}
            </div>
          </div>

          {/* Stats */}
          {rule.executionStats && (
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>{rule.executionStats.totalExecutions} ejecuciones</span>
              <span className="text-green-600">
                {rule.executionStats.successfulExecutions} exitosas
              </span>
              {rule.executionStats.failedExecutions > 0 && (
                <span className="text-red-600">
                  {rule.executionStats.failedExecutions} fallidas
                </span>
              )}
              {rule.executionStats.lastExecutedAt && (
                <span>
                  Última: {new Date(rule.executionStats.lastExecutedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1">
          {rule.triggers.some(t => t.type === 'manual') && (
            <Button variant="ghost" size="sm" onClick={onRun} title="Ejecutar manualmente">
              <Play className="w-4 h-4 text-green-600" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onViewHistory} title="Ver historial">
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDuplicate} title="Duplicar">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} title="Editar">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Eliminar">
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (config: string) => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onOpenChange, onImport }) => {
  const [configText, setConfigText] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setConfigText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Configuración</DialogTitle>
          <DialogDescription>
            Suba un archivo JSON o pegue la configuración
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Archivo JSON</Label>
            <Input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="mt-1"
            />
          </div>
          <div>
            <Label>O pegue el JSON</Label>
            <Textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder='[{"name": "Regla 1", ...}]'
              rows={8}
              className="mt-1 font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => onImport(configText)}
            disabled={!configText.trim()}
            className="bg-[#0A1E40]"
          >
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface RuleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AutomationRule | null;
  buildingId: string;
  onSave: () => void;
}

const RuleEditorDialog: React.FC<RuleEditorDialogProps> = ({
  open,
  onOpenChange,
  rule,
  buildingId,
  onSave,
}) => {
  const isEditing = !!rule;
  const [formData, setFormData] = useState<Partial<AutomationRule>>({
    name: '',
    description: '',
    category: 'other',
    priority: 'medium',
    enabled: false,
    triggers: [],
    conditions: [],
    actions: [],
    scope: {
      buildingIds: [buildingId],
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'other',
        priority: 'medium',
        enabled: false,
        triggers: [],
        conditions: [],
        actions: [],
        scope: {
          buildingIds: [buildingId],
        },
      });
    }
  }, [rule, buildingId]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isEditing) {
        const result = await updateRule(rule!.id, formData);
        if (result.success) {
          toast.success('Regla actualizada');
          onSave();
        } else {
          toast.error(result.error || 'Error al actualizar');
        }
      } else {
        const result = await createRule(formData as any);
        if (result.success) {
          toast.success('Regla creada');
          onSave();
        } else {
          toast.error(result.error || 'Error al crear');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#C9A961]" />
            {isEditing ? 'Editar Regla' : 'Nueva Regla de Automatización'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información básica */}
          <div className="space-y-4">
            <h4 className="font-semibold text-[#0A1E40]">Información General</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Notificar expiraciones de acceso"
                />
              </div>
              <div className="col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe qué hace esta automatización..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={formData.category || 'other'}
                  onValueChange={(v) => setFormData(f => ({ ...f, category: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select
                  value={formData.priority || 'medium'}
                  onValueChange={(v) => setFormData(f => ({ ...f, priority: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Triggers - Simplificado */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[#0A1E40]">Triggers ({formData.triggers?.length || 0})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData(f => ({
                    ...f,
                    triggers: [...(f.triggers || []), {
                      type: 'event',
                      eventType: '',
                      enabled: true,
                    } as AutomationTrigger]
                  }));
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            
            {(formData.triggers || []).map((trigger, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={trigger.type}
                        onValueChange={(v) => {
                          const newTriggers = [...(formData.triggers || [])];
                          newTriggers[idx] = { ...trigger, type: v as TriggerType };
                          setFormData(f => ({ ...f, triggers: newTriggers }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRIGGER_TYPE_CONFIG).map(([value, { label }]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {trigger.type === 'event' && (
                      <div>
                        <Label>Tipo de evento</Label>
                        <Input
                          value={trigger.eventType || ''}
                          onChange={(e) => {
                            const newTriggers = [...(formData.triggers || [])];
                            newTriggers[idx] = { ...trigger, eventType: e.target.value };
                            setFormData(f => ({ ...f, triggers: newTriggers }));
                          }}
                          placeholder="ej: access.created"
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newTriggers = formData.triggers?.filter((_, i) => i !== idx);
                      setFormData(f => ({ ...f, triggers: newTriggers }));
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Acciones - Simplificado */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[#0A1E40]">Acciones ({formData.actions?.length || 0})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData(f => ({
                    ...f,
                    actions: [...(f.actions || []), {
                      type: 'notification',
                      notification: {
                        channels: ['in_app'],
                        title: '',
                        message: '',
                        recipients: [],
                      }
                    } as AutomationAction]
                  }));
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            
            {(formData.actions || []).map((action, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>Tipo de acción</Label>
                      <Select
                        value={action.type}
                        onValueChange={(v) => {
                          const newActions = [...(formData.actions || [])];
                          newActions[idx] = { type: v as ActionType } as AutomationAction;
                          setFormData(f => ({ ...f, actions: newActions }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ACTION_TYPE_CONFIG).map(([value, { label, icon }]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                {icon}
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {action.type === 'notification' && (
                      <>
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={action.notification?.title || ''}
                            onChange={(e) => {
                              const newActions = [...(formData.actions || [])];
                              newActions[idx] = {
                                ...action,
                                notification: { ...action.notification!, title: e.target.value }
                              };
                              setFormData(f => ({ ...f, actions: newActions }));
                            }}
                            placeholder="Título de la notificación"
                          />
                        </div>
                        <div>
                          <Label>Mensaje</Label>
                          <Textarea
                            value={action.notification?.message || ''}
                            onChange={(e) => {
                              const newActions = [...(formData.actions || [])];
                              newActions[idx] = {
                                ...action,
                                notification: { ...action.notification!, message: e.target.value }
                              };
                              setFormData(f => ({ ...f, actions: newActions }));
                            }}
                            placeholder="Mensaje (use {{campo}} para variables)"
                            rows={2}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newActions = formData.actions?.filter((_, i) => i !== idx);
                      setFormData(f => ({ ...f, actions: newActions }));
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name}
            className="bg-[#0A1E40] hover:bg-[#123061]"
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Regla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ExecutionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: AutomationExecution;
}

const ExecutionDetailsDialog: React.FC<ExecutionDetailsDialogProps> = ({
  open,
  onOpenChange,
  execution,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#C9A961]" />
            Detalles de Ejecución
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info general */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-semibold text-[#0A1E40]">{execution.ruleName}</div>
              <div className="text-sm text-gray-600">
                {new Date(execution.startedAt).toLocaleString()}
              </div>
            </div>
            <Badge className={STATUS_CONFIG[execution.status].color}>
              {STATUS_CONFIG[execution.status].icon}
              <span className="ml-1">{STATUS_CONFIG[execution.status].label}</span>
            </Badge>
          </div>

          {/* Trigger */}
          <div>
            <h4 className="font-semibold text-[#0A1E40] mb-2">Trigger</h4>
            <div className="text-sm">
              <Badge variant="outline">{execution.triggeredBy.type}</Badge>
              {execution.triggeredBy.eventType && (
                <span className="ml-2 text-gray-600">{execution.triggeredBy.eventType}</span>
              )}
            </div>
          </div>

          {/* Condiciones */}
          {execution.conditionResults.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#0A1E40] mb-2">Condiciones evaluadas</h4>
              <div className="space-y-2">
                {execution.conditionResults.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {cond.result ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>{cond.conditionDescription}</span>
                    <span className="text-gray-400">= {String(cond.evaluatedValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          {execution.actionResults.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#0A1E40] mb-2">Acciones ejecutadas</h4>
              <div className="space-y-2">
                {execution.actionResults.map((action, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {action.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm">{ACTION_TYPE_CONFIG[action.actionType as ActionType]?.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{action.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {execution.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-1">Error</h4>
              <p className="text-sm text-red-700">{execution.error}</p>
            </div>
          )}

          {/* Duración total */}
          <div className="text-sm text-gray-500 pt-4 border-t">
            Duración total: <span className="font-mono">{execution.totalDuration}ms</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutomationManagement;
