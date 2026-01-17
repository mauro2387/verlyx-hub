import React, { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Mail, 
  Search, 
  Eye, 
  MessageSquare, 
  Calendar,
  User,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdminSuggestionsPageProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function AdminSuggestionsPage({ user, onLogout }: AdminSuggestionsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Datos de ejemplo de sugerencias
  const suggestions = [
    {
      id: 1,
      title: 'Mejora del sistema de reciclaje',
      description: 'Propongo implementar contenedores de reciclaje separados por material en cada piso.',
      category: 'Sostenibilidad',
      status: 'pendiente',
      submittedBy: 'María Rodríguez',
      apartment: 'Apt 1205',
      submittedAt: new Date('2024-11-01'),
      votes: 12
    },
    {
      id: 2,
      title: 'Área de coworking en terraza',
      description: 'Sería excelente tener un espacio de trabajo compartido en la terraza con WiFi.',
      category: 'Espacios Comunes',
      status: 'aprobada',
      submittedBy: 'Carlos Silva',
      apartment: 'Apt 803',
      submittedAt: new Date('2024-10-28'),
      votes: 18
    },
    {
      id: 3,
      title: 'Clases de yoga matutinas',
      description: 'Organizar clases de yoga en la terraza los fines de semana por las mañanas.',
      category: 'Bienestar',
      status: 'implementada',
      submittedBy: 'Ana Martínez',
      apartment: 'Apt 1507',
      submittedAt: new Date('2024-10-25'),
      votes: 25
    },
    {
      id: 4,
      title: 'Sistema de seguridad mejorado',
      description: 'Implementar cámaras de seguridad adicionales en el estacionamiento.',
      category: 'Seguridad',
      status: 'en-revision',
      submittedBy: 'Diego Fernández',
      apartment: 'Apt 601',
      submittedAt: new Date('2024-10-20'),
      votes: 30
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'en-revision': return 'bg-blue-100 text-blue-800';
      case 'aprobada': return 'bg-green-100 text-green-800';
      case 'implementada': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'en-revision': return 'En Revisión';
      case 'aprobada': return 'Aprobada';
      case 'implementada': return 'Implementada';
      default: return status;
    }
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesCategory = selectedCategory === 'all' || suggestion.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || suggestion.status === selectedStatus;
    const matchesSearch = !searchQuery || 
      suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suggestion.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#0A1E40] mb-3">
            💬 Sugerencias de la Comunidad
          </h1>
          <p className="text-gray-600 text-lg">
            Revisa y gestiona las ideas de los propietarios
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {suggestions.filter(s => s.status === 'pendiente').length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </Card>

          <Card className="p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {suggestions.filter(s => s.status === 'en-revision').length}
            </div>
            <div className="text-sm text-gray-600">Revisando</div>
          </Card>

          <Card className="p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {suggestions.filter(s => s.status === 'aprobada').length}
            </div>
            <div className="text-sm text-gray-600">Aprobadas</div>
          </Card>

          <Card className="p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {suggestions.filter(s => s.status === 'implementada').length}
            </div>
            <div className="text-sm text-gray-600">Implementadas</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar sugerencias..."
                className="pl-10 h-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📋 Todas las categorías</SelectItem>
                <SelectItem value="Sostenibilidad">🌱 Sostenibilidad</SelectItem>
                <SelectItem value="Espacios Comunes">🏢 Espacios Comunes</SelectItem>
                <SelectItem value="Bienestar">💪 Bienestar</SelectItem>
                <SelectItem value="Seguridad">🔒 Seguridad</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📝 Todos los estados</SelectItem>
                <SelectItem value="pendiente">⏳ Pendiente</SelectItem>
                <SelectItem value="en-revision">👀 En Revisión</SelectItem>
                <SelectItem value="aprobada">✅ Aprobada</SelectItem>
                <SelectItem value="implementada">🚀 Implementada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Suggestions */}
        <div className="space-y-6">
          {filteredSuggestions.map((suggestion) => (
            <Card key={suggestion.id} className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-[#0A1E40]">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content */}
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-[#0A1E40]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-[#0A1E40] mb-2">
                        {suggestion.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {suggestion.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Badge className={`${getStatusColor(suggestion.status)} border-0`}>
                          {getStatusText(suggestion.status)}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {suggestion.category}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{suggestion.submittedBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <span>{suggestion.apartment}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(suggestion.submittedAt, 'd MMM yyyy', { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{suggestion.votes} votos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row lg:flex-col gap-3 lg:w-auto">
                  <Button 
                    variant="outline" 
                    className="border-[#0A1E40] text-[#0A1E40] hover:bg-[#0A1E40] hover:text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver
                  </Button>
                  
                  {suggestion.status === 'pendiente' && (
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Responder
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredSuggestions.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-500 mb-3">
              No hay sugerencias
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              No se encontraron sugerencias que coincidan con los filtros seleccionados.
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}