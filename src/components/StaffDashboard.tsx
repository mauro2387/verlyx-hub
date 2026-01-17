import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { CheckCircle, Clock, AlertCircle, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface StaffDashboardProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function StaffDashboard({ user, onLogout }: StaffDashboardProps) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [tasks, setTasks] = useState([
    { id: 1, apartment: '1205', title: 'Aire acondicionado no enfría correctamente', description: 'Verificar niveles de refrigerante y limpiar filtros', priority: 'medium', status: 'pending', category: 'HVAC' },
    { id: 2, apartment: '1507', title: 'Baja presión de agua', description: 'Inspeccionar la válvula principal y buscar fugas', priority: 'high', status: 'in-progress', category: 'Plumbing' },
    { id: 3, apartment: '0803', title: 'Cerradura del balcón dura', description: 'Lubricar mecanismo de la cerradura', priority: 'low', status: 'pending', category: 'Carpentry' },
    { id: 4, apartment: '0601', title: 'Lámpara parpadea', description: 'Revisar cableado y reemplazar bombillas si es necesario', priority: 'medium', status: 'pending', category: 'Electrical' }
  ]);
  const translatePriority = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const [completionNote, setCompletionNote] = useState('');
  const [selectedTask, setSelectedTask] = useState<number | null>(null);

  const handleToggleAvailability = () => {
    setIsAvailable(!isAvailable);
    toast.success(isAvailable ? 'Estado cambiado a No Disponible' : 'Estado cambiado a Disponible');
  };

  const handleStartTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: 'in-progress' } : task
    ));
    toast.success('Tarea iniciada');
  };

  const handleCompleteTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: 'completed' } : task
    ));
    toast.success('Tarea marcada como completada. El residente será notificado.');
    setSelectedTask(null);
    setCompletionNote('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'pending': return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default: return null;
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-[#0A1E40] mb-2" style={{ fontSize: '2rem', fontWeight: 700 }}>
             Mis Tareas
              </h1>
            <p className="text-gray-600">Gestiona tus tareas de mantenimiento asignadas</p>
            </div>
            <Card className="p-4 flex items-center gap-4">
              <div>
             <p className="text-sm text-gray-600 mb-1">Estado de Disponibilidad</p>
                <p className="text-[#0A1E40]" style={{ fontWeight: 700 }}>
              {isAvailable ? 'Disponible' : 'No Disponible'}
                </p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={handleToggleAvailability}
                aria-label="Toggle availability"
                aria-description="Cambiar tu estado de disponibilidad"
              />
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-gray-400" />
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Pendiente</Badge>
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '2rem', fontWeight: 700 }}>
              {pendingTasks.length}
            </div>
              <p className="text-gray-600">Tareas Pendientes</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-blue-500" />
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Activa</Badge>
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '2rem', fontWeight: 700 }}>
              {inProgressTasks.length}
            </div>
              <p className="text-gray-600">En Progreso</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completada</Badge>
            </div>
            <div className="text-[#0A1E40]" style={{ fontSize: '2rem', fontWeight: 700 }}>
              {completedTasks.length}
            </div>
              <p className="text-gray-600">Completadas Hoy</p>
          </Card>
        </div>

        {/* Task Lists */}
        <div className="space-y-6">
          {/* In Progress Tasks */}
          {inProgressTasks.length > 0 && (
            <div>
              <h2 className="text-[#0A1E40] mb-4" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
           En Progreso
              </h2>
              <div className="space-y-4">
                {inProgressTasks.map((task) => (
                  <Card key={task.id} className="p-6 border-l-4 border-blue-500">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          {getStatusIcon(task.status)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{task.title}</h3>
                              <Badge className={getPriorityColor(task.priority)}>
                                {translatePriority(task.priority)}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                            <div className="flex gap-4 text-sm text-gray-500">
                              <span>Apto {task.apartment}</span>
                              <span>•</span>
                              <span>{task.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                              <Button 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => setSelectedTask(task.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Completar Tarea
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Completar Tarea</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <label className="block mb-2 text-[#0A1E40]">Notas de Finalización</label>
                                <Textarea
                                  value={completionNote}
                                  onChange={(e) => setCompletionNote(e.target.value)}
                                  placeholder="Describe lo que se hizo..."
                                  rows={4}
                                />
                              </div>
                              <div>
                                <label className="block mb-2 text-[#0A1E40]">Subir Fotos (Opcional)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#C9A961] transition-colors">
                                  <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-600">Haz clic para subir fotos antes/después</p>
                                </div>
                              </div>
                              <Button 
                                onClick={() => handleCompleteTask(task.id)}
                                className="w-full bg-[#0A1E40] hover:bg-[#0f2952] text-white"
                              >
                                Marcar como Completada
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <h2 className="text-[#0A1E40] mb-4" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
           Tareas Pendientes
              </h2>
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <Card key={task.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          {getStatusIcon(task.status)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{task.title}</h3>
                              <Badge className={getPriorityColor(task.priority)}>
                                {translatePriority(task.priority)}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                            <div className="flex gap-4 text-sm text-gray-500">
                              <span>Apto {task.apartment}</span>
                              <span>•</span>
                              <span>{task.category}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => handleStartTask(task.id)}
                          className="bg-[#0A1E40] hover:bg-[#0f2952] text-white"
                        >
                          Iniciar Tarea
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-[#0A1E40] mb-4" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Tareas Completadas
              </h2>
              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <Card key={task.id} className="p-6 bg-gray-50 opacity-75">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{task.title}</h3>
                          <Badge className={getPriorityColor(task.priority)}>
                            {translatePriority(task.priority)}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">Completada</Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>Apto {task.apartment}</span>
                          <span>•</span>
                          <span>{task.category}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {tasks.length === 0 && (
          <Card className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-[#0A1E40] mb-2">No hay tareas asignadas</h3>
            <p className="text-gray-600">No tienes tareas asignadas en este momento. ¡Vuelve más tarde!</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
