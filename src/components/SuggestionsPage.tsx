import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { FileText, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SuggestionsPageProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function SuggestionsPage({ user, onLogout }: SuggestionsPageProps) {
  const [newSuggestion, setNewSuggestion] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });

  const [mySuggestions] = useState([
    {
      id: 1,
      title: 'Mejora en el sistema de iluminación del lobby',
      description: 'Sería beneficioso instalar luces LED con sensor de movimiento en el área del lobby para optimizar el consumo energético.',
      category: 'Infraestructura',
      priority: 'medium',
      status: 'in-review',
      date: '2025-10-28',
      response: null
    },
    {
      id: 2,
      title: 'Implementar sistema de reserva online para amenities',
      description: 'Propongo crear una plataforma digital para reservar la sala de eventos y otros espacios comunes.',
      category: 'Tecnología',
      priority: 'high',
      status: 'approved',
      date: '2025-10-15',
      response: 'Excelente sugerencia. Ya estamos trabajando en la implementación de esta funcionalidad.'
    },
    {
      id: 3,
      title: 'Horarios extendidos para el gimnasio',
      description: 'Solicito evaluar la posibilidad de extender el horario del gimnasio hasta las 23:00 horas.',
      category: 'Servicios',
      priority: 'low',
      status: 'rejected',
      date: '2025-10-10',
      response: 'Tras evaluar costos operativos y normativas del edificio, no es viable en este momento.'
    }
  ]);

  const handleSubmitSuggestion = () => {
    if (!newSuggestion.title.trim() || !newSuggestion.description.trim()) {
      toast.error('Por favor completa el título y la descripción de tu sugerencia.');
      return;
    }

    toast.success('¡Sugerencia enviada exitosamente!', {
      description: 'Tu propuesta ha sido enviada al equipo administrativo para su evaluación.'
    });

    setNewSuggestion({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Aprobada', className: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'in-review':
        return { label: 'En Revisión', className: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'rejected':
        return { label: 'Rechazada', className: 'bg-red-100 text-red-800', icon: AlertCircle };
      default:
        return { label: 'Pendiente', className: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return { label: 'Alta', className: 'bg-red-100 text-red-700' };
      case 'medium':
        return { label: 'Media', className: 'bg-yellow-100 text-yellow-700' };
      case 'low':
        return { label: 'Baja', className: 'bg-blue-100 text-blue-700' };
      default:
        return { label: 'Media', className: 'bg-yellow-100 text-yellow-700' };
    }
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[#0A1E40] mb-2" style={{ fontSize: '2rem', fontWeight: 700 }}>
            Enviar Sugerencias
          </h1>
          <p className="text-gray-600">
            Comparte tus ideas para mejorar la experiencia en nuestro edificio
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario de Nueva Sugerencia */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#0A1E40] rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-[#0A1E40] text-xl font-bold">Nueva Sugerencia</h3>
                <p className="text-gray-600 text-sm">
                  Tu opinión es valiosa para mejorar continuamente nuestros servicios
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#0A1E40] mb-2">
                  Título de la sugerencia
                </label>
                <Input
                  value={newSuggestion.title}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                  placeholder="Describe brevemente tu sugerencia..."
                  className="border border-gray-300 focus:border-[#0A1E40] focus:ring-1 focus:ring-[#0A1E40]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A1E40] mb-2">
                  Descripción detallada
                </label>
                <Textarea
                  value={newSuggestion.description}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                  placeholder="Explica tu sugerencia con detalle, incluyendo beneficios esperados y posible implementación..."
                  rows={5}
                  className="border border-gray-300 focus:border-[#0A1E40] focus:ring-1 focus:ring-[#0A1E40] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0A1E40] mb-2">
                    Categoría
                  </label>
                  <select
                    value={newSuggestion.category}
                    onChange={(e) => setNewSuggestion({ ...newSuggestion, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#0A1E40] focus:ring-1 focus:ring-[#0A1E40] focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="infraestructura">Infraestructura</option>
                    <option value="servicios">Servicios</option>
                    <option value="tecnologia">Tecnología</option>
                    <option value="seguridad">Seguridad</option>
                    <option value="amenities">Amenities</option>
                    <option value="sostenibilidad">Sostenibilidad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A1E40] mb-2">
                    Prioridad
                  </label>
                  <select
                    value={newSuggestion.priority}
                    onChange={(e) => setNewSuggestion({ ...newSuggestion, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-[#0A1E40] focus:ring-1 focus:ring-[#0A1E40] focus:outline-none"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Proceso de evaluación:</strong> Tu sugerencia será revisada por el equipo administrativo. 
                  Recibirás una respuesta dentro de 5-7 días hábiles con el estado de tu propuesta.
                </p>
              </div>

              <Button
                onClick={handleSubmitSuggestion}
                className="w-full bg-[#0A1E40] hover:bg-[#0f2952] text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Sugerencia
              </Button>
            </div>
          </Card>

          {/* Sidebar con estadísticas */}
          <Card className="p-6">
            <h3 className="text-[#0A1E40] text-lg font-bold mb-4">Resumen</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total enviadas</span>
                <span className="font-bold text-[#0A1E40]">{mySuggestions.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">Aprobadas</span>
                <span className="font-bold text-green-700">
                  {mySuggestions.filter(s => s.status === 'approved').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm text-gray-600">En revisión</span>
                <span className="font-bold text-yellow-700">
                  {mySuggestions.filter(s => s.status === 'in-review').length}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-[#0A1E40] mb-3">Categorías populares</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicios</span>
                  <span className="text-[#0A1E40]">34%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Infraestructura</span>
                  <span className="text-[#0A1E40]">28%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tecnología</span>
                  <span className="text-[#0A1E40]">22%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Historial de Sugerencias */}
        <Card className="mt-8 p-6">
          <h3 className="text-[#0A1E40] text-xl font-bold mb-6">Mis Sugerencias Anteriores</h3>
          
          <div className="space-y-4">
            {mySuggestions.map((suggestion) => {
              const statusBadge = getStatusBadge(suggestion.status);
              const priorityBadge = getPriorityBadge(suggestion.priority);
              const StatusIcon = statusBadge.icon;

              return (
                <div key={suggestion.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#0A1E40] mb-1">{suggestion.title}</h4>
                      <p className="text-gray-600 text-sm mb-2">{suggestion.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{suggestion.category}</span>
                        <span>•</span>
                        <span>{suggestion.date}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-4 h-4" />
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <Badge className={priorityBadge.className}>
                        {priorityBadge.label}
                      </Badge>
                    </div>
                  </div>

                  {suggestion.response && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-[#0A1E40]">
                      <p className="text-sm font-medium text-[#0A1E40] mb-1">Respuesta del equipo:</p>
                      <p className="text-sm text-gray-700">{suggestion.response}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}