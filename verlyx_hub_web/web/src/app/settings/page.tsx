'use client';

import { useState } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, Input, Select, Avatar } from '@/components/ui';
import { useAuthStore, useCompanyStore } from '@/lib/store';

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuthStore();
  const { selectedCompany } = useCompanyStore();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'appearance'>('profile');
  const [saving, setSaving] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: '',
    position: 'Administrador',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    dealUpdates: true,
    weeklyReport: false,
    marketingEmails: false,
  });

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [language, setLanguage] = useState('es');

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      updateProfile({ fullName: profileForm.fullName });
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { id: 'notifications', label: 'Notificaciones', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )},
    { id: 'security', label: 'Seguridad', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )},
    { id: 'appearance', label: 'Apariencia', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    )},
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Configuración"
        description="Administra tu perfil y preferencias"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="flex flex-col items-center mb-6">
              <Avatar 
                name={user?.fullName || user?.name || 'Usuario'} 
                size="xl" 
                color="#6366f1"
              />
              <h3 className="mt-3 font-semibold text-gray-900">{user?.fullName || user?.name}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
              {selectedCompany && (
                <span className="mt-2 px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                  {selectedCompany.name}
                </span>
              )}
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre Completo"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                  <Input
                    label="Correo Electrónico"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    label="Teléfono"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 234 567 890"
                  />
                  <Input
                    label="Cargo"
                    value={profileForm.position}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, position: e.target.value }))}
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </Card>

              <Card className="p-6 border-red-100">
                <h3 className="text-lg font-semibold text-red-600 mb-2">Zona de Peligro</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Acciones irreversibles relacionadas con tu cuenta.
                </p>
                <Button variant="danger" onClick={logout}>
                  Cerrar Sesión
                </Button>
              </Card>
            </>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Preferencias de Notificaciones</h3>
              <div className="space-y-6">
                {[
                  { key: 'emailNotifications', label: 'Notificaciones por Email', description: 'Recibe actualizaciones importantes por correo' },
                  { key: 'pushNotifications', label: 'Notificaciones Push', description: 'Alertas en tiempo real en tu navegador' },
                  { key: 'taskReminders', label: 'Recordatorios de Tareas', description: 'Recibe recordatorios de tareas próximas a vencer' },
                  { key: 'dealUpdates', label: 'Actualizaciones de Oportunidades', description: 'Notificaciones cuando cambien las oportunidades' },
                  { key: 'weeklyReport', label: 'Reporte Semanal', description: 'Resumen semanal de actividad' },
                  { key: 'marketingEmails', label: 'Emails de Marketing', description: 'Ofertas y novedades del producto' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{setting.label}</p>
                      <p className="text-sm text-gray-500">{setting.description}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings(prev => ({ 
                        ...prev, 
                        [setting.key]: !prev[setting.key as keyof typeof notificationSettings] 
                      }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notificationSettings[setting.key as keyof typeof notificationSettings]
                          ? 'bg-indigo-600'
                          : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          notificationSettings[setting.key as keyof typeof notificationSettings]
                            ? 'translate-x-6'
                            : ''
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Seguridad de la Cuenta</h3>
              
              <div className="space-y-6">
                <div className="pb-6 border-b">
                  <h4 className="font-medium text-gray-900 mb-4">Cambiar Contraseña</h4>
                  <div className="space-y-4 max-w-md">
                    <Input
                      label="Contraseña Actual"
                      type="password"
                      placeholder="••••••••"
                    />
                    <Input
                      label="Nueva Contraseña"
                      type="password"
                      placeholder="••••••••"
                    />
                    <Input
                      label="Confirmar Nueva Contraseña"
                      type="password"
                      placeholder="••••••••"
                    />
                    <Button>Actualizar Contraseña</Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Autenticación de Dos Factores</h4>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">2FA no habilitado</p>
                      <p className="text-sm text-gray-500">Añade una capa extra de seguridad</p>
                    </div>
                    <Button variant="outline">Configurar</Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Sesiones Activas</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Windows • Chrome</p>
                          <p className="text-sm text-gray-500">Sesión actual • Activo ahora</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Actual</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Apariencia</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Tema</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'light', label: 'Claro', icon: '☀️' },
                      { id: 'dark', label: 'Oscuro', icon: '🌙' },
                      { id: 'system', label: 'Sistema', icon: '💻' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setTheme(option.id as typeof theme)}
                        className={`p-4 rounded-xl border-2 text-center transition-colors ${
                          theme === option.id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl block mb-2">{option.icon}</span>
                        <span className="font-medium text-gray-900">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Idioma</h4>
                  <div className="max-w-xs">
                    <Select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      options={[
                        { value: 'es', label: '🇪🇸 Español' },
                        { value: 'en', label: '🇺🇸 English' },
                        { value: 'pt', label: '🇧🇷 Português' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
