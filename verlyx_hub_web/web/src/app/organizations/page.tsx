'use client';

import { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Input, Select, Textarea, Modal, Badge, EmptyState, SearchInput, ConfirmDialog } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { useCompanyStore } from '@/lib/store';

interface Organization {
  id: string;
  my_company_id: string;
  client_id: string;
  parent_organization_id?: string | null;
  name: string;
  code?: string | null;
  type: 'HEADQUARTERS' | 'BRANCH' | 'DEPARTMENT' | 'SUBSIDIARY';
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  employees_count?: number | null;
  size?: string | null;
  tags?: string[] | null;
  is_active: boolean;
  children?: Organization[];
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
}

const demoOrganizations: Organization[] = [
  {
    id: 'demo-1',
    my_company_id: 'demo-company-1',
    client_id: 'demo-client-1',
    name: 'TechCorp Global HQ',
    code: 'TCG-HQ',
    type: 'HEADQUARTERS',
    description: 'Sede central de operaciones globales. Coordina todas las subsidiarias y sucursales.',
    address: 'Av. Libertador 1234',
    city: 'Buenos Aires',
    state: 'CABA',
    country: 'Argentina',
    postal_code: 'C1425',
    phone: '+54 11 4567-8900',
    email: 'hq@techcorp.com',
    website: 'https://techcorp.com',
    primary_contact_name: 'María González',
    primary_contact_email: 'maria.gonzalez@techcorp.com',
    primary_contact_phone: '+54 11 4567-8901',
    employees_count: 500,
    size: 'Grande (250+ empleados)',
    tags: ['Tecnología', 'Corporativo', 'Internacional'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    my_company_id: 'demo-company-1',
    client_id: 'demo-client-1',
    parent_organization_id: 'demo-1',
    name: 'TechCorp LATAM',
    code: 'TCG-LATAM',
    type: 'SUBSIDIARY',
    description: 'División regional de Latinoamérica',
    address: 'Calle 45 #678',
    city: 'Santiago',
    state: 'Metropolitana',
    country: 'Chile',
    phone: '+56 2 9876-5432',
    email: 'latam@techcorp.com',
    primary_contact_name: 'Carlos Méndez',
    primary_contact_email: 'carlos.mendez@techcorp.com',
    employees_count: 120,
    size: 'Mediana (50-250 empleados)',
    tags: ['LATAM', 'Regional'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    my_company_id: 'demo-company-1',
    client_id: 'demo-client-1',
    parent_organization_id: 'demo-1',
    name: 'Sucursal Córdoba',
    code: 'TCG-CBA',
    type: 'BRANCH',
    description: 'Sucursal regional de Córdoba',
    address: 'Av. Colón 890',
    city: 'Córdoba',
    state: 'Córdoba',
    country: 'Argentina',
    phone: '+54 351 456-7890',
    email: 'cordoba@techcorp.com',
    primary_contact_name: 'Laura Fernández',
    employees_count: 45,
    size: 'Pequeña (10-50 empleados)',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    my_company_id: 'demo-company-1',
    client_id: 'demo-client-1',
    parent_organization_id: 'demo-2',
    name: 'Departamento de Ventas',
    code: 'TCG-SALES',
    type: 'DEPARTMENT',
    description: 'Equipo de ventas LATAM',
    employees_count: 30,
    size: 'Pequeña (10-50 empleados)',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    my_company_id: 'demo-company-1',
    client_id: 'demo-client-2',
    name: 'Innovatech Solutions',
    code: 'ITS-HQ',
    type: 'HEADQUARTERS',
    description: 'Empresa de consultoría tecnológica especializada en transformación digital',
    address: 'Av. Santa Fe 2456',
    city: 'Buenos Aires',
    state: 'CABA',
    country: 'Argentina',
    phone: '+54 11 5678-9012',
    email: 'info@innovatech.com',
    website: 'https://innovatech.com',
    primary_contact_name: 'Roberto Silva',
    employees_count: 85,
    size: 'Mediana (50-250 empleados)',
    tags: ['Consultoría', 'Software'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const orgTypeConfig = {
  HEADQUARTERS: { 
    label: 'Sede Central', 
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300', 
    icon: '🏢', 
    desc: 'Oficina principal que coordina todas las operaciones' 
  },
  SUBSIDIARY: { 
    label: 'Subsidiaria', 
    color: 'bg-blue-100 text-blue-700 border-blue-300', 
    icon: '🏬', 
    desc: 'Empresa filial con autonomía legal' 
  },
  BRANCH: { 
    label: 'Sucursal', 
    color: 'bg-green-100 text-green-700 border-green-300', 
    icon: '🏪', 
    desc: 'Oficina regional o local' 
  },
  DEPARTMENT: { 
    label: 'Departamento', 
    color: 'bg-purple-100 text-purple-700 border-purple-300', 
    icon: '📁', 
    desc: 'División o área interna' 
  },
};

const sizeOptions = [
  { value: 'Micro (1-10 empleados)', label: 'Micro (1-10 empleados)' },
  { value: 'Pequeña (10-50 empleados)', label: 'Pequeña (10-50 empleados)' },
  { value: 'Mediana (50-250 empleados)', label: 'Mediana (50-250 empleados)' },
  { value: 'Grande (250+ empleados)', label: 'Grande (250+ empleados)' },
];

export default function OrganizationsPage() {
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();
  const isDemoMode = user?.id?.startsWith('demo') || false;
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'list' | 'grid'>('hierarchy');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [selectedOrgForDetail, setSelectedOrgForDetail] = useState<Organization | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showInfoCard, setShowInfoCard] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'BRANCH' as Organization['type'],
    client_id: '',
    parent_organization_id: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: 'Argentina',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    employees_count: '',
    size: '',
    tags: '',
  });

  useEffect(() => {
    if (isDemoMode) {
      setOrganizations(demoOrganizations);
      setClients([
        { id: 'demo-client-1', name: 'TechCorp Global' },
        { id: 'demo-client-2', name: 'Innovatech Solutions' },
      ]);
      setLoading(false);
    } else {
      loadData();
    }
  }, [selectedCompanyId, isDemoMode]);

  const loadData = async () => {
    if (!selectedCompanyId || isDemoMode) return;
    
    setLoading(true);
    try {
      // Load organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('client_organizations')
        .select('*')
        .eq('my_company_id', selectedCompanyId)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;
      setOrganizations(orgsData || []);

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('my_company_id', selectedCompanyId)
        .order('name');

      if (clientsError) throw clientsError;
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (orgs: Organization[]): Organization[] => {
    const orgMap = new Map<string, Organization>();
    const roots: Organization[] = [];

    // First pass: create map
    orgs.forEach(org => {
      orgMap.set(org.id, { ...org, children: [] });
    });

    // Second pass: build hierarchy
    orgs.forEach(org => {
      const orgWithChildren = orgMap.get(org.id)!;
      if (org.parent_organization_id) {
        const parent = orgMap.get(org.parent_organization_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(orgWithChildren);
        } else {
          roots.push(orgWithChildren);
        }
      } else {
        roots.push(orgWithChildren);
      }
    });

    return roots;
  };

  const flattenOrgs = (orgs: Organization[]): Organization[] => {
    return orgs.reduce((acc: Organization[], org) => {
      acc.push(org);
      if (org.children && org.children.length > 0) {
        acc.push(...flattenOrgs(org.children));
      }
      return acc;
    }, []);
  };

  const allOrgs = flattenOrgs(buildHierarchy(organizations));

  const filteredOrgs = allOrgs.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || org.type === typeFilter;
    const matchesClient = clientFilter === 'all' || org.client_id === clientFilter;
    return matchesSearch && matchesType && matchesClient;
  });

  const hierarchyOrgs = buildHierarchy(filteredOrgs);

  const stats = {
    total: allOrgs.length,
    headquarters: allOrgs.filter(o => o.type === 'HEADQUARTERS').length,
    subsidiaries: allOrgs.filter(o => o.type === 'SUBSIDIARY').length,
    branches: allOrgs.filter(o => o.type === 'BRANCH').length,
    departments: allOrgs.filter(o => o.type === 'DEPARTMENT').length,
    active: allOrgs.filter(o => o.is_active).length,
    totalEmployees: allOrgs.reduce((sum, o) => sum + (o.employees_count || 0), 0),
  };

  const handleOpenModal = (org?: Organization) => {
    if (isDemoMode) {
      alert('Esta funcionalidad está deshabilitada en modo demostración');
      return;
    }

    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        code: org.code || '',
        type: org.type,
        client_id: org.client_id,
        parent_organization_id: org.parent_organization_id || '',
        description: org.description || '',
        address: org.address || '',
        city: org.city || '',
        state: org.state || '',
        country: org.country || 'Argentina',
        postal_code: org.postal_code || '',
        phone: org.phone || '',
        email: org.email || '',
        website: org.website || '',
        primary_contact_name: org.primary_contact_name || '',
        primary_contact_email: org.primary_contact_email || '',
        primary_contact_phone: org.primary_contact_phone || '',
        employees_count: org.employees_count?.toString() || '',
        size: org.size || '',
        tags: org.tags?.join(', ') || '',
      });
    } else {
      setEditingOrg(null);
      setFormData({
        name: '',
        code: '',
        type: 'BRANCH',
        client_id: clients[0]?.id || '',
        parent_organization_id: '',
        description: '',
        address: '',
        city: '',
        state: '',
        country: 'Argentina',
        postal_code: '',
        phone: '',
        email: '',
        website: '',
        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',
        employees_count: '',
        size: '',
        tags: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode || !selectedCompanyId) return;

    try {
      const orgData = {
        my_company_id: selectedCompanyId,
        name: formData.name,
        code: formData.code || null,
        type: formData.type,
        client_id: formData.client_id,
        parent_organization_id: formData.parent_organization_id || null,
        description: formData.description || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        postal_code: formData.postal_code || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        primary_contact_name: formData.primary_contact_name || null,
        primary_contact_email: formData.primary_contact_email || null,
        primary_contact_phone: formData.primary_contact_phone || null,
        employees_count: formData.employees_count ? parseInt(formData.employees_count) : null,
        size: formData.size || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        updated_at: new Date().toISOString(),
      };

      if (editingOrg) {
        const { error } = await supabase
          .from('client_organizations')
          .update(orgData)
          .eq('id', editingOrg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_organizations')
          .insert([{ ...orgData, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving organization:', error);
      alert('Error al guardar la organización');
    }
  };

  const handleDelete = async () => {
    if (isDemoMode || !deletingOrg) return;

    try {
      const { error } = await supabase
        .from('client_organizations')
        .delete()
        .eq('id', deletingOrg.id);

      if (error) throw error;
      
      await loadData();
      setIsDeleteDialogOpen(false);
      setDeletingOrg(null);
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Error al eliminar la organización');
    }
  };

  const handleToggleActive = async (org: Organization) => {
    if (isDemoMode) return;

    try {
      const { error } = await supabase
        .from('client_organizations')
        .update({ is_active: !org.is_active, updated_at: new Date().toISOString() })
        .eq('id', org.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling active status:', error);
    }
  };

  const openDetailModal = (org: Organization) => {
    setSelectedOrgForDetail(org);
    setIsDetailModalOpen(true);
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'N/A';
  };

  const renderOrgNode = (org: Organization, level: number = 0) => {
    const config = orgTypeConfig[org.type];
    const hasChildren = org.children && org.children.length > 0;
    
    return (
      <div key={org.id} className="mb-2">
        <div 
          className={`flex items-center justify-between p-4 bg-white border-2 rounded-lg hover:shadow-md transition-all cursor-pointer ${
            !org.is_active ? 'opacity-50 bg-gray-50' : ''
          }`}
          style={{ marginLeft: `${level * 32}px` }}
          onClick={() => openDetailModal(org)}
        >
          <div className="flex items-center gap-4 flex-1">
            {level > 0 && (
              <div className="w-8 h-8 flex items-center justify-center text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
            <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl ${config.color}`}>
              {config.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-gray-900 text-lg">{org.name}</h3>
                {org.code && (
                  <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded">
                    {org.code}
                  </span>
                )}
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
                  {config.label}
                </span>
                {!org.is_active && (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                    Inactiva
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>👤 {getClientName(org.client_id)}</span>
                {org.city && <span>📍 {org.city}, {org.country}</span>}
                {org.employees_count && <span>👥 {org.employees_count} empleados</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleOpenModal(org)}
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setDeletingOrg(org);
                setIsDeleteDialogOpen(true);
              }}
              title="Eliminar"
            >
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
        {hasChildren && (
          <div className="mt-2">
            {org.children!.map(child => renderOrgNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando organizaciones...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {isDemoMode && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-yellow-900">Modo Demostración</p>
              <p className="text-sm text-yellow-700">Estás viendo datos de ejemplo. Las funciones de edición están deshabilitadas.</p>
            </div>
          </div>
        </div>
      )}

      {showInfoCard && allOrgs.length === 0 && !isDemoMode && (
        <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🏢</div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Qué son las Organizaciones?</h3>
                    <p className="text-gray-700 mb-4">
                      Las organizaciones te permiten estructurar la arquitectura corporativa de tus clientes. 
                      Puedes modelar desde sedes centrales hasta sucursales, subsidiarias y departamentos internos.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {Object.entries(orgTypeConfig).map(([key, config]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-2xl">{config.icon}</span>
                          <div>
                            <p className="font-medium text-gray-900">{config.label}</p>
                            <p className="text-sm text-gray-600">{config.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Casos de uso:</strong> Gestionar múltiples ubicaciones, visualizar estructura organizacional, 
                      asignar proyectos y tareas a ubicaciones específicas, y realizar seguimiento por región.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInfoCard(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PageHeader
        title="Estructura Organizacional"
        description="Gestiona la arquitectura corporativa y sedes de tus clientes"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                const modes: Array<'hierarchy' | 'list' | 'grid'> = ['hierarchy', 'list', 'grid'];
                const currentIndex = modes.indexOf(viewMode);
                const nextMode = modes[(currentIndex + 1) % modes.length];
                setViewMode(nextMode);
              }}
            >
              {viewMode === 'hierarchy' && '🌳 Vista Jerárquica'}
              {viewMode === 'list' && '📋 Vista Lista'}
              {viewMode === 'grid' && '🔲 Vista Cuadrícula'}
            </Button>
            <Button onClick={() => handleOpenModal()}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Organización
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-3xl font-bold text-gray-700">{stats.total}</div>
          <div className="text-sm text-gray-600 font-medium">Total</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100">
          <div className="text-3xl font-bold text-indigo-600">🏢 {stats.headquarters}</div>
          <div className="text-sm text-indigo-700 font-medium">Sedes</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-3xl font-bold text-blue-600">🏬 {stats.subsidiaries}</div>
          <div className="text-sm text-blue-700 font-medium">Subsidiarias</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-3xl font-bold text-green-600">🏪 {stats.branches}</div>
          <div className="text-sm text-green-700 font-medium">Sucursales</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-3xl font-bold text-purple-600">📁 {stats.departments}</div>
          <div className="text-sm text-purple-700 font-medium">Departamentos</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <div className="text-3xl font-bold text-emerald-600">{stats.active}</div>
          <div className="text-sm text-emerald-700 font-medium">Activas</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="text-3xl font-bold text-orange-600">👥 {stats.totalEmployees}</div>
          <div className="text-sm text-orange-700 font-medium">Empleados</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SearchInput
          placeholder="Buscar organizaciones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Todos los tipos' },
            { value: 'HEADQUARTERS', label: '🏢 Sedes Centrales' },
            { value: 'SUBSIDIARY', label: '🏬 Subsidiarias' },
            { value: 'BRANCH', label: '🏪 Sucursales' },
            { value: 'DEPARTMENT', label: '📁 Departamentos' },
          ]}
        />
        <Select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Todos los clientes' },
            ...clients.map(c => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      {/* Content */}
      {filteredOrgs.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No hay organizaciones"
          description={searchTerm || typeFilter !== 'all' || clientFilter !== 'all' 
            ? "No se encontraron organizaciones con los filtros aplicados" 
            : "Comienza creando tu primera organización para estructurar tus clientes"}
          action={
            !isDemoMode && (
              <Button onClick={() => handleOpenModal()}>
                Crear Primera Organización
              </Button>
            )
          }
        />
      ) : viewMode === 'hierarchy' ? (
        <div className="space-y-2">
          {hierarchyOrgs.map(org => renderOrgNode(org))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filteredOrgs.map((org) => {
            const config = orgTypeConfig[org.type];
            return (
              <Card key={org.id} hoverable onClick={() => openDetailModal(org)} className="cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900">{org.name}</h3>
                          {org.code && (
                            <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded">
                              {org.code}
                            </span>
                          )}
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>👤 {getClientName(org.client_id)}</span>
                          {org.city && <span>📍 {org.city}, {org.country}</span>}
                          {org.employees_count && <span>👥 {org.employees_count} empleados</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(org)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => {
            const config = orgTypeConfig[org.type];
            return (
              <Card key={org.id} hoverable onClick={() => openDetailModal(org)} className="cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center text-4xl mb-4 ${config.color}`}>
                      {config.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">{org.name}</h3>
                    {org.code && (
                      <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded mb-2">
                        {org.code}
                      </span>
                    )}
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${config.color} mb-4`}>
                      {config.label}
                    </span>
                    <div className="w-full space-y-2 text-sm text-gray-500">
                      <div>👤 {getClientName(org.client_id)}</div>
                      {org.city && <div>📍 {org.city}, {org.country}</div>}
                      {org.employees_count && <div>👥 {org.employees_count} empleados</div>}
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t w-full" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenModal(org)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        title="Detalles de Organización"
        size="large"
      >
        {selectedOrgForDetail && (
          <div className="space-y-6">
            <div className="flex items-start gap-6 pb-6 border-b">
              <div className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center text-4xl ${orgTypeConfig[selectedOrgForDetail.type].color}`}>
                {orgTypeConfig[selectedOrgForDetail.type].icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedOrgForDetail.name}</h2>
                  {selectedOrgForDetail.code && (
                    <span className="px-3 py-1 text-sm font-mono bg-gray-100 text-gray-600 rounded">
                      {selectedOrgForDetail.code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${orgTypeConfig[selectedOrgForDetail.type].color}`}>
                    {orgTypeConfig[selectedOrgForDetail.type].label}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${selectedOrgForDetail.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {selectedOrgForDetail.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {selectedOrgForDetail.description && (
                  <p className="text-gray-600">{selectedOrgForDetail.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Información General</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente:</span>
                    <span className="font-medium">{getClientName(selectedOrgForDetail.client_id)}</span>
                  </div>
                  {selectedOrgForDetail.employees_count && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Empleados:</span>
                      <span className="font-medium">{selectedOrgForDetail.employees_count}</span>
                    </div>
                  )}
                  {selectedOrgForDetail.size && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tamaño:</span>
                      <span className="font-medium">{selectedOrgForDetail.size}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Ubicación</h3>
                <div className="space-y-2 text-sm">
                  {selectedOrgForDetail.address && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dirección:</span>
                      <span className="font-medium text-right">{selectedOrgForDetail.address}</span>
                    </div>
                  )}
                  {selectedOrgForDetail.city && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ciudad:</span>
                      <span className="font-medium">{selectedOrgForDetail.city}</span>
                    </div>
                  )}
                  {selectedOrgForDetail.state && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Provincia:</span>
                      <span className="font-medium">{selectedOrgForDetail.state}</span>
                    </div>
                  )}
                  {selectedOrgForDetail.country && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">País:</span>
                      <span className="font-medium">{selectedOrgForDetail.country}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Contacto</h3>
                <div className="space-y-2 text-sm">
                  {selectedOrgForDetail.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Teléfono:</span>
                      <span className="font-medium">{selectedOrgForDetail.phone}</span>
                    </div>
                  )}
                  {selectedOrgForDetail.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{selectedOrgForDetail.email}</span>
                    </div>
                  )}
                  {selectedOrgForDetail.website && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Website:</span>
                      <a href={selectedOrgForDetail.website} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
                        Visitar
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrgForDetail.primary_contact_name && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contacto Principal</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nombre:</span>
                      <span className="font-medium">{selectedOrgForDetail.primary_contact_name}</span>
                    </div>
                    {selectedOrgForDetail.primary_contact_email && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium">{selectedOrgForDetail.primary_contact_email}</span>
                      </div>
                    )}
                    {selectedOrgForDetail.primary_contact_phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Teléfono:</span>
                        <span className="font-medium">{selectedOrgForDetail.primary_contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedOrgForDetail.tags && selectedOrgForDetail.tags.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Etiquetas</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedOrgForDetail.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
              {!isDemoMode && (
                <Button onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenModal(selectedOrgForDetail);
                }}>
                  Editar Organización
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit/Create Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingOrg ? 'Editar Organización' : 'Nueva Organización'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Nombre *" 
              value={formData.name} 
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} 
              required 
            />
            <Input 
              label="Código" 
              placeholder="Ej: TCG-HQ"
              value={formData.code} 
              onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo *"
              value={formData.type}
              onChange={(e) => setFormData(p => ({ ...p, type: e.target.value as Organization['type'] }))}
              options={[
                { value: 'HEADQUARTERS', label: '🏢 Sede Central' },
                { value: 'SUBSIDIARY', label: '🏬 Subsidiaria' },
                { value: 'BRANCH', label: '🏪 Sucursal' },
                { value: 'DEPARTMENT', label: '📁 Departamento' },
              ]}
              required
            />
            <Select
              label="Cliente *"
              value={formData.client_id}
              onChange={(e) => setFormData(p => ({ ...p, client_id: e.target.value }))}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              required
            />
          </div>

          <Select
            label="Organización Padre"
            value={formData.parent_organization_id}
            onChange={(e) => setFormData(p => ({ ...p, parent_organization_id: e.target.value }))}
            options={[
              { value: '', label: 'Ninguna (Raíz)' },
              ...allOrgs.filter(o => o.id !== editingOrg?.id).map(o => ({ value: o.id, label: `${o.name} (${orgTypeConfig[o.type].label})` })),
            ]}
          />

          <Textarea 
            label="Descripción" 
            value={formData.description} 
            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} 
            rows={2}
            placeholder="Breve descripción de la organización..."
          />

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Ubicación</h3>
            <div className="space-y-4">
              <Input 
                label="Dirección" 
                value={formData.address} 
                onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} 
                placeholder="Calle y número"
              />
              <div className="grid grid-cols-3 gap-4">
                <Input 
                  label="Ciudad" 
                  value={formData.city} 
                  onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))} 
                />
                <Input 
                  label="Provincia/Estado" 
                  value={formData.state} 
                  onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))} 
                />
                <Input 
                  label="País" 
                  value={formData.country} 
                  onChange={(e) => setFormData(p => ({ ...p, country: e.target.value }))} 
                />
              </div>
              <Input 
                label="Código Postal" 
                value={formData.postal_code} 
                onChange={(e) => setFormData(p => ({ ...p, postal_code: e.target.value }))} 
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Información de Contacto</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Teléfono" 
                type="tel"
                value={formData.phone} 
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} 
                placeholder="+54 11 1234-5678"
              />
              <Input 
                label="Email" 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} 
                placeholder="contacto@empresa.com"
              />
            </div>
            <div className="mt-4">
              <Input 
                label="Sitio Web" 
                type="url"
                value={formData.website} 
                onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))} 
                placeholder="https://ejemplo.com"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contacto Principal</h3>
            <div className="space-y-4">
              <Input 
                label="Nombre del Contacto" 
                value={formData.primary_contact_name} 
                onChange={(e) => setFormData(p => ({ ...p, primary_contact_name: e.target.value }))} 
                placeholder="Juan Pérez"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Email del Contacto" 
                  type="email"
                  value={formData.primary_contact_email} 
                  onChange={(e) => setFormData(p => ({ ...p, primary_contact_email: e.target.value }))} 
                  placeholder="juan.perez@empresa.com"
                />
                <Input 
                  label="Teléfono del Contacto" 
                  type="tel"
                  value={formData.primary_contact_phone} 
                  onChange={(e) => setFormData(p => ({ ...p, primary_contact_phone: e.target.value }))} 
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Información Adicional</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Cantidad de Empleados" 
                type="number"
                value={formData.employees_count} 
                onChange={(e) => setFormData(p => ({ ...p, employees_count: e.target.value }))} 
                placeholder="50"
              />
              <Select
                label="Tamaño de Empresa"
                value={formData.size}
                onChange={(e) => setFormData(p => ({ ...p, size: e.target.value }))}
                options={[
                  { value: '', label: 'Seleccionar...' },
                  ...sizeOptions,
                ]}
              />
            </div>
            <div className="mt-4">
              <Input 
                label="Etiquetas" 
                value={formData.tags} 
                onChange={(e) => setFormData(p => ({ ...p, tags: e.target.value }))} 
                placeholder="Tecnología, Corporativo, Internacional (separadas por comas)"
              />
              <p className="text-xs text-gray-500 mt-1">Separa las etiquetas con comas</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingOrg ? 'Guardar Cambios' : 'Crear Organización'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Organización"
        message={`¿Estás seguro de que deseas eliminar "${deletingOrg?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
