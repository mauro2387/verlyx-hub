'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout, PageHeader } from '@/components/layout';
import { Card, Button, Input, Badge, Modal } from '@/components/ui';
import { useAuthStore, useCompanyStore } from '@/lib/store';
import { CompanyBadge, CompanySelector } from '@/components/ui';
import { enterpriseHelpers } from '@/lib/enterprise-helpers';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  product_type: string;
  currency: string;
  price: number;
  cost: number;
  unit: string;
  tax_rate: number;
  is_hourly: boolean;
  category: string | null;
  tags: string[];
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();
  const [formCompanyId, setFormCompanyId] = useState(selectedCompanyId || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    productType: 'service',
    price: '',
    cost: '',
    unit: 'unidad',
    taxRate: '16',
    isHourly: false,
    category: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadProducts();
    }
  }, [user?.id]);

  const loadProducts = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await enterpriseHelpers.products.getAll(user.id);
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (editingProduct) {
      // Update
      const { error } = await enterpriseHelpers.products.update(editingProduct.id, {
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        productType: formData.productType,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        unit: formData.unit,
        taxRate: parseFloat(formData.taxRate) || 16,
        isHourly: formData.isHourly,
        category: formData.category || undefined,
      });
      if (!error) {
        loadProducts();
        closeModal();
      }
    } else {
      // Create
      const { error } = await enterpriseHelpers.products.create({
        userId: user.id,
        myCompanyId: formCompanyId || selectedCompanyId || undefined,
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        productType: formData.productType,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        unit: formData.unit,
        taxRate: parseFloat(formData.taxRate) || 16,
        isHourly: formData.isHourly,
        category: formData.category || undefined,
      });
      if (!error) {
        loadProducts();
        closeModal();
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      productType: product.product_type,
      price: product.price.toString(),
      cost: product.cost.toString(),
      unit: product.unit,
      taxRate: product.tax_rate.toString(),
      isHourly: product.is_hourly,
      category: product.category || '',
    });
    setShowModal(true);
  };

  const handleToggleActive = async (product: Product) => {
    await enterpriseHelpers.products.toggleActive(product.id, !product.is_active);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await enterpriseHelpers.products.delete(id);
      loadProducts();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      sku: '',
      productType: 'service',
      price: '',
      cost: '',
      unit: 'unidad',
      taxRate: '16',
      isHourly: false,
      category: '',
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || product.product_type === filterType;
    return matchesSearch && matchesType;
  });

  const productTypes = [
    { value: 'service', label: 'Servicio', color: 'info' },
    { value: 'product', label: 'Producto', color: 'success' },
    { value: 'subscription', label: 'Suscripción', color: 'warning' },
  ];

  const getTypeColor = (type: string) => {
    return productTypes.find(t => t.value === type)?.color || 'default';
  };

  const getTypeLabel = (type: string) => {
    return productTypes.find(t => t.value === type)?.label || type;
  };

  // Calculate profit margin
  const getMargin = (price: number, cost: number) => {
    if (price === 0) return 0;
    return ((price - cost) / price * 100).toFixed(1);
  };

  return (
    <MainLayout>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
          <p className="text-gray-500">Gestiona tus productos y servicios</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + Nuevo Producto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Productos</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Servicios</p>
          <p className="text-2xl font-bold text-blue-600">
            {products.filter(p => p.product_type === 'service').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Productos Físicos</p>
          <p className="text-2xl font-bold text-green-600">
            {products.filter(p => p.product_type === 'product').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Activos</p>
          <p className="text-2xl font-bold text-emerald-600">
            {products.filter(p => p.is_active).length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Todos los tipos</option>
          <option value="service">Servicios</option>
          <option value="product">Productos</option>
          <option value="subscription">Suscripciones</option>
        </select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
          <p className="text-gray-500 mb-4">Crea tu primer producto o servicio</p>
          <Button onClick={() => setShowModal(true)}>
            + Crear Producto
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={`p-4 ${!product.is_active ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Badge variant={getTypeColor(product.product_type) as 'info' | 'success' | 'warning'}>
                    {getTypeLabel(product.product_type)}
                  </Badge>
                  {!product.is_active && (
                    <Badge variant="danger" className="ml-2">Inactivo</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleToggleActive(product)}
                    className={`p-1.5 rounded ${product.is_active ? 'text-gray-400 hover:text-orange-600' : 'text-gray-400 hover:text-green-600'}`}
                  >
                    {product.is_active ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
              <CompanyBadge companyId={(product as any).my_company_id} />
              {product.sku && (
                <p className="text-xs text-gray-400 mb-2">SKU: {product.sku}</p>
              )}
              {product.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
              )}
              
              <div className="flex justify-between items-end pt-3 border-t">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(product.price, product.currency)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {product.is_hourly ? 'por hora' : `por ${product.unit}`}
                  </p>
                </div>
                {product.cost > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Margen</p>
                    <p className="text-sm font-semibold text-green-600">
                      {getMargin(product.price, product.cost)}%
                    </p>
                  </div>
                )}
              </div>
              
              {product.category && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {product.category}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CompanySelector
              value={formCompanyId || selectedCompanyId || ''}
              onChange={(id) => setFormCompanyId(id)}
              label="Empresa"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Código único"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="service">Servicio</option>
                  <option value="product">Producto</option>
                  <option value="subscription">Suscripción</option>
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del producto"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="unidad, hora, día..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IVA %</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  placeholder="16"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Categoría"
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHourly}
                    onChange={(e) => setFormData({ ...formData, isHourly: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Precio por hora</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </div>
          </form>
        </Modal>
    </div>
    </MainLayout>
  );
}
