'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, SearchInput, Select, EmptyState, Loading, Modal, Input, Textarea, ConfirmDialog, Avatar, Badge, StatCard } from '@/components/ui';
import { useClientsStore, useProjectsStore, useDealsStore } from '@/lib/store';
import { Client } from '@/lib/types';
import { clientTypeLabels, cn, generateRandomColor, formatDate, formatCurrency } from '@/lib/utils';

type ViewMode = 'grid' | 'table' | 'stats';

export default function ClientsPage() {
  const { clients, isLoading, fetchClients, addClient, updateClient, deleteClient, filter, setFilter, getFilteredClients } = useClientsStore();
  const { projects, fetchProjects } = useProjectsStore();
  const { deals, fetchDeals } = useDealsStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showStats, setShowStats] = useState(true);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    type: 'client',
    status: 'active',
    notes: '',
    tags: [] as string[],
    address: '',
    city: '',
    country: '',
  });

  useEffect(() => {
    fetchClients();
    fetchProjects();
    fetchDeals();
  }, [fetchClients, fetchProjects, fetchDeals]);

  const filteredClients = getFilteredClients();

  // Client Statistics
  const clientStats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
    leads: clients.filter(c => c.type === 'lead').length,
    clients: clients.filter(c => c.type === 'client').length,
    partners: clients.filter(c => c.type === 'partner').length,
  };

  // Get client metrics
  const getClientMetrics = (clientId: string) => {
    const clientProjects = projects.filter(p => p.clientId === clientId);
    const clientDeals = deals.filter(d => d.clientId === clientId);
    const totalRevenue = clientDeals
      .filter(d => d.stage === 'CLOSED_WON' || d.stage === 'won')
      .reduce((acc, d) => acc + (d.amount || 0), 0);
    
    return {
      projectsCount: clientProjects.length,
      dealsCount: clientDeals.length,
      totalRevenue,
      lastContact: null, // TODO: implement from activities
    };
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        email: client.email || '',
        phone: client.phone || '',
        company: client.company || client.companyName || '',
        position: client.position || '',
        type: client.type || 'client',
        status: client.status || 'active',
        notes: client.notes || '',
        tags: client.tags || [],
        address: '',
        city: '',
        country: '',
      });
    } else {
      setEditingClient(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        position: '',
        type: 'client',
        status: 'active',
        notes: '',
        tags: [],
        address: '',
        city: '',
        country: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() && !formData.company.trim()) return;

    const clientData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      name: formData.firstName && formData.lastName 
        ? `${formData.firstName} ${formData.lastName}`.trim()
        : formData.company || formData.firstName,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      companyName: formData.company,
      position: formData.position,
      type: formData.type as 'lead' | 'client' | 'partner' | 'individual' | 'company',
      status: formData.status,
      notes: formData.notes,
      tags: formData.tags,
      isActive: formData.status === 'active',
    };

    if (editingClient) {
      updateClient(editingClient.id, clientData);
    } else {
      addClient(clientData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (clientToDelete) {
      deleteClient(clientToDelete.id);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
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
        title="Clientes"
        description={`${clients.length} clientes registrados`}
        actions={
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
                title="Vista de tarjetas"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
                title="Vista de tabla"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  viewMode === 'stats' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
                title="Estadísticas"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Cliente
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SearchInput
              placeholder="Buscar clientes..."
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              onClear={() => setFilter({ search: '' })}
            />
            <Select
              placeholder="Todos los tipos"
              value={filter.type || ''}
              onChange={(e) => setFilter({ type: e.target.value || null })}
              options={[
                { value: '', label: 'Todos los tipos' },
                { value: 'lead', label: 'Lead' },
                { value: 'client', label: 'Cliente' },
                { value: 'partner', label: 'Socio' },
                { value: 'individual', label: 'Individual' },
                { value: 'company', label: 'Empresa' },
              ]}
            />
            <Select
              placeholder="Todos los estados"
              value={filter.isActive === null ? '' : (filter.isActive ? 'active' : 'inactive')}
              onChange={(e) => setFilter({ isActive: e.target.value === '' ? null : e.target.value === 'active' })}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'active', label: 'Activo' },
                { value: 'inactive', label: 'Inactivo' },
              ]}
            />
            <Button variant="outline" onClick={() => setShowStats(!showStats)}>
              {showStats ? 'Ocultar' : 'Mostrar'} Estadísticas
            </Button>
          </div>
        </div>
      </Card>

      {/* Statistics Dashboard */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Total"
            value={clientStats.total}
            color="indigo"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <StatCard
            title="Activos"
            value={clientStats.active}
            color="indigo"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Inactivos"
            value={clientStats.inactive}
            color="red"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
          />
          <StatCard
            title="Leads"
            value={clientStats.leads}
            color="orange"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title="Clientes"
            value={clientStats.clients}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
          <StatCard
            title="Socios"
            value={clientStats.partners}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Clients Views */}
      {filteredClients.length === 0 ? (
        <EmptyState
          title="No hay clientes"
          description={filter.search || filter.type ? 'No se encontraron clientes con los filtros aplicados' : 'Comienza agregando tu primer cliente'}
          icon={
            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          action={
            !filter.search && !filter.type && (
              <Button onClick={() => handleOpenModal()}>Agregar Cliente</Button>
            )
          }
        />
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => {
                const metrics = getClientMetrics(client.id);
                return (
                  <Card key={client.id} hoverable className="group">
                    <CardContent>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Avatar
                            name={client.name}
                            size="lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                            {client.company && (
                              <p className="text-sm text-gray-500 truncate">{client.company}</p>
                            )}
                            {client.position && (
                              <p className="text-xs text-gray-400">{client.position}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={client.status === 'active' ? 'success' : 'default'}>
                          {client.status}
                        </Badge>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 mb-4">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {client.phone}
                          </div>
                        )}
                      </div>

                      {/* Client Metrics */}
                      <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-100">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">{metrics.projectsCount}</p>
                          <p className="text-xs text-gray-500">Proyectos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">{metrics.dealsCount}</p>
                          <p className="text-xs text-gray-500">Deals</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</p>
                          <p className="text-xs text-gray-500">Ingresos</p>
                        </div>
                      </div>

                      {/* Tags */}
                      {client.tags && client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {client.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {client.tags.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{client.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenModal(client)}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(client)}>
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Proyectos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deals
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ingresos
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => {
                      const metrics = getClientMetrics(client.id);
                      return (
                        <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar name={client.name} size="sm" />
                              <div>
                                <div className="font-medium text-gray-900">{client.name}</div>
                                {client.company && (
                                  <div className="text-sm text-gray-500">{client.company}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{client.email || '-'}</div>
                            <div className="text-sm text-gray-500">{client.phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="default">
                              {client.type ? clientTypeLabels[client.type] : 'Sin tipo'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={client.status === 'active' ? 'success' : 'default'}>
                              {client.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {metrics.projectsCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {metrics.dealsCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(metrics.totalRevenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(client)}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(client)}>
                                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Stats View */}
          {viewMode === 'stats' && (
            <div className="space-y-6">
              {/* Top Clients by Revenue */}
              <Card>
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clientes por Ingresos</h3>
                  <div className="space-y-3">
                    {filteredClients
                      .map(client => ({
                        ...client,
                        metrics: getClientMetrics(client.id)
                      }))
                      .sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue)
                      .slice(0, 10)
                      .map((client, index) => (
                        <div key={client.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-bold text-sm">
                            {index + 1}
                          </div>
                          <Avatar name={client.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">
                              {client.metrics.projectsCount} proyectos • {client.metrics.dealsCount} deals
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{formatCurrency(client.metrics.totalRevenue)}</div>
                            <div className="text-xs text-gray-500">ingresos totales</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Clients by Type Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Tipo</h3>
                    <div className="space-y-4">
                      {Object.entries(clientStats).map(([key, value]) => {
                        if (!['leads', 'clients', 'partners'].includes(key)) return null;
                        const percentage = clientStats.total > 0 ? (value / clientStats.total) * 100 : 0;
                        const labels: Record<string, string> = {
                          leads: 'Leads',
                          clients: 'Clientes',
                          partners: 'Socios'
                        };
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">{labels[key]}</span>
                              <span className="text-sm text-gray-500">{value} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  key === 'leads' && 'bg-yellow-500',
                                  key === 'clients' && 'bg-blue-500',
                                  key === 'partners' && 'bg-purple-500'
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Clientes</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Activos</span>
                          <span className="text-sm text-gray-500">
                            {clientStats.active} ({clientStats.total > 0 ? ((clientStats.active / clientStats.total) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${clientStats.total > 0 ? (clientStats.active / clientStats.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Inactivos</span>
                          <span className="text-sm text-gray-500">
                            {clientStats.inactive} ({clientStats.total > 0 ? ((clientStats.inactive / clientStats.total) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-500 h-2 rounded-full"
                            style={{ width: `${clientStats.total > 0 ? (clientStats.inactive / clientStats.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre *"
                placeholder="Juan"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <Input
                label="Apellido"
                placeholder="Pérez"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email *"
                type="email"
                placeholder="juan@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Teléfono"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Business Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Información Empresarial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Empresa"
                placeholder="Empresa S.A."
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
              <Input
                label="Posición"
                placeholder="CEO, Manager, etc."
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Select
                label="Tipo de Cliente"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                options={[
                  { value: 'lead', label: 'Lead' },
                  { value: 'client', label: 'Cliente' },
                  { value: 'partner', label: 'Socio' },
                  { value: 'supplier', label: 'Proveedor' },
                ]}
              />
              <Select
                label="Estado"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Activo' },
                  { value: 'inactive', label: 'Inactivo' },
                  { value: 'pending', label: 'Pendiente' },
                ]}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Dirección
            </h3>
            <div className="space-y-4">
              <Input
                label="Dirección"
                placeholder="Calle Principal 123"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Ciudad"
                  placeholder="Ciudad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <Input
                  label="País"
                  placeholder="País"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Información Adicional
            </h3>
            <div className="space-y-4">
              <Textarea
                label="Notas"
                placeholder="Notas adicionales sobre el cliente..."
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
              <Input
                label="Etiquetas (separadas por coma)"
                placeholder="vip, prioritario, internacional"
                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                  setFormData({ ...formData, tags });
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar a "${clientToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
