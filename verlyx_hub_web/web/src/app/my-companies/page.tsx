'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, EmptyState, Loading, Modal, Input, Textarea, ConfirmDialog, Avatar, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { cn, generateRandomColor } from '@/lib/utils';

// Types
interface MyCompany {
  id: string;
  owner_user_id: string;
  name: string;
  type: string;
  description: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string | null;
  tax_id: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Stats (computed)
  projects_count?: number;
  deals_count?: number;
  tasks_count?: number;
}

type ViewMode = 'grid' | 'list';

const COMPANY_TYPES = [
  { value: 'technology', label: 'Tecnología', icon: '💻' },
  { value: 'consulting', label: 'Consultoría', icon: '📊' },
  { value: 'retail', label: 'Retail', icon: '🛒' },
  { value: 'services', label: 'Servicios', icon: '🔧' },
  { value: 'education', label: 'Educación', icon: '📚' },
  { value: 'health', label: 'Salud', icon: '🏥' },
  { value: 'finance', label: 'Finanzas', icon: '💰' },
  { value: 'manufacturing', label: 'Manufactura', icon: '🏭' },
  { value: 'real_estate', label: 'Inmobiliaria', icon: '🏢' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'design', label: 'Diseño', icon: '🎨' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'other', label: 'Otro', icon: '📁' },
];

const INDUSTRIES = [
  'Software',
  'E-commerce',
  'Fintech',
  'EdTech',
  'HealthTech',
  'Marketing Digital',
  'Desarrollo Web',
  'Desarrollo Móvil',
  'Inteligencia Artificial',
  'Blockchain',
  'Gaming',
  'SaaS',
  'Consultoría IT',
  'Ciberseguridad',
  'Cloud Computing',
  'IoT',
  'Otro',
];

export default function MyCompaniesPage() {
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<MyCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<MyCompany | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<MyCompany | null>(null);
  const [detailCompany, setDetailCompany] = useState<MyCompany | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'technology',
    description: '',
    industry: '',
    website: '',
    email: '',
    phone: '',
    tax_id: '',
    address: '',
    city: '',
    country: 'Uruguay',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
  });

  // Check if in demo mode (user ID starts with 'demo')
  const isDemoMode = user?.id?.startsWith('demo') || false;

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      if (isDemoMode) {
        // Demo mode - show sample data
        setCompanies([
          {
            id: 'demo-company-1',
            owner_user_id: user.id,
            name: 'Mi Empresa Demo',
            type: 'technology',
            description: 'Esta es una empresa de demostración. Inicia sesión con Supabase para crear empresas reales.',
            logo_url: null,
            primary_color: '#6366f1',
            secondary_color: '#8b5cf6',
            tax_id: null,
            industry: 'Software',
            website: 'https://ejemplo.com',
            phone: '+598 99 123 456',
            email: 'demo@empresa.com',
            address: 'Calle Demo 123',
            city: 'Montevideo',
            country: 'Uruguay',
            settings: {},
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            projects_count: 3,
            deals_count: 5,
            tasks_count: 12,
          }
        ]);
        setSelectedCompanyId('demo-company-1');
        setIsLoading(false);
        return;
      }

      // Real mode - fetch from Supabase
      const { data: companiesData, error } = await supabase
        .from('my_companies')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get stats for each company
      const companiesWithStats = await Promise.all(
        (companiesData || []).map(async (company) => {
          // Get projects count
          const { count: projectsCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('my_company_id', company.id);

          // Get deals count (if linked)
          const { count: dealsCount } = await supabase
            .from('deals')
            .select('*', { count: 'exact', head: true })
            .eq('my_company_id', company.id);

          // Get tasks count through projects
          const { data: projectIds } = await supabase
            .from('projects')
            .select('id')
            .eq('my_company_id', company.id);

          let tasksCount = 0;
          if (projectIds && projectIds.length > 0) {
            const { count } = await supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .in('project_id', projectIds.map(p => p.id));
            tasksCount = count || 0;
          }

          return {
            ...company,
            projects_count: projectsCount || 0,
            deals_count: dealsCount || 0,
            tasks_count: tasksCount,
          };
        })
      );

      setCompanies(companiesWithStats);
      
      // Select first company if none selected
      if (!selectedCompanyId && companiesWithStats.length > 0) {
        setSelectedCompanyId(companiesWithStats[0].id);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isDemoMode, selectedCompanyId]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || company.type === filterType;
    const matchesActive = filterActive === null || company.is_active === filterActive;
    return matchesSearch && matchesType && matchesActive;
  });

  // Open modal for create/edit
  const handleOpenModal = (company?: MyCompany) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        type: company.type,
        description: company.description || '',
        industry: company.industry || '',
        website: company.website || '',
        email: company.email || '',
        phone: company.phone || '',
        tax_id: company.tax_id || '',
        address: company.address || '',
        city: company.city || '',
        country: company.country || 'Uruguay',
        primary_color: company.primary_color || '#6366f1',
        secondary_color: company.secondary_color || '#8b5cf6',
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: '',
        type: 'technology',
        description: '',
        industry: '',
        website: '',
        email: '',
        phone: '',
        tax_id: '',
        address: '',
        city: '',
        country: 'Uruguay',
        primary_color: generateRandomColor(),
        secondary_color: generateRandomColor(),
      });
    }
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (isDemoMode) {
      alert('En modo demo no se pueden crear empresas reales. Inicia sesión con Supabase para habilitar esta función.');
      return;
    }

    if (!user?.id) {
      alert('Debes iniciar sesión para crear empresas');
      return;
    }

    setIsSubmitting(true);
    try {
      const companyData = {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description || null,
        industry: formData.industry || null,
        website: formData.website || null,
        email: formData.email || null,
        phone: formData.phone || null,
        tax_id: formData.tax_id || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || 'Uruguay',
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
      };

      if (editingCompany) {
        // Update
        const { error } = await supabase
          .from('my_companies')
          .update(companyData)
          .eq('id', editingCompany.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('my_companies')
          .insert({
            ...companyData,
            owner_user_id: user.id,
            is_active: true,
          });

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Error al guardar la empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete company
  const handleDeleteClick = (company: MyCompany) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;

    if (isDemoMode) {
      alert('En modo demo no se pueden eliminar empresas.');
      setDeleteDialogOpen(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('my_companies')
        .delete()
        .eq('id', companyToDelete.id);

      if (error) throw error;

      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Error al eliminar la empresa');
    }
  };

  // Toggle active status
  const handleToggleActive = async (company: MyCompany) => {
    if (isDemoMode) {
      alert('En modo demo no se pueden modificar empresas.');
      return;
    }

    try {
      const { error } = await supabase
        .from('my_companies')
        .update({ is_active: !company.is_active })
        .eq('id', company.id);

      if (error) throw error;
      fetchCompanies();
    } catch (error) {
      console.error('Error toggling active:', error);
    }
  };

  // Select company
  const handleSelectCompany = (id: string) => {
    setSelectedCompanyId(id);
    // Save to localStorage for use in other pages
    localStorage.setItem('selectedCompanyId', id);
  };

  // Get type info
  const getTypeInfo = (type: string) => {
    return COMPANY_TYPES.find(t => t.value === type) || { value: type, label: type, icon: '📁' };
  };

  // Stats summary
  const stats = {
    total: companies.length,
    active: companies.filter(c => c.is_active).length,
    totalProjects: companies.reduce((acc, c) => acc + (c.projects_count || 0), 0),
    totalDeals: companies.reduce((acc, c) => acc + (c.deals_count || 0), 0),
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Mis Empresas"
        description="Gestiona tus empresas y organizaciones"
        actions={
          <Button onClick={() => handleOpenModal()} disabled={isDemoMode}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Empresa
          </Button>
        }
      />

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-amber-800">Modo Demo</h4>
            <p className="text-sm text-amber-700">
              Estás viendo datos de demostración. Para crear y gestionar empresas reales, 
              <a href="/login" className="underline font-medium ml-1">inicia sesión con tu cuenta de Supabase</a>.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {companies.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-100">Total Empresas</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-100">Activas</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Proyectos</p>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-100">Deals</p>
                  <p className="text-2xl font-bold">{stats.totalDeals}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Search */}
      {companies.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar empresas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType || ''}
            onChange={(e) => setFilterType(e.target.value || null)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Todos los tipos</option>
            {COMPANY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>

          <select
            value={filterActive === null ? '' : filterActive.toString()}
            onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>

          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-2 transition-colors',
                viewMode === 'grid' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-2 transition-colors',
                viewMode === 'list' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {companies.length === 0 ? (
        <EmptyState
          title="No hay empresas"
          description="Crea tu primera empresa para comenzar a gestionar proyectos, clientes y finanzas de forma organizada"
          icon={
            <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          action={<Button onClick={() => handleOpenModal()}>Crear mi primera empresa</Button>}
        />
      ) : filteredCompanies.length === 0 ? (
        <EmptyState
          title="No se encontraron empresas"
          description="Intenta ajustar los filtros de búsqueda"
          icon={
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          action={
            <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterType(null); setFilterActive(null); }}>
              Limpiar filtros
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => {
            const typeInfo = getTypeInfo(company.type);
            const isSelected = selectedCompanyId === company.id;

            return (
              <Card
                key={company.id}
                hoverable
                className={cn(
                  'relative overflow-hidden transition-all duration-200',
                  isSelected && 'ring-2 ring-indigo-500 shadow-lg',
                  !company.is_active && 'opacity-60'
                )}
              >
                {/* Color Banner */}
                <div
                  className="h-20 relative"
                  style={{
                    background: `linear-gradient(135deg, ${company.primary_color}, ${company.secondary_color || company.primary_color})`
                  }}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="success" className="bg-white text-indigo-600 shadow">
                        ✓ Activa
                      </Badge>
                    </div>
                  )}
                  {!company.is_active && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="default" className="bg-white/90">
                        Pausada
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="-mt-10 relative">
                  <div className="flex items-end gap-3 mb-3">
                    <Avatar
                      name={company.name}
                      color={company.primary_color}
                      size="lg"
                      className="ring-4 ring-white shadow-md"
                    />
                    <span className="text-2xl">{typeInfo.icon}</span>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-lg truncate">{company.name}</h3>
                  <p className="text-sm text-gray-500">{typeInfo.label}</p>
                  {company.industry && (
                    <p className="text-xs text-gray-400 mt-1">{company.industry}</p>
                  )}

                  {company.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{company.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">{company.projects_count || 0}</p>
                      <p className="text-xs text-gray-500">Proyectos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">{company.deals_count || 0}</p>
                      <p className="text-xs text-gray-500">Deals</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">{company.tasks_count || 0}</p>
                      <p className="text-xs text-gray-500">Tareas</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    {!isSelected ? (
                      <Button variant="ghost" size="sm" onClick={() => handleSelectCompany(company.id)}>
                        Seleccionar
                      </Button>
                    ) : (
                      <span className="text-sm text-indigo-600 font-medium">Empresa activa</span>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDetailCompany(company)} title="Ver detalles">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(company)} title="Editar">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive(company)} title={company.is_active ? 'Pausar' : 'Activar'}>
                        {company.is_active ? (
                          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(company)} title="Eliminar">
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <div className="divide-y divide-gray-100">
            {filteredCompanies.map((company) => {
              const typeInfo = getTypeInfo(company.type);
              const isSelected = selectedCompanyId === company.id;

              return (
                <div
                  key={company.id}
                  className={cn(
                    'p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-indigo-50',
                    !company.is_active && 'opacity-60'
                  )}
                >
                  <div
                    className="w-2 h-12 rounded-full"
                    style={{ backgroundColor: company.primary_color }}
                  />
                  <Avatar name={company.name} color={company.primary_color} size="md" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">{company.name}</h3>
                      <span className="text-lg">{typeInfo.icon}</span>
                      {isSelected && (
                        <Badge variant="info" size="sm">Activa</Badge>
                      )}
                      {!company.is_active && (
                        <Badge variant="default" size="sm">Pausada</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {typeInfo.label}
                      {company.industry && ` · ${company.industry}`}
                    </p>
                  </div>

                  <div className="hidden md:flex items-center gap-6 text-center">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{company.projects_count || 0}</p>
                      <p className="text-xs text-gray-500">Proyectos</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{company.deals_count || 0}</p>
                      <p className="text-xs text-gray-500">Deals</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{company.tasks_count || 0}</p>
                      <p className="text-xs text-gray-500">Tareas</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSelected && (
                      <Button variant="outline" size="sm" onClick={() => handleSelectCompany(company.id)}>
                        Seleccionar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setDetailCompany(company)}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(company)}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(company)}>
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Información Básica</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre *"
                placeholder="Nombre de la empresa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  {COMPANY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Industry & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industria</label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Seleccionar industria</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            <Input
              label="RUT / Tax ID"
              placeholder="Ej: 123456789012"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            />
          </div>

          <Textarea
            label="Descripción"
            placeholder="Describe tu empresa..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Contacto</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="empresa@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Teléfono"
                placeholder="+598 99 123 456"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Website"
                placeholder="https://miempresa.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Ubicación</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Dirección"
                placeholder="Calle 123"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <Input
                label="Ciudad"
                placeholder="Montevideo"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                label="País"
                placeholder="Uruguay"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>

          {/* Colors */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Colores de Marca</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color Primario</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 font-mono">{formData.primary_color}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color Secundario</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 font-mono">{formData.secondary_color}</span>
                </div>
              </div>
            </div>
            {/* Preview */}
            <div
              className="mt-4 h-16 rounded-lg shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingCompany ? 'Guardar Cambios' : 'Crear Empresa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailCompany}
        onClose={() => setDetailCompany(null)}
        title={detailCompany?.name || 'Detalles de Empresa'}
        size="lg"
      >
        {detailCompany && (
          <div className="space-y-6">
            {/* Header with gradient */}
            <div
              className="h-32 rounded-lg relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${detailCompany.primary_color}, ${detailCompany.secondary_color || detailCompany.primary_color})`
              }}
            >
              <div className="absolute bottom-4 left-4 flex items-end gap-4">
                <Avatar
                  name={detailCompany.name}
                  color={detailCompany.primary_color}
                  size="xl"
                  className="ring-4 ring-white shadow-lg"
                />
                <div className="text-white pb-1">
                  <h3 className="text-xl font-bold drop-shadow">{detailCompany.name}</h3>
                  <p className="text-sm text-white/80">{getTypeInfo(detailCompany.type).label}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{detailCompany.projects_count || 0}</p>
                <p className="text-sm text-gray-600">Proyectos</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{detailCompany.deals_count || 0}</p>
                <p className="text-sm text-gray-600">Deals</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{detailCompany.tasks_count || 0}</p>
                <p className="text-sm text-gray-600">Tareas</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {detailCompany.industry && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Industria</p>
                  <p className="font-medium">{detailCompany.industry}</p>
                </div>
              )}
              {detailCompany.tax_id && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">RUT / Tax ID</p>
                  <p className="font-medium">{detailCompany.tax_id}</p>
                </div>
              )}
              {detailCompany.email && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                  <a href={`mailto:${detailCompany.email}`} className="font-medium text-indigo-600 hover:underline">
                    {detailCompany.email}
                  </a>
                </div>
              )}
              {detailCompany.phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Teléfono</p>
                  <a href={`tel:${detailCompany.phone}`} className="font-medium text-indigo-600 hover:underline">
                    {detailCompany.phone}
                  </a>
                </div>
              )}
              {detailCompany.website && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Website</p>
                  <a href={detailCompany.website} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
                    {detailCompany.website}
                  </a>
                </div>
              )}
              {(detailCompany.city || detailCompany.country) && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Ubicación</p>
                  <p className="font-medium">
                    {[detailCompany.city, detailCompany.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>

            {detailCompany.description && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Descripción</p>
                <p className="text-gray-700">{detailCompany.description}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
              <span>Creada: {new Date(detailCompany.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>Actualizada: {new Date(detailCompany.updated_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDetailCompany(null)}>
                Cerrar
              </Button>
              <Button onClick={() => { setDetailCompany(null); handleOpenModal(detailCompany); }}>
                Editar Empresa
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Empresa"
        message={`¿Estás seguro de que deseas eliminar "${companyToDelete?.name}"? Esta acción eliminará todos los datos asociados y no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
