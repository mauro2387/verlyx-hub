'use client';

import { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Badge, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

interface Notification {
  id: string;
  type: 'task' | 'project' | 'payment' | 'deal' | 'system' | 'reminder' | 'mention' | 'contact' | 'deadline' | 'message';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  action_url?: string;
  related_type?: string;
  related_id?: string;
  related_name?: string;
  metadata?: any;
}

const typeConfig = {
  task: { icon: '✓', color: 'bg-purple-100 text-purple-700', iconBg: 'bg-purple-500' },
  project: { icon: '📁', color: 'bg-blue-100 text-blue-700', iconBg: 'bg-blue-500' },
  payment: { icon: '💰', color: 'bg-green-100 text-green-700', iconBg: 'bg-green-500' },
  deal: { icon: '🤝', color: 'bg-orange-100 text-orange-700', iconBg: 'bg-orange-500' },
  system: { icon: '⚙️', color: 'bg-gray-100 text-gray-700', iconBg: 'bg-gray-500' },
  reminder: { icon: '🔔', color: 'bg-yellow-100 text-yellow-700', iconBg: 'bg-yellow-500' },
  mention: { icon: '@', color: 'bg-indigo-100 text-indigo-700', iconBg: 'bg-indigo-500' },
  contact: { icon: '👤', color: 'bg-teal-100 text-teal-700', iconBg: 'bg-teal-500' },
  deadline: { icon: '⏰', color: 'bg-red-100 text-red-700', iconBg: 'bg-red-500' },
  message: { icon: '💬', color: 'bg-blue-100 text-blue-700', iconBg: 'bg-blue-500' },
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if in demo mode
  const isDemoMode = user?.id?.startsWith('demo') || false;

  // Load notifications
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      // Demo mode - show sample notifications
      setNotifications([
        {
          id: 'demo-1',
          type: 'task',
          title: 'Tarea asignada',
          message: 'Se te ha asignado la tarea "Revisar propuesta de diseño"',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          related_type: 'task',
          related_name: 'Revisar propuesta de diseño',
        },
        {
          id: 'demo-2',
          type: 'payment',
          title: 'Pago recibido',
          message: 'Has recibido un pago de $1,500 USD de Cliente Demo',
          is_read: false,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          related_type: 'payment',
        },
        {
          id: 'demo-3',
          type: 'project',
          title: 'Proyecto actualizado',
          message: 'El proyecto "App Móvil" ha cambiado a estado "En Progreso"',
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          read_at: new Date(Date.now() - 43200000).toISOString(),
          related_type: 'project',
          related_name: 'App Móvil',
        },
        {
          id: 'demo-4',
          type: 'reminder',
          title: 'Recordatorio',
          message: 'Reunión con el equipo mañana a las 10:00 AM',
          is_read: true,
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 'demo-5',
          type: 'system',
          title: 'Modo Demo Activo',
          message: 'Estás viendo notificaciones de demostración. Inicia sesión con Supabase para ver notificaciones reales.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    // Real mode - load from database
    loadNotifications();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isDemoMode]);

  const loadNotifications = async () => {
    if (!user?.id || isDemoMode) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.is_read) return false;
    if (filterRead === 'read' && !n.is_read) return false;
    return true;
  });

  const markAsRead = async (id: string) => {
    if (!user?.id) return;
    
    if (isDemoMode) {
      // Demo mode - just update local state
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ));
      return;
    }
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true, user_id: user.id }),
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    if (isDemoMode) {
      // Demo mode - just update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      return;
    }
    
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      setNotifications(notifications.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user?.id) return;
    
    if (isDemoMode) {
      // Demo mode - just update local state
      setNotifications(notifications.filter(n => n.id !== id));
      return;
    }
    
    try {
      const response = await fetch(`/api/notifications/${id}?user_id=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <MainLayout>
        <PageHeader title="Notificaciones" description="Cargando..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Notificaciones"
        description={`${unreadCount} notificaciones sin leer`}
        actions={
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Marcar todo como leído
          </Button>
        }
      />

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className="w-64 space-y-6">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Filtros</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Estado</p>
                <div className="space-y-1">
                  {[
                    { value: 'all', label: 'Todas', count: notifications.length },
                    { value: 'unread', label: 'Sin leer', count: unreadCount },
                    { value: 'read', label: 'Leídas', count: notifications.length - unreadCount },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilterRead(option.value as typeof filterRead)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                        filterRead === option.value
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{option.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Tipo</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      filterType === 'all' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    Todos los tipos
                  </button>
                  {Object.entries(typeConfig).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                        filterType === type ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span>{config.icon}</span>
                      <span className="capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center text-3xl mb-3">
                🔔
              </div>
              <p className="text-3xl font-bold text-gray-900">{unreadCount}</p>
              <p className="text-sm text-gray-500">Sin leer</p>
            </div>
          </Card>
        </div>

        {/* Notifications List */}
        <div className="flex-1">
          <Card>
            {filteredNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">🔔</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Sin notificaciones</h3>
                <p className="text-gray-500">No hay notificaciones que mostrar con los filtros actuales</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      setSelectedNotification(notification);
                      if (!notification.is_read) markAsRead(notification.id);
                    }}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${typeConfig[notification.type].iconBg}`}>
                        {typeConfig[notification.type].icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">{getTimeAgo(notification.created_at)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig[notification.type].color}`}>
                            {notification.type}
                          </span>
                          {notification.related_name && (
                            <span className="text-xs text-gray-500 truncate max-w-[200px]">
                              → {notification.related_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <Modal
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          title="Notificación"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl ${typeConfig[selectedNotification.type].iconBg}`}>
                {typeConfig[selectedNotification.type].icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedNotification.title}</h3>
                <span className={`inline-flex mt-1 text-xs px-2 py-0.5 rounded-full ${typeConfig[selectedNotification.type].color}`}>
                  {selectedNotification.type}
                </span>
              </div>
            </div>

            <p className="text-gray-600">{selectedNotification.message}</p>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Recibida</p>
              <p className="font-medium text-gray-900">
                {new Date(selectedNotification.created_at).toLocaleString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {selectedNotification.related_name && (
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-600">Relacionado con</p>
                <p className="font-medium text-indigo-900">{selectedNotification.related_name}</p>
                {selectedNotification.related_type && (
                  <p className="text-xs text-indigo-600 mt-1">Tipo: {selectedNotification.related_type}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedNotification(null)}>Cerrar</Button>
              {selectedNotification.action_url && (
                <Button onClick={() => {
                  setSelectedNotification(null);
                  window.location.href = selectedNotification.action_url!;
                }}>
                  Ver detalle
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
