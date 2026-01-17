import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  Users,
  Search,
  Plus,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  Calendar,
  Settings,
  Wrench
} from 'lucide-react';

interface StaffMember {
  id: number;
  name: string;
  role: string;
    status: 'activo' | 'ocupado' | 'desconectado';
  shift: string;
  tasksCompleted: number;
  efficiency: number;
}

const staffMembers: StaffMember[] = [
  {
    id: 1,
    name: "Juan Pérez",
    role: "Mantenimiento",
    status: "activo",
    shift: "Mañana",
    tasksCompleted: 145,
    efficiency: 92
  },
  {
    id: 2,
    name: "Carlos Rodríguez",
    role: "Mantenimiento",
    status: "ocupado",
    shift: "Tarde",
    tasksCompleted: 89,
    efficiency: 88
  },
  {
    id: 3,
    name: "Miguel Torres",
    role: "Mantenimiento",
    status: "activo",
    shift: "Mañana",
    tasksCompleted: 123,
    efficiency: 95
  },
  {
    id: 4,
    name: "Roberto Silva",
    role: "Mantenimiento",
    status: "desconectado",
    shift: "Noche",
    tasksCompleted: 67,
    efficiency: 85
  }
];

const AdminStaffManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'activo': return 'bg-green-100 text-green-800';
        case 'ocupado': return 'bg-yellow-100 text-yellow-800';
        case 'desconectado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Mantenimiento': return <Wrench className="w-4 h-4" />;
      default: return <Wrench className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0A1E40]">Gestión de Personal de Mantenimiento</h2>
            <p className="text-gray-600">Administre el equipo de mantenimiento y asigne tareas</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[#0A1E40]">
                  <UserPlus className="w-4 h-4" />
                  Nuevo Miembro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Miembro del Personal</DialogTitle>
                </DialogHeader>
                {/* Formulario de nuevo miembro */}
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
                    <Input placeholder="Nombre y Apellido" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rol</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Mantenimiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Turno</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar turno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Mañana</SelectItem>
                        <SelectItem value="evening">Tarde</SelectItem>
                        <SelectItem value="night">Noche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-[#0A1E40]">Agregar Miembro</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="schedule">Horarios</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0A1E40]">{staffMembers.length}</p>
                      <p className="text-sm text-gray-600">Total Personal</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0A1E40]">
                          {staffMembers.filter(m => m.status === 'activo').length}
                      </p>
                      <p className="text-sm text-gray-600">Activos</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0A1E40]">
                          {staffMembers.filter(m => m.status === 'ocupado').length}
                      </p>
                      <p className="text-sm text-gray-600">Ocupados</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0A1E40]">2</p>
                      <p className="text-sm text-gray-600">Alertas</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Filters and Search */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nombre..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los roles</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="ocupado">Ocupado</SelectItem>
                        <SelectItem value="desconectado">Desconectado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Staff Table */}
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Miembro</TableHead>
                      <TableHead className="font-semibold">Rol</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Turno</TableHead>
                      <TableHead className="font-semibold text-right">Tareas Completadas</TableHead>
                      <TableHead className="font-semibold text-right">Eficiencia</TableHead>
                      <TableHead className="font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers.map((member) => (
                      <TableRow key={member.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-[#0A1E40]">{member.name}</p>
                              <p className="text-sm text-gray-500">ID: {member.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            <span>{member.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{member.shift}</TableCell>
                        <TableCell className="text-right">{member.tasksCompleted}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600">{member.efficiency}%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Calendar className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2 p-6">
                <h3 className="font-semibold text-[#0A1E40] mb-4">Horarios de la Semana</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-sm font-medium text-gray-600">Técnico</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-600">Lun</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-600">Mar</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-600">Mié</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-600">Jue</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-600">Vie</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-600">Sáb</th>
                        <th className="text-center p-2 text-sm font-medium text-gray-600">Dom</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-sm">Juan Pérez</td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">Descanso</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">Descanso</span>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-sm">Carlos Rodríguez</td>
                        <td className="p-2 text-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">14-22</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">14-22</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">14-22</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">14-22</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">14-22</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">Descanso</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">Descanso</span>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-sm">Miguel Torres</td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">Descanso</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">22-06</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">22-06</span>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-sm">Roberto Silva</td>
                        <td className="p-2 text-center">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">22-06</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">22-06</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">22-06</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">22-06</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">22-06</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">Descanso</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">Descanso</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div className="mt-4 flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">06-14</span>
                      <span className="text-gray-600">Turno Mañana</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">14-22</span>
                      <span className="text-gray-600">Turno Tarde</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">22-06</span>
                      <span className="text-gray-600">Turno Noche</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-[#0A1E40] mb-4">Próximos Turnos</h3>
                <div className="space-y-4">
                  {staffMembers.map((member) => (
                    <div key={member.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#0A1E40]">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.role}</p>
                        </div>
                        <Badge>{member.shift}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold text-[#0A1E40] mb-4">Tareas Completadas</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Gráfico de tareas completadas por miembro</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total de Tareas</p>
                    <p className="font-semibold text-[#0A1E40]">424 este mes</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tiempo Promedio</p>
                    <p className="font-semibold text-[#0A1E40]">45 min</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-[#0A1E40] mb-4">Eficiencia del Equipo</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Gráfico de eficiencia por técnico</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Eficiencia promedio</p>
                    <p className="font-semibold text-green-600">90%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mejor técnico</p>
                    <p className="font-semibold text-[#0A1E40]">Miguel Torres (95%)</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminStaffManagement;