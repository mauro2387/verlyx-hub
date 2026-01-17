import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock4,
  ClipboardList,
} from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description: string;
  assignedTo: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  category: string;
  location: string;
  createdAt: string;
}

const sampleTasks: Task[] = [
  {
    id: 1,
    title: 'Inspección de Aire Acondicionado',
    description: 'Realizar inspección mensual de los sistemas de AC en el piso 12',
    assignedTo: 'Juan Pérez',
    status: 'in-progress',
    priority: 'medium',
    dueDate: '2025-11-01',
    category: 'Mantenimiento',
    location: 'Piso 12',
    createdAt: '2025-10-30'
  },
  {
    id: 2,
    title: 'Reparación de Cerradura',
    description: 'Reemplazar cerradura defectuosa en la puerta principal del apt 1203',
    assignedTo: 'Carlos Ruiz',
    status: 'pending',
    priority: 'high',
    dueDate: '2025-10-31',
    category: 'Reparaciones',
    location: 'Apt 1203',
    createdAt: '2025-10-30'
  },
  // Agregar más tareas de ejemplo según sea necesario
];

const TaskManagement: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    status: 'pending',
    priority: 'medium',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Clock4 className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const handleCreateTask = () => {
    if (newTask.title && newTask.assignedTo && newTask.dueDate) {
      const task: Task = {
        id: Math.max(...tasks.map(t => t.id), 0) + 1,
        title: newTask.title,
        description: newTask.description || '',
        assignedTo: newTask.assignedTo,
        status: newTask.status as Task['status'],
        priority: newTask.priority as Task['priority'],
        dueDate: newTask.dueDate,
        category: newTask.category || 'General',
        location: newTask.location || '',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setTasks([task, ...tasks]);
      setShowNewTaskDialog(false);
      setNewTask({
        status: 'pending',
        priority: 'medium',
      });
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0A1E40]">Gestión de Tareas</h2>
            <p className="text-gray-600">Asigne y monitoree las tareas del personal</p>
          </div>
          <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#0A1E40]">
                <Plus className="w-4 h-4" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear Nueva Tarea</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Título</label>
                  <Input
                    value={newTask.title || ''}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Título de la tarea"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <Textarea
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Descripción detallada"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Asignar a</label>
                    <Select
                      value={newTask.assignedTo}
                      onValueChange={(value: string) => setNewTask({ ...newTask, assignedTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar personal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
                        <SelectItem value="Carlos Ruiz">Carlos Ruiz</SelectItem>
                        <SelectItem value="María González">María González</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha límite</label>
                    <Input
                      type="date"
                      value={newTask.dueDate || ''}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Prioridad</label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: Task['priority']) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="low">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Categoría</label>
                    <Select
                      value={newTask.category}
                      onValueChange={(value: string) => setNewTask({ ...newTask, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="Reparaciones">Reparaciones</SelectItem>
                        <SelectItem value="Limpieza">Limpieza</SelectItem>
                        <SelectItem value="Seguridad">Seguridad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ubicación</label>
                  <Input
                    value={newTask.location || ''}
                    onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
                    placeholder="Ej: Apt 1201, Piso 12, Área común"
                  />
                </div>
                <Button
                  className="w-full bg-[#0A1E40]"
                  onClick={handleCreateTask}
                  disabled={!newTask.title || !newTask.assignedTo || !newTask.dueDate}
                >
                  Crear Tarea
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                placeholder="Buscar tareas..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in-progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-blue-50 border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Total Tareas</p>
                <p className="text-2xl font-bold text-blue-900">{tasks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-yellow-50 border-yellow-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-yellow-600">En Progreso</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {tasks.filter(t => t.status === 'in-progress').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-red-50 border-red-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600">Vencidas</p>
                <p className="text-2xl font-bold text-red-900">
                  {tasks.filter(t => t.status === 'overdue').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-green-50 border-green-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">Completadas</p>
                <p className="text-2xl font-bold text-green-900">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tasks Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Tarea</TableHead>
                <TableHead className="font-semibold">Asignado a</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Prioridad</TableHead>
                <TableHead className="font-semibold">Fecha Límite</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#0A1E40]">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.category} • {task.location}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {task.assignedTo.charAt(0)}
                      </div>
                      <span>{task.assignedTo}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status === 'in-progress' ? 'En Progreso' :
                       task.status === 'completed' ? 'Completada' :
                       task.status === 'pending' ? 'Pendiente' : 'Vencida'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(task.priority)}
                      <span className="capitalize">
                        {task.priority === 'high' ? 'Alta' :
                         task.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {task.dueDate}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={task.status === 'completed' ? 'border-green-600 text-green-600' : ''}
                      >
                        {task.status === 'completed' ? 'Completada' : 'Marcar Completada'}
                      </Button>
                      <Button variant="ghost" size="sm">
                        Ver Detalles
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Card>
    </div>
  );
};

export default TaskManagement;