'use client';

import { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Input, Select, Modal, Badge, Textarea, SearchInput, ConfirmDialog, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore, useCompanyStore } from '@/lib/store';

// Buildings Management Types
interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: 'residential' | 'commercial' | 'mixed' | 'office' | 'industrial';
  units: number;
  occupiedUnits: number;
  monthlyRevenue: number;
  yearlyRevenue?: number;
  constructionYear?: number;
  floors?: number;
  parkingSpaces?: number;
  amenities?: string[];
  status: 'active' | 'maintenance' | 'inactive' | 'under_construction';
  manager?: string;
  managerContact?: string;
  image?: string;
  description?: string;
}

// Tourism/Merchants Types
interface Merchant {
  id: string;
  name: string;
  category: 'restaurant' | 'hotel' | 'shop' | 'tour' | 'transport' | 'entertainment' | 'spa' | 'bar';
  location: string;
  address?: string;
  rating: number;
  reviews: number;
  status: 'active' | 'pending' | 'inactive' | 'rejected';
  verified: boolean;
  featured: boolean;
  description: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  openingHours?: string;
  services?: string[];
}

const buildingTypeConfig = {
  residential: { label: 'Residencial', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '🏠', desc: 'Departamentos y viviendas' },
  commercial: { label: 'Comercial', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: '🏢', desc: 'Locales y tiendas' },
  mixed: { label: 'Mixto', color: 'bg-green-100 text-green-700 border-green-300', icon: '🏗️', desc: 'Uso múltiple' },
  office: { label: 'Oficinas', color: 'bg-indigo-100 text-indigo-700 border-indigo-300', icon: '🏛️', desc: 'Espacios corporativos' },
  industrial: { label: 'Industrial', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: '🏭', desc: 'Galpones y bodegas' },
};

const merchantCategoryConfig = {
  restaurant: { label: 'Restaurante', icon: '🍽️', color: 'bg-orange-100 text-orange-700' },
  hotel: { label: 'Hotel', icon: '🏨', color: 'bg-blue-100 text-blue-700' },
  shop: { label: 'Tienda', icon: '🛍️', color: 'bg-pink-100 text-pink-700' },
  tour: { label: 'Tour', icon: '🗺️', color: 'bg-green-100 text-green-700' },
  transport: { label: 'Transporte', icon: '🚐', color: 'bg-indigo-100 text-indigo-700' },
  entertainment: { label: 'Entretenimiento', icon: '🎭', color: 'bg-purple-100 text-purple-700' },
  spa: { label: 'Spa & Wellness', icon: '💆', color: 'bg-teal-100 text-teal-700' },
  bar: { label: 'Bar & Café', icon: '🍹', color: 'bg-yellow-100 text-yellow-700' },
};

const statusConfig = {
  active: { label: 'Activo', color: 'bg-green-100 text-green-700', icon: '✓' },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  inactive: { label: 'Inactivo', color: 'bg-gray-100 text-gray-700', icon: '○' },
  maintenance: { label: 'Mantenimiento', color: 'bg-orange-100 text-orange-700', icon: '🔧' },
  under_construction: { label: 'En Construcción', color: 'bg-blue-100 text-blue-700', icon: '🚧' },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700', icon: '✗' },
};

export default function VerlyxEcosystemPage() {
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();

  const [activeModule, setActiveModule] = useState<'buildings' | 'tourism'>('buildings');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [selectedCompanyId, activeModule]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (!selectedCompanyId) return;

      if (activeModule === 'buildings') {
        const { data, error } = await supabase
          .from('buildings')
          .select('*')
          .eq('my_company_id', selectedCompanyId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedBuildings = (data || []).map(b => ({
          id: b.id,
          name: b.name,
          address: b.address,
          city: b.city || '',
          country: b.country || '',
          type: b.building_type || 'residential',
          units: b.units || 0,
          occupiedUnits: b.occupied_units || 0,
          monthlyRevenue: b.monthly_revenue || 0,
          yearlyRevenue: b.yearly_revenue,
          constructionYear: b.construction_year,
          floors: b.floors,
          parkingSpaces: b.parking_spaces,
          amenities: b.amenities || [],
          status: b.status || 'active',
          manager: b.manager,
          managerContact: b.manager_contact,
          image: b.image,
          description: b.description,
        }));

        setBuildings(mappedBuildings);
      } else {
        const { data, error } = await supabase
          .from('merchants')
          .select('*')
          .eq('my_company_id', selectedCompanyId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedMerchants = (data || []).map(m => ({
          id: m.id,
          name: m.name,
          category: m.category || 'shop',
          location: m.location || '',
          address: m.address,
          rating: m.rating || 0,
          reviews: m.reviews || 0,
          status: m.status || 'active',
          verified: m.verified || false,
          featured: m.featured || false,
          description: m.description || '',
          contactName: m.contact_name,
          contactEmail: m.contact_email,
          phone: m.phone,
          website: m.website,
          priceRange: m.price_range,
          openingHours: m.opening_hours,
          services: m.services || [],
        }));

        setMerchants(mappedMerchants);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buildings stats
  const totalUnits = buildings.reduce((sum, b) => sum + b.units, 0);
  const occupiedUnits = buildings.reduce((sum, b) => sum + b.occupiedUnits, 0);
  const totalRevenue = buildings.reduce((sum, b) => sum + b.monthlyRevenue, 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Merchants stats
  const verifiedMerchants = merchants.filter(m => m.verified).length;
  const avgRating = merchants.length > 0 
    ? (merchants.reduce((sum, m) => sum + m.rating, 0) / merchants.length).toFixed(1) 
    : '0.0';
  const totalReviews = merchants.reduce((sum, m) => sum + m.reviews, 0);

  const filteredMerchants = filterCategory === 'all'
    ? merchants
    : merchants.filter(m => m.category === filterCategory);

  return (
    <MainLayout>
      <PageHeader
        title="Verlyx Ecosystem"
        description="Gestión de edificios y plataforma de turismo"
      />

      {/* Module Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveModule('buildings')}
          className={`flex-1 p-6 rounded-xl border-2 transition-all ${
            activeModule === 'buildings'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
              activeModule === 'buildings' ? 'bg-indigo-500 text-white' : 'bg-gray-100'
            }`}>
              🏢
            </div>
            <div className="text-left">
              <h3 className={`font-bold text-lg ${activeModule === 'buildings' ? 'text-indigo-700' : 'text-gray-700'}`}>
                Verlyx Buildings
              </h3>
              <p className="text-sm text-gray-500">Gestión de edificios y unidades</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setActiveModule('tourism')}
          className={`flex-1 p-6 rounded-xl border-2 transition-all ${
            activeModule === 'tourism'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
              activeModule === 'tourism' ? 'bg-emerald-500 text-white' : 'bg-gray-100'
            }`}>
              🌴
            </div>
            <div className="text-left">
              <h3 className={`font-bold text-lg ${activeModule === 'tourism' ? 'text-emerald-700' : 'text-gray-700'}`}>
                Verlyx Tourism
              </h3>
              <p className="text-sm text-gray-500">Plataforma de comerciantes y turismo</p>
            </div>
          </div>
        </button>
      </div>

      {/* Buildings Module */}
      {activeModule === 'buildings' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : buildings.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="No hay edificios"
              description="Comienza agregando tu primer edificio"
            />
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Edificios</p>
                  <p className="text-3xl font-bold">{buildings.length}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🏢</div>
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">Unidades Totales</p>
              <p className="text-3xl font-bold text-gray-900">{totalUnits}</p>
              <p className="text-sm text-gray-400 mt-1">{occupiedUnits} ocupadas</p>
            </Card>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">Tasa de Ocupación</p>
              <p className="text-3xl font-bold text-green-600">{occupancyRate}%</p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${occupancyRate}%` }} />
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">Ingresos Mensuales</p>
              <p className="text-3xl font-bold text-indigo-600">${totalRevenue.toLocaleString()}</p>
            </Card>
          </div>

          {/* Buildings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildings.map(building => (
              <Card key={building.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedBuilding(building)}>
                <div className="h-40 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-t-xl flex items-center justify-center text-6xl">
                  {buildingTypeConfig[building.type].icon}
                </div>
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{building.name}</h3>
                      <p className="text-sm text-gray-500">{building.address}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[building.status].color}`}>
                      {statusConfig[building.status].label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{building.occupiedUnits}/{building.units}</p>
                      <p className="text-xs text-gray-500">Unidades</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">${(building.monthlyRevenue/1000).toFixed(0)}k</p>
                      <p className="text-xs text-gray-500">Ingresos/mes</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className={`text-xs px-2 py-1 rounded-full ${buildingTypeConfig[building.type].color}`}>
                      {buildingTypeConfig[building.type].label}
                    </span>
                    {building.manager && (
                      <span className="text-xs text-gray-500">👤 {building.manager}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </>
          )}
        </>
      )}

      {/* Tourism Module */}
      {activeModule === 'tourism' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : merchants.length === 0 ? (
            <EmptyState
              icon="🏪"
              title="No hay comerciantes"
              description="Comienza agregando tu primer comerciante"
            />
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Comerciantes</p>
                  <p className="text-3xl font-bold">{merchants.length}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🏪</div>
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">Verificados</p>
              <p className="text-3xl font-bold text-green-600">{verifiedMerchants}</p>
              <p className="text-sm text-gray-400 mt-1">{Math.round((verifiedMerchants/merchants.length)*100)}% del total</p>
            </Card>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">Rating Promedio</p>
              <p className="text-3xl font-bold text-yellow-600">⭐ {avgRating}</p>
            </Card>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">Total Reviews</p>
              <p className="text-3xl font-bold text-indigo-600">{totalReviews.toLocaleString()}</p>
            </Card>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterCategory === 'all' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {Object.entries(merchantCategoryConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setFilterCategory(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                    filterCategory === key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Merchants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMerchants.map(merchant => (
              <Card key={merchant.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedMerchant(merchant)}>
                <CardContent>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-3xl">
                      {merchantCategoryConfig[merchant.category].icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{merchant.name}</h3>
                        {merchant.verified && (
                          <span className="text-blue-500" title="Verificado">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{merchantCategoryConfig[merchant.category].label}</p>
                      <p className="text-xs text-gray-400">📍 {merchant.location}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{merchant.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-medium text-gray-900">{merchant.rating}</span>
                      <span className="text-sm text-gray-400">({merchant.reviews} reviews)</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[merchant.status].color}`}>
                      {statusConfig[merchant.status].label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </>
          )}
        </>
      )}

      {/* Building Detail Modal */}
      {selectedBuilding && (
        <Modal isOpen={!!selectedBuilding} onClose={() => setSelectedBuilding(null)} title={selectedBuilding.name}>
          <div className="space-y-6">
            <div className="h-48 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-xl flex items-center justify-center text-8xl">
              {buildingTypeConfig[selectedBuilding.type].icon}
            </div>

            <div>
              <p className="text-gray-500 mb-1">Dirección</p>
              <p className="text-lg font-medium text-gray-900">{selectedBuilding.address}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-gray-900">{selectedBuilding.occupiedUnits}/{selectedBuilding.units}</p>
                <p className="text-sm text-gray-500">Unidades Ocupadas</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-indigo-600">${selectedBuilding.monthlyRevenue.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Ingresos Mensuales</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`px-3 py-1.5 rounded-full ${buildingTypeConfig[selectedBuilding.type].color}`}>
                {buildingTypeConfig[selectedBuilding.type].label}
              </span>
              <span className={`px-3 py-1.5 rounded-full ${statusConfig[selectedBuilding.status].color}`}>
                {statusConfig[selectedBuilding.status].label}
              </span>
            </div>

            {selectedBuilding.manager && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
                  {selectedBuilding.manager.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedBuilding.manager}</p>
                  <p className="text-sm text-gray-500">Administrador</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedBuilding(null)}>Cerrar</Button>
              <Button>Administrar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Merchant Detail Modal */}
      {selectedMerchant && (
        <Modal isOpen={!!selectedMerchant} onClose={() => setSelectedMerchant(null)} title={selectedMerchant.name}>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-4xl">
                {merchantCategoryConfig[selectedMerchant.category].icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">{selectedMerchant.name}</h3>
                  {selectedMerchant.verified && (
                    <span className="text-blue-500 text-lg" title="Verificado">✓</span>
                  )}
                </div>
                <p className="text-gray-500">{merchantCategoryConfig[selectedMerchant.category].label}</p>
                <p className="text-sm text-gray-400">📍 {selectedMerchant.location}</p>
              </div>
            </div>

            <p className="text-gray-600">{selectedMerchant.description}</p>

            <div className="flex items-center gap-6 p-4 bg-yellow-50 rounded-lg">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">⭐ {selectedMerchant.rating}</p>
                <p className="text-sm text-gray-500">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{selectedMerchant.reviews}</p>
                <p className="text-sm text-gray-500">Reviews</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedMerchant.contactEmail && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">📧</span>
                  <span className="text-gray-700">{selectedMerchant.contactEmail}</span>
                </div>
              )}
              {selectedMerchant.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">📞</span>
                  <span className="text-gray-700">{selectedMerchant.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full ${statusConfig[selectedMerchant.status].color}`}>
                {statusConfig[selectedMerchant.status].label}
              </span>
              {selectedMerchant.verified ? (
                <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">✓ Verificado</span>
              ) : (
                <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">Sin verificar</span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedMerchant(null)}>Cerrar</Button>
              <Button>Ver Perfil Completo</Button>
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
