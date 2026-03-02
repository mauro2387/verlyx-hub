'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useCompanyStore, useAuthStore } from '@/lib/store';

type Step = 'basic' | 'branding' | 'fiscal' | 'review';

export default function NewCompanyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createCompany } = useCompanyStore();
  
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Basic
    name: '',
    businessName: '',
    industry: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    
    // Step 2: Branding
    logo: '',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    
    // Step 3: Fiscal
    rut: '',
    taxRegime: '',
    address: '',
    city: '',
    country: 'Uruguay',
  });

  const steps: { id: Step; title: string; description: string }[] = [
    { id: 'basic', title: 'Datos Básicos', description: 'Información general de la empresa' },
    { id: 'branding', title: 'Marca', description: 'Logo y colores corporativos' },
    { id: 'fiscal', title: 'Información Fiscal', description: 'Datos impositivos y legales' },
    { id: 'review', title: 'Revisar', description: 'Confirma la información' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 'basic':
        if (!formData.name.trim()) {
          setError('El nombre de la empresa es obligatorio');
          return false;
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
          setError('Ingresa un email válido');
          return false;
        }
        break;
      case 'branding':
        // Optional step
        break;
      case 'fiscal':
        if (!formData.country.trim()) {
          setError('Selecciona un país');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const newCompany = await createCompany({
        name: formData.name,
        business_name: formData.businessName || formData.name,
        industry: formData.industry || null,
        description: formData.description || null,
        website: formData.website || null,
        phone: formData.phone || null,
        email: formData.email,
        logo_url: formData.logo || null,
        primary_color: formData.primaryColor,
        secondary_color: formData.secondaryColor,
        rut: formData.rut || null,
        tax_regime: formData.taxRegime || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country,
        owner_id: user!.id,
      });

      // Redirect to company dashboard
      router.push('/my-companies');
    } catch (err: any) {
      console.error('Error creating company:', err);
      setError(err.message || 'Error al crear la empresa. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Crear Nueva Empresa"
        description="Configura tu empresa en pocos pasos"
      />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      index <= currentStepIndex
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${
                      index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-colors ${
                      index < currentStepIndex ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <Card>
          <div className="p-6">
            {currentStep === 'basic' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Información Básica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        label="Nombre de la Empresa *"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Ej: Mi Empresa S.A."
                        required
                      />
                    </div>
                    <Input
                      label="Razón Social"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      placeholder="Nombre legal de la empresa"
                    />
                    <Select
                      label="Industria"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                    >
                      <option value="">Selecciona una industria</option>
                      <option value="technology">Tecnología</option>
                      <option value="services">Servicios</option>
                      <option value="retail">Retail</option>
                      <option value="manufacturing">Manufactura</option>
                      <option value="construction">Construcción</option>
                      <option value="consulting">Consultoría</option>
                      <option value="marketing">Marketing</option>
                      <option value="finance">Finanzas</option>
                      <option value="healthcare">Salud</option>
                      <option value="education">Educación</option>
                      <option value="other">Otra</option>
                    </Select>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Describe brevemente tu empresa..."
                      />
                    </div>
                    <Input
                      label="Email Corporativo *"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contacto@empresa.com"
                      required
                    />
                    <Input
                      label="Teléfono"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+598 99 123 456"
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Sitio Web"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://www.empresa.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Identidad Visual</h3>
                  <div className="space-y-4">
                    <div>
                      <Input
                        label="URL del Logo"
                        value={formData.logo}
                        onChange={(e) => handleInputChange('logo', e.target.value)}
                        placeholder="https://ejemplo.com/logo.png"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Puedes subir tu logo después desde la configuración de empresa
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color Primario
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.primaryColor}
                            onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                            className="h-10 w-16 rounded cursor-pointer"
                          />
                          <Input
                            value={formData.primaryColor}
                            onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                            placeholder="#6366f1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color Secundario
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.secondaryColor}
                            onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                            className="h-10 w-16 rounded cursor-pointer"
                          />
                          <Input
                            value={formData.secondaryColor}
                            onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                            placeholder="#8b5cf6"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-6 p-6 border-2 border-gray-200 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-3">Vista Previa</p>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-xl"
                          style={{
                            background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})`
                          }}
                        >
                          {formData.name.charAt(0).toUpperCase() || 'E'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{formData.name || 'Mi Empresa'}</p>
                          <p className="text-sm text-gray-500">{formData.industry || 'Industria'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'fiscal' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Información Fiscal y Legal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="RUT / NIF / Tax ID"
                      value={formData.rut}
                      onChange={(e) => handleInputChange('rut', e.target.value)}
                      placeholder="12-345678-9"
                    />
                    <Input
                      label="Régimen Fiscal"
                      value={formData.taxRegime}
                      onChange={(e) => handleInputChange('taxRegime', e.target.value)}
                      placeholder="Ej: Monotributo, IVA"
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Dirección Fiscal"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Calle, número, departamento"
                      />
                    </div>
                    <Input
                      label="Ciudad"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Montevideo"
                    />
                    <Select
                      label="País *"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      required
                    >
                      <option value="Uruguay">Uruguay</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Brasil">Brasil</option>
                      <option value="Chile">Chile</option>
                      <option value="Paraguay">Paraguay</option>
                      <option value="Perú">Perú</option>
                      <option value="Colombia">Colombia</option>
                      <option value="México">México</option>
                      <option value="España">España</option>
                      <option value="Otro">Otro</option>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'review' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Revisa la Información</h3>
                  
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="font-medium text-gray-900 mb-3">Información Básica</h4>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-gray-500">Nombre</dt>
                          <dd className="font-medium text-gray-900">{formData.name}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Industria</dt>
                          <dd className="font-medium text-gray-900">{formData.industry || '-'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Email</dt>
                          <dd className="font-medium text-gray-900">{formData.email}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Teléfono</dt>
                          <dd className="font-medium text-gray-900">{formData.phone || '-'}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Branding */}
                    <div className="border-b border-gray-200 pb-4">
                      <h4 className="font-medium text-gray-900 mb-3">Marca</h4>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-white text-2xl"
                          style={{
                            background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor})`
                          }}
                        >
                          {formData.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-500">Color Primario: <span className="font-medium text-gray-900">{formData.primaryColor}</span></p>
                          <p className="text-gray-500">Color Secundario: <span className="font-medium text-gray-900">{formData.secondaryColor}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Fiscal */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Información Fiscal</h4>
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-gray-500">RUT / Tax ID</dt>
                          <dd className="font-medium text-gray-900">{formData.rut || '-'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">País</dt>
                          <dd className="font-medium text-gray-900">{formData.country}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-gray-500">Dirección</dt>
                          <dd className="font-medium text-gray-900">{formData.address || '-'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || isSubmitting}
            >
              Atrás
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/my-companies')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>

              {currentStepIndex < steps.length - 1 ? (
                <Button onClick={handleNext}>
                  Siguiente
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creando...' : 'Crear Empresa'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
