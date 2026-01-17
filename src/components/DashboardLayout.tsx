import { Link, useLocation } from 'react-router-dom';
import { Building2, Home, Users, Briefcase, Brain, MessageSquare, LogOut, Menu, X, FileText, Bell, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect, useRef } from 'react';

interface DashboardLayoutProps {
  user: { role: 'owner' | 'admin' | 'staff' | 'reception'; name: string; apartment?: string };
  onLogout: () => void;
  children: React.ReactNode;
}

export default function DashboardLayout({ user, onLogout, children }: DashboardLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Simulamos notificaciones de tareas completadas
  const [notifications] = useState([
    {
      id: 1,
      title: 'Tarea de mantenimiento completada',
      message: 'La reparación del aire acondicionado en tu apartamento ha sido finalizada.',
      time: '2 min',
      read: false,
      type: 'maintenance'
    },
    {
      id: 2,
      title: 'Solicitud de mantenimiento atendida',
      message: 'El problema de plomería reportado ha sido resuelto satisfactoriamente.',
      time: '1 hora',
      read: false,
      type: 'maintenance'
    },
    {
      id: 3,
      title: 'Experiencia aprobada',
      message: 'Tu propuesta "Yoga matutino en terraza" ha sido aprobada para implementación.',
      time: '3 horas',
      read: true,
      type: 'experience'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navigation = {
    owner: [
      { name: 'Panel', href: '/dashboard/owner', icon: Home },
      { name: 'Enviar Sugerencias', href: '/suggestions', icon: FileText },
      { name: 'Red Comunitaria', href: '/social', icon: MessageSquare }
    ],
    admin: [
      { name: 'Panel', href: '/dashboard/admin', icon: Home },
      { name: 'Centro IA', href: '/ai-center', icon: Brain },
      { name: 'Leer Sugerencias', href: '/admin/suggestions', icon: Mail },
      { name: 'Red Comunitaria', href: '/social', icon: MessageSquare }
    ],
    staff: [
      { name: 'Mis Tareas', href: '/dashboard/staff', icon: Briefcase },
      { name: 'Red Comunitaria', href: '/social', icon: MessageSquare }
    ],
    reception: [
      { name: 'Panel Recepción', href: '/dashboard/reception', icon: Home },
      { name: 'Visitantes', href: '/reception/visitors', icon: Users },
      { name: 'Red Comunitaria', href: '/social', icon: MessageSquare }
    ]
  };

  const navItems = navigation[user.role];

  // Cerrar dropdown de notificaciones al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-[#0A1E40] text-white border-b border-white/10 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="w-8 h-8 bg-[#C9A961] rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>Aquarela</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors relative"
                >
                  <Bell className="w-5 h-5 text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <>
                    {/* Mobile Overlay */}
                    <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setNotificationsOpen(false)} />
                    
                    <div className="absolute right-0 sm:right-0 top-12 w-screen sm:w-96 bg-white rounded-none sm:rounded-xl shadow-2xl border-0 sm:border border-gray-100 z-50 overflow-hidden max-w-none sm:max-w-96">
                      <div className="bg-gradient-to-r from-[#0A1E40] to-[#0f2952] p-4 text-white">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-lg">Notificaciones</h3>
                          <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                {unreadCount} nuevas
                              </span>
                            )}
                            <button 
                              onClick={() => setNotificationsOpen(false)}
                              className="sm:hidden p-1 rounded-full hover:bg-white/20 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="max-h-[70vh] sm:max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                                !notification.read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                                  !notification.read ? 'bg-blue-500' : 'bg-gray-300'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-[#0A1E40] text-sm leading-tight">
                                    {notification.title}
                                  </h4>
                                  <p className="text-gray-600 text-sm mt-1 leading-relaxed line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-400">{notification.time}</span>
                                    {notification.type === 'maintenance' && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                        Mantenimiento
                                      </span>
                                    )}
                                    {notification.type === 'experience' && (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                                        Experiencia
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No hay notificaciones</p>
                            <p className="text-gray-400 text-sm">Te notificaremos cuando haya actualizaciones</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 bg-gray-50 border-t border-gray-100">
                        <button 
                          className="w-full text-sm text-[#0A1E40] hover:text-[#0f2952] font-semibold py-2 rounded-lg hover:bg-white transition-colors"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          Ver todas las notificaciones →
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="text-right hidden sm:block">
                  <div style={{ fontWeight: 700 }}>{user.name}</div>
                  <div className="text-gray-300 text-sm">
                    {user.role === 'owner' && user.apartment ? `Apto ${user.apartment}` : (
                      user.role === 'owner' ? 'Propietario' : user.role === 'admin' ? 'Administrador' : 'Personal'
                    )}
                  </div>
                </div>
              <div className="w-10 h-10 bg-[#C9A961] rounded-full flex items-center justify-center">
                <span style={{ fontWeight: 700 }}>{user.name.charAt(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-30
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-[#0A1E40] text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span style={{ fontWeight: isActive ? 700 : 400 }}>{item.name}</span>
                </Link>
              );
            })}
            
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={onLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
