'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, Button, Input, Select, Loading } from '@/components/ui';
import { enterpriseHelpers } from '@/lib/enterprise-helpers';
import { useAuthStore } from '@/lib/store';
import { formatCurrency, cn } from '@/lib/utils';

interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

const emptyItem: QuoteItem = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  taxRate: 16,
};

export default function NewQuotePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  // Datos de contacto inline
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [currency, setCurrency] = useState('MXN');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('• Precios expresados en MXN + IVA\n• Vigencia de la cotización: 15 días\n• Forma de pago: 50% anticipo, 50% contra entrega\n• Tiempo de entrega: A convenir');
  const [items, setItems] = useState<QuoteItem[]>([{ ...emptyItem }]);

  // Set default valid until date (15 days from now)
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 15);
    setValidUntil(defaultDate.toISOString().split('T')[0]);
  }, []);

  // Calculate totals
  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = subtotal * (item.discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (item.taxRate / 100);
    return {
      subtotal,
      discountAmount,
      afterDiscount,
      taxAmount,
      total: afterDiscount + taxAmount,
    };
  };

  const totals = items.reduce(
    (acc, item) => {
      const itemTotals = calculateItemTotal(item);
      return {
        subtotal: acc.subtotal + itemTotals.afterDiscount,
        tax: acc.tax + itemTotals.taxAmount,
        total: acc.total + itemTotals.total,
      };
    },
    { subtotal: 0, tax: 0, total: 0 }
  );

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      alert('No hay sesión activa');
      return;
    }
    
    if (!title.trim()) {
      alert('El título es requerido');
      return;
    }
    
    if (items.every(i => !i.description.trim())) {
      alert('Agrega al menos un item');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const validItems = items.filter(i => i.description.trim());
      
      const { data, error } = await enterpriseHelpers.quotes.create({
        userId: user.id,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        contactCompany: contactCompany || undefined,
        title: title.trim(),
        currency,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        items: validItems.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          taxRate: i.taxRate,
        })),
      });
      
      if (error) {
        throw error;
      }
      
      router.push(`/quotes/${data.id}`);
    } catch (err) {
      console.error('Error creating quote:', err);
      alert('Error al crear la cotización');
    } finally {
      setIsSaving(false);
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
        title="Nueva Cotización"
        description="Crea una propuesta para tu cliente"
        backHref="/quotes"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título de la cotización *
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: Desarrollo de sitio web corporativo"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Moneda
                    </label>
                    <Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      options={[
                        { value: 'MXN', label: 'MXN - Peso Mexicano' },
                        { value: 'USD', label: 'USD - Dólar' },
                        { value: 'EUR', label: 'EUR - Euro' },
                      ]}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Válida hasta
                    </label>
                    <Input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datos del Cliente */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del contacto
                    </label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Empresa
                    </label>
                    <Input
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="Empresa SA de CV"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="cliente@empresa.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Conceptos</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Header */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase">
                    <div className="col-span-4">Descripción</div>
                    <div className="col-span-2">Cantidad</div>
                    <div className="col-span-2">Precio Unit.</div>
                    <div className="col-span-1">Desc %</div>
                    <div className="col-span-1">IVA %</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>

                  {/* Items */}
                  {items.map((item, index) => {
                    const itemTotals = calculateItemTotal(item);
                    return (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
                        <div className="col-span-12 md:col-span-4">
                          <label className="md:hidden text-xs text-gray-500 mb-1 block">Descripción</label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Descripción del producto/servicio"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="md:hidden text-xs text-gray-500 mb-1 block">Cantidad</label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="md:hidden text-xs text-gray-500 mb-1 block">Precio</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="md:hidden text-xs text-gray-500 mb-1 block">Desc %</label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="md:hidden text-xs text-gray-500 mb-1 block">IVA %</label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.taxRate}
                            onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-10 md:col-span-2 flex items-center justify-end gap-2">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(itemTotals.total, currency)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => removeItem(index)}
                            disabled={items.length <= 1}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Notes & Terms */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notas y Términos</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas (visibles para el cliente)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Notas adicionales..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Términos y Condiciones
                    </label>
                    <textarea
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Términos y condiciones..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Summary */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IVA</span>
                    <span className="font-medium">{formatCurrency(totals.tax, currency)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-indigo-600">
                      {formatCurrency(totals.total, currency)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Crear Cotización
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                  >
                    Cancelar
                  </Button>
                </div>

                {/* Info */}
                <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-blue-700">
                      <p className="font-medium mb-1">Tip:</p>
                      <p>La cotización se creará como borrador. Podrás revisarla antes de enviarla al cliente.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </MainLayout>
  );
}
