import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Brain, Wrench, Users, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AICenterProps {
  user: { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string };
  onLogout: () => void;
}

export default function AICenter({ user, onLogout }: AICenterProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Maintenance AI Data
  const maintenanceIssues = [
    { id: 1, apartment: '1205', issue: 'Aire acondicionado no enfría correctamente', category: 'HVAC', urgency: 'medium', confidence: 94, status: 'assigned', predictedTime: '4-6 horas' },
    { id: 2, apartment: '1507', issue: 'Baja presión de agua en cocina', category: 'Plomería', urgency: 'high', confidence: 97, status: 'in-progress', predictedTime: '2-3 horas' },
    { id: 3, apartment: '0803', issue: 'Cerradura del balcón rígida', category: 'Carpintería', urgency: 'low', confidence: 89, status: 'pending', predictedTime: '1-2 horas' },
    { id: 4, apartment: '0601', issue: 'Luminaria parpadea en sala', category: 'Eléctrica', urgency: 'medium', confidence: 92, status: 'pending', predictedTime: '2-4 horas' },
    { id: 5, apartment: '1108', issue: 'Ruido fuerte en el refrigerador', category: 'Electrodomésticos', urgency: 'low', confidence: 86, status: 'assigned', predictedTime: '3-5 horas' }
  ];

  const categoryDistribution = [
    { name: 'Plomería', value: 28, color: '#3b82f6' },
    { name: 'Eléctrica', value: 19, color: '#f59e0b' },
    { name: 'HVAC', value: 23, color: '#10b981' },
    { name: 'Carpintería', value: 12, color: '#8b5cf6' },
    { name: 'Limpieza', value: 13, color: '#ec4899' },
    { name: 'Otro', value: 5, color: '#6b7280' }
  ];

  const resolutionTimeData = [
    { month: 'Mayo', avgTime: 3.2 },
    { month: 'Jun', avgTime: 2.8 },
    { month: 'Jul', avgTime: 2.5 },
    { month: 'Ago', avgTime: 2.3 },
    { month: 'Sep', avgTime: 2.1 },
    { month: 'Oct', avgTime: 1.9 }
  ];

  const frequencyData = [
    { category: 'Plumbing', frequency: 45 },
    { category: 'Electrical', frequency: 32 },
    { category: 'HVAC', frequency: 38 },
    { category: 'Carpentry', frequency: 18 },
    { category: 'Appliances', frequency: 22 }
  ];

  // Recruitment AI Data
  const cvAnalysis = [
    { id: 1, name: 'Juan García', position: 'Maintenance', experience: 8, match: 95, skills: ['HVAC', 'Plumbing', 'Electrical'], status: 'recommended', availability: 'Immediate' },
    { id: 2, name: 'María Fernández', position: 'Concierge', experience: 5, match: 88, skills: ['Customer Service', 'Languages', 'Reception'], status: 'interview', availability: '2 weeks' },
    { id: 3, name: 'Carlos Rodríguez', position: 'Maintenance', experience: 12, match: 92, skills: ['Carpentry', 'General Maintenance'], status: 'recommended', availability: '1 month' },
    { id: 4, name: 'Ana López', position: 'Cleaning', experience: 3, match: 78, skills: ['Housekeeping', 'Detail Oriented'], status: 'review', availability: 'Immediate' },
    { id: 5, name: 'Diego Silva', position: 'Security', experience: 6, match: 85, skills: ['Security', 'Monitoring', 'First Aid'], status: 'interview', availability: '1 week' }
  ];

  const recruitmentMetrics = [
    { metric: 'Total CVs', value: 47, trend: 'up' },
    { metric: 'High Match (>85%)', value: 12, trend: 'up' },
    { metric: 'Interviews Scheduled', value: 8, trend: 'neutral' },
    { metric: 'Avg Processing Time', value: '2.3 min', trend: 'down' }
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const translateUrgency = (u: string) => {
    switch (u) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return u;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'recommended': return 'bg-green-100 text-green-800';
      case 'interview': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const translateStatus = (s: string) => {
    switch (s) {
      case 'assigned': return 'Asignada';
      case 'in-progress': return 'En Progreso';
      case 'pending': return 'Pendiente';
      case 'recommended': return 'Recomendado';
      case 'interview': return 'Entrevista';
      case 'review': return 'En Revisión';
      default: return s;
    }
  };

  const translateCandidateStatus = (s: string) => {
    switch (s) {
      case 'recommended': return 'Recomendado';
      case 'interview': return 'Entrevista';
      case 'review': return 'En Revisión';
      default: return s;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-[#C9A961]" />
            <h1 className="text-[#0A1E40]" style={{ fontSize: '2rem', fontWeight: 700 }}>
              Centro de IA
            </h1>
          </div>
          <p className="text-gray-600">Información y automatización impulsadas por Inteligencia Artificial</p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="maintenance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-xl">
            <TabsTrigger value="maintenance">
              <Wrench className="w-4 h-4 mr-2" />
              IA de Mantenimiento
            </TabsTrigger>
            <TabsTrigger value="recruitment">
              <Users className="w-4 h-4 mr-2" />
              IA de Reclutamiento
            </TabsTrigger>
          </TabsList>

          {/* Maintenance AI Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-8 h-8 text-[#C9A961]" />
              <Badge className="bg-blue-50 text-blue-700">Activos</Badge>
                </div>
                <div className="text-[#0A1E40]" style={{ fontSize: '1.75rem', fontWeight: 700 }}>23</div>
                <p className="text-gray-600">Incidentes Clasificados</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-[#0A1E40]" style={{ fontSize: '1.75rem', fontWeight: 700 }}>94%</div>
                <p className="text-gray-600">Confianza Promedio</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-blue-500" />
                  <TrendingDown className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-[#0A1E40]" style={{ fontSize: '1.75rem', fontWeight: 700 }}>1.9d</div>
                <p className="text-gray-600">Resolución Promedio</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="w-8 h-8 text-purple-500" />
                  <Badge className="bg-purple-50 text-purple-700">IA</Badge>
                </div>
                <div className="text-[#0A1E40]" style={{ fontSize: '1.75rem', fontWeight: 700 }}>100%</div>
                <p className="text-gray-600">Auto-clasificados</p>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-[#0A1E40] mb-4">Distribución de Incidentes por Categoría</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-[#0A1E40] mb-4">Tendencia del Tiempo de Resolución</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={resolutionTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgTime" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6 lg:col-span-2">
                <h3 className="text-[#0A1E40] mb-4">Frecuencia de Incidentes por Categoría</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frequencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="frequency" fill="#0A1E40" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Issues Table */}
            <Card className="p-6">
              <h3 className="text-[#0A1E40] mb-4">Incidentes Clasificados por IA</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Urgencia</TableHead>
                    <TableHead>Confianza IA</TableHead>
                    <TableHead>Tiempo Est.</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell style={{ fontWeight: 700 }}>{issue.apartment}</TableCell>
                      <TableCell>{issue.issue}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{issue.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getUrgencyColor(issue.urgency)}>
                          {translateUrgency(issue.urgency)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${issue.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm">{issue.confidence}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{issue.predictedTime}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(issue.status)}>
                          {translateStatus(issue.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Recruitment AI Tab */}
          <TabsContent value="recruitment" className="space-y-6">
            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {recruitmentMetrics.map((metric, idx) => (
                <Card key={idx} className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-600">{metric.metric}</p>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <div className="text-[#0A1E40]" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                    {metric.value}
                  </div>
                </Card>
              ))}
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 border-l-4 border-green-500">
                <h4 className="text-[#0A1E40] mb-2" style={{ fontWeight: 700 }}>Candidato Destacado</h4>
                <p className="text-gray-600 text-sm mb-2">Juan García - 95% de coincidencia para el puesto de Mantenimiento</p>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  Programar Entrevista
                </Button>
              </Card>

              <Card className="p-6 border-l-4 border-blue-500">
                <h4 className="text-[#0A1E40] mb-2" style={{ fontWeight: 700 }}>Información de IA</h4>
                <p className="text-gray-600 text-sm">
                  Alta demanda de personal de mantenimiento. Considera revisar los candidatos con más del 85% de coincidencia.
                </p>
              </Card>

              <Card className="p-6 border-l-4 border-yellow-500">
                <h4 className="text-[#0A1E40] mb-2" style={{ fontWeight: 700 }}>Acción Requerida</h4>
                <p className="text-gray-600 text-sm mb-2">8 candidatos pendientes de revisión por más de 3 días</p>
                <Button size="sm" variant="outline" className="border-yellow-500 text-yellow-700">
                  Revisar ahora
                </Button>
              </Card>
            </div>

            {/* CV Analysis Table */}
            <Card className="p-6">
              <h3 className="text-[#0A1E40] mb-4">CVs Analizados por IA</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Experiencia</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Habilidades</TableHead>
                    <TableHead>Disponibilidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cvAnalysis.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell style={{ fontWeight: 700 }}>{candidate.name}</TableCell>
                      <TableCell>{candidate.position}</TableCell>
                      <TableCell>{candidate.experience} años</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                candidate.match >= 90 ? 'bg-green-500' : 
                                candidate.match >= 80 ? 'bg-yellow-500' : 
                                'bg-gray-500'
                              }`}
                              style={{ width: `${candidate.match}%` }}
                            />
                          </div>
                          <span className="text-sm" style={{ fontWeight: 700 }}>{candidate.match}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 2).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.skills.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{candidate.availability}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(candidate.status)}>
                          {translateCandidateStatus(candidate.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Ver CV</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
