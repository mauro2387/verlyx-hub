'use client';

import { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Card, Button, Input, Modal, Badge } from '@/components/ui';
import { enterpriseHelpers } from '@/lib/enterprise-helpers';
import { useAuthStore, useCompanyStore } from '@/lib/store';
import { CompanyBadge, CompanySelector } from '@/components/ui';
import { 
  Users, Plus, Search, Filter, UserPlus, Briefcase, 
  Calendar, DollarSign, Clock, Mail, Phone, MoreVertical,
  Edit, Trash2, UserCheck, UserX, Building2, Star
} from 'lucide-react';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  member_type: 'partner' | 'employee' | 'contractor' | 'freelancer' | 'intern';
  contract_type: 'permanent' | 'temporary' | 'project' | 'hourly' | 'commission';
  status: 'active' | 'inactive' | 'pending' | 'on_leave' | 'terminated';
  job_title?: string;
  department?: string;
  start_date?: string;
  end_date?: string;
  salary?: number;
  salary_type?: string;
  hourly_rate?: number;
  commission_percent?: number;
  notes?: string;
  created_at: string;
}

const memberTypeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  partner: { label: 'Socio', color: 'bg-purple-100 text-purple-800', icon: <Star className="w-3 h-3" /> },
  employee: { label: 'Empleado', color: 'bg-blue-100 text-blue-800', icon: <Briefcase className="w-3 h-3" /> },
  contractor: { label: 'Contratista', color: 'bg-orange-100 text-orange-800', icon: <Building2 className="w-3 h-3" /> },
  freelancer: { label: 'Freelancer', color: 'bg-green-100 text-green-800', icon: <Users className="w-3 h-3" /> },
  intern: { label: 'Practicante', color: 'bg-pink-100 text-pink-800', icon: <UserPlus className="w-3 h-3" /> },
};

const contractTypeLabels: Record<string, string> = {
  permanent: 'Permanente',
  temporary: 'Temporal',
  project: 'Por Proyecto',
  hourly: 'Por Hora',
  commission: 'Por Comisión',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactivo', color: 'bg-gray-100 text-gray-800' },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  on_leave: { label: 'De Permiso', color: 'bg-blue-100 text-blue-800' },
  terminated: { label: 'Terminado', color: 'bg-red-100 text-red-800' },
};

export default function TeamPage() {
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();
  const [formCompanyId, setFormCompanyId] = useState(selectedCompanyId || '');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    memberType: 'employee' as TeamMember['member_type'],
    contractType: 'permanent' as TeamMember['contract_type'],
    jobTitle: '',
    department: '',
    startDate: '',
    endDate: '',
    salary: '',
    salaryType: 'monthly',
    hourlyRate: '',
    commissionPercent: '',
    notes: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadMembers();
    }
  }, [user?.id]);

  const loadMembers = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await enterpriseHelpers.team.getAll(user.id);
    if (!error && data) {
      setMembers(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    const memberData = {
      userId: user.id,
      myCompanyId: formCompanyId || selectedCompanyId || undefined,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      memberType: form.memberType,
      contractType: form.contractType,
      jobTitle: form.jobTitle || undefined,
      department: form.department || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      salary: form.salary ? parseFloat(form.salary) : undefined,
      salaryType: form.salaryType,
      hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
      commissionPercent: form.commissionPercent ? parseFloat(form.commissionPercent) : undefined,
      notes: form.notes || undefined,
    };

    if (editingMember) {
      const { error } = await enterpriseHelpers.team.update(editingMember.id, memberData);
      if (!error) {
        loadMembers();
        closeModal();
      }
    } else {
      const { error } = await enterpriseHelpers.team.create(memberData);
      if (!error) {
        loadMembers();
        closeModal();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este miembro del equipo?')) return;
    const { error } = await enterpriseHelpers.team.delete(id);
    if (!error) {
      loadMembers();
    }
  };

  const handleStatusChange = async (id: string, status: TeamMember['status']) => {
    const { error } = await enterpriseHelpers.team.updateStatus(id, status);
    if (!error) {
      loadMembers();
    }
    setShowMenu(null);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setForm({
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      phone: member.phone || '',
      memberType: member.member_type,
      contractType: member.contract_type,
      jobTitle: member.job_title || '',
      department: member.department || '',
      startDate: member.start_date || '',
      endDate: member.end_date || '',
      salary: member.salary?.toString() || '',
      salaryType: member.salary_type || 'monthly',
      hourlyRate: member.hourly_rate?.toString() || '',
      commissionPercent: member.commission_percent?.toString() || '',
      notes: member.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      memberType: 'employee',
      contractType: 'permanent',
      jobTitle: '',
      department: '',
      startDate: '',
      endDate: '',
      salary: '',
      salaryType: 'monthly',
      hourlyRate: '',
      commissionPercent: '',
      notes: '',
    });
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || member.member_type === filterType;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Stats
  const stats = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    partners: members.filter(m => m.member_type === 'partner').length,
    temporary: members.filter(m => m.contract_type === 'temporary').length,
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title="Equipo"
          description="Gestiona socios, empleados y colaboradores"
          actions={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Miembro
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Activos</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Socios</p>
                <p className="text-2xl font-bold">{stats.partners}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Temporales</p>
                <p className="text-2xl font-bold">{stats.temporary}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, email o puesto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="all">Todos los tipos</option>
              <option value="partner">Socios</option>
              <option value="employee">Empleados</option>
              <option value="contractor">Contratistas</option>
              <option value="freelancer">Freelancers</option>
              <option value="intern">Practicantes</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="pending">Pendientes</option>
              <option value="on_leave">De Permiso</option>
              <option value="terminated">Terminados</option>
            </select>
          </div>
        </Card>

        {/* Team List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <Card className="col-span-full p-8 text-center text-gray-500">
              Cargando equipo...
            </Card>
          ) : filteredMembers.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay miembros del equipo</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar primer miembro
              </Button>
            </Card>
          ) : (
            filteredMembers.map((member) => (
              <Card key={member.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {member.first_name[0]}{member.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold">{member.first_name} {member.last_name}</h3>
                      <CompanyBadge companyId={(member as any).my_company_id} />
                      <p className="text-sm text-gray-500">{member.job_title || 'Sin puesto'}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(showMenu === member.id ? null : member.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                    {showMenu === member.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => { openEditModal(member); setShowMenu(null); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" /> Editar
                        </button>
                        {member.status === 'active' ? (
                          <button
                            onClick={() => handleStatusChange(member.id, 'inactive')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <UserX className="w-4 h-4" /> Desactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(member.id, 'active')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <UserCheck className="w-4 h-4" /> Activar
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(member.id, 'on_leave')}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Calendar className="w-4 h-4" /> Marcar Permiso
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => { handleDelete(member.id); setShowMenu(null); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${memberTypeLabels[member.member_type].color}`}>
                    {memberTypeLabels[member.member_type].icon}
                    {memberTypeLabels[member.member_type].label}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[member.status].color}`}>
                    {statusLabels[member.status].label}
                  </span>
                  {member.contract_type === 'temporary' && (
                    <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      Temporal
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Desde {new Date(member.start_date).toLocaleDateString()}
                        {member.end_date && ` hasta ${new Date(member.end_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                  {(member.salary || member.hourly_rate) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {member.salary && `$${member.salary.toLocaleString()} / ${member.salary_type === 'monthly' ? 'mes' : 'año'}`}
                        {member.hourly_rate && `$${member.hourly_rate}/hr`}
                        {member.commission_percent && ` + ${member.commission_percent}% comisión`}
                      </span>
                    </div>
                  )}
                </div>

                {member.department && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-xs text-gray-500">
                      <Building2 className="w-3 h-3 inline mr-1" />
                      {member.department}
                    </span>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingMember ? 'Editar Miembro' : 'Agregar Miembro del Equipo'}
          size="lg"
        >
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab(0)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 0 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Información
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 1 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Contrato
              </button>
              <button
                onClick={() => setActiveTab(2)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 2 ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Compensación
              </button>
            </div>

            {/* Tab: Información */}
            {activeTab === 0 && (
              <div className="space-y-4">
                <CompanySelector
                  value={formCompanyId || selectedCompanyId || ''}
                  onChange={(id) => setFormCompanyId(id)}
                  label="Empresa"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre *</label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Apellido *</label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Apellido"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Miembro *</label>
                    <select
                      value={form.memberType}
                      onChange={(e) => setForm({ ...form, memberType: e.target.value as TeamMember['member_type'] })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="partner">Socio</option>
                      <option value="employee">Empleado</option>
                      <option value="contractor">Contratista</option>
                      <option value="freelancer">Freelancer</option>
                      <option value="intern">Practicante</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Departamento</label>
                    <Input
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="Ej: Desarrollo, Ventas"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Puesto</label>
                  <Input
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    placeholder="Ej: Desarrollador Senior"
                  />
                </div>
              </div>
            )}

            {/* Tab: Contrato */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Contrato *</label>
                  <select
                    value={form.contractType}
                    onChange={(e) => setForm({ ...form, contractType: e.target.value as TeamMember['contract_type'] })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="permanent">Permanente / Indefinido</option>
                    <option value="temporary">Temporal</option>
                    <option value="project">Por Proyecto</option>
                    <option value="hourly">Por Hora</option>
                    <option value="commission">Por Comisión</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Fecha de Fin
                      {form.contractType !== 'permanent' && <span className="text-red-500"> *</span>}
                    </label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      disabled={form.contractType === 'permanent'}
                    />
                    {form.contractType === 'permanent' && (
                      <p className="text-xs text-gray-500 mt-1">No aplica para contratos permanentes</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                    rows={3}
                    placeholder="Notas adicionales sobre el contrato..."
                  />
                </div>
              </div>
            )}

            {/* Tab: Compensación */}
            {activeTab === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Salario</label>
                    <Input
                      type="number"
                      value={form.salary}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Salario</label>
                    <select
                      value={form.salaryType}
                      onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="annual">Anual</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tarifa por Hora</label>
                    <Input
                      type="number"
                      value={form.hourlyRate}
                      onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Para freelancers o trabajo por hora</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Comisión (%)</label>
                    <Input
                      type="number"
                      value={form.commissionPercent}
                      onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Para socios o ventas</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Resumen de Compensación</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    {form.salary && (
                      <li>• Salario: ${parseFloat(form.salary).toLocaleString()} / {form.salaryType === 'monthly' ? 'mes' : 'año'}</li>
                    )}
                    {form.hourlyRate && (
                      <li>• Tarifa por hora: ${parseFloat(form.hourlyRate).toLocaleString()}</li>
                    )}
                    {form.commissionPercent && (
                      <li>• Comisión: {form.commissionPercent}%</li>
                    )}
                    {!form.salary && !form.hourlyRate && !form.commissionPercent && (
                      <li className="text-gray-400">No se ha definido compensación</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.firstName || !form.lastName || !form.email}
              >
                {editingMember ? 'Guardar Cambios' : 'Agregar Miembro'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
