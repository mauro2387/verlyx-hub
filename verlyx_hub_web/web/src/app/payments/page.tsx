'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Input, Modal, Badge, EmptyState } from '@/components/ui';
import {
  Plus,
  Link as LinkIcon,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  RefreshCw,
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Send,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Mail,
  Globe,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Types
interface PaymentLink {
  id: string;
  order_id: string;
  external_id?: string;
  amount: number;
  currency: string;
  country: string;
  description: string;
  client_name?: string;
  client_email?: string;
  project_id?: string;
  deal_id?: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'error';
  payment_url?: string;
  expires_at?: string;
  paid_at?: string;
  created_at: string;
}

interface Payment {
  id: string;
  external_id?: string;
  order_id?: string;
  amount: number;
  currency: string;
  status: 'completed' | 'refunded' | 'partial_refund';
  payment_method?: string;
  client_name?: string;
  description?: string;
  paid_at?: string;
  created_at: string;
}

// Countries supported by dLocal
const COUNTRIES = [
  { code: 'UY', name: 'Uruguay', currency: 'UYU', flag: '🇺🇾' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil', currency: 'BRL', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', currency: 'CLP', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', currency: 'COP', flag: '🇨🇴' },
  { code: 'MX', name: 'México', currency: 'MXN', flag: '🇲🇽' },
  { code: 'PE', name: 'Perú', currency: 'PEN', flag: '🇵🇪' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', flag: '🇪🇨' },
];

// Simple QR Code generator using Google Charts API
function generateQRUrl(data: string, size: number = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function PaymentsPage() {
  // State
  const [activeTab, setActiveTab] = useState<'links' | 'payments' | 'analytics'>('links');
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    country: 'UY',
    description: '',
    client_name: '',
    client_email: '',
    expires_in_days: '7',
  });

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [linksRes, paymentsRes] = await Promise.all([
        supabase
          .from('payment_links')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .order('paid_at', { ascending: false }),
      ]);

      if (linksRes.data) setPaymentLinks(linksRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create payment link
  const createPaymentLink = async () => {
    if (!formData.amount || !formData.description) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          country: formData.country,
          description: formData.description,
          client_name: formData.client_name || undefined,
          client_email: formData.client_email || undefined,
          expires_in_days: parseInt(formData.expires_in_days),
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadData();
        setShowCreateModal(false);
        resetForm();
        
        // Show QR for the new link
        if (result.payment_link) {
          setSelectedLink(result.payment_link);
          setShowQRModal(true);
        }
      } else {
        alert(result.error || 'Error al crear el link de pago');
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert('Error al crear el link de pago');
    } finally {
      setIsCreating(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      amount: '',
      currency: 'USD',
      country: 'UY',
      description: '',
      client_name: '',
      client_email: '',
      expires_in_days: '7',
    });
  };

  // Delete payment link
  const deletePaymentLink = async (id: string) => {
    if (!confirm('¿Eliminar este link de pago?')) return;

    try {
      await supabase.from('payment_links').delete().eq('id', id);
      setPaymentLinks(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  // Show QR modal
  const showQR = (link: PaymentLink) => {
    setSelectedLink(link);
    setShowQRModal(true);
  };

  // Filter links
  const filteredLinks = paymentLinks.filter(link => {
    const matchesSearch = 
      link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.order_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    totalPending: paymentLinks.filter(l => l.status === 'pending').reduce((sum, l) => sum + l.amount, 0),
    totalReceived: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pendingCount: paymentLinks.filter(l => l.status === 'pending').length,
    paidCount: payments.filter(p => p.status === 'completed').length,
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-3 h-3" />, label: 'Pendiente' },
      paid: { color: 'bg-green-500/20 text-green-400', icon: <CheckCircle className="w-3 h-3" />, label: 'Pagado' },
      completed: { color: 'bg-green-500/20 text-green-400', icon: <CheckCircle className="w-3 h-3" />, label: 'Completado' },
      expired: { color: 'bg-gray-500/20 text-gray-400', icon: <Clock className="w-3 h-3" />, label: 'Expirado' },
      cancelled: { color: 'bg-red-500/20 text-red-400', icon: <XCircle className="w-3 h-3" />, label: 'Cancelado' },
      failed: { color: 'bg-red-500/20 text-red-400', icon: <XCircle className="w-3 h-3" />, label: 'Fallido' },
      error: { color: 'bg-red-500/20 text-red-400', icon: <AlertCircle className="w-3 h-3" />, label: 'Error' },
    };

    const cfg = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.icon}
        {cfg.label}
      </span>
    );
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-UY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Cargando pagos...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-600">
                <DollarSign className="w-6 h-6" />
              </div>
              Verlyx Pay
            </h1>
            <p className="text-gray-400 mt-1">Gestiona cobros y links de pago</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Crear Link de Pago
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-300/70">Pendiente de cobro</p>
                  <p className="text-2xl font-bold text-yellow-300">{formatCurrency(stats.totalPending)}</p>
                  <p className="text-xs text-yellow-400/60 mt-1">{stats.pendingCount} links activos</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-500/20">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300/70">Total recibido</p>
                  <p className="text-2xl font-bold text-green-300">{formatCurrency(stats.totalReceived)}</p>
                  <p className="text-xs text-green-400/60 mt-1">{stats.paidCount} pagos completados</p>
                </div>
                <div className="p-3 rounded-full bg-green-500/20">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300/70">Este mes</p>
                  <p className="text-2xl font-bold text-blue-300">
                    {formatCurrency(payments.filter(p => 
                      new Date(p.paid_at || p.created_at).getMonth() === new Date().getMonth()
                    ).reduce((sum, p) => sum + p.amount, 0))}
                  </p>
                  <p className="text-xs text-blue-400/60 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> vs mes anterior
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/20">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300/70">Tasa de conversión</p>
                  <p className="text-2xl font-bold text-purple-300">
                    {paymentLinks.length > 0 
                      ? Math.round((paymentLinks.filter(l => l.status === 'paid').length / paymentLinks.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-purple-400/60 mt-1">Links pagados vs creados</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Globe className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 pb-2">
          {[
            { id: 'links', label: 'Links de Pago', icon: LinkIcon },
            { id: 'payments', label: 'Pagos Recibidos', icon: CheckCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por descripción, cliente u orden..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="paid">Pagados</option>
                <option value="expired">Expirados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>

            {/* Links Table */}
            {filteredLinks.length === 0 ? (
              <EmptyState
                icon={<LinkIcon className="w-12 h-12" />}
                title="Sin links de pago"
                description="Crea tu primer link de pago para comenzar a cobrar"
                action={
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Link
                  </Button>
                }
              />
            ) : (
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Descripción</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Monto</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Creado</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredLinks.map(link => (
                      <tr key={link.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium">{link.description}</p>
                            <p className="text-xs text-gray-500">{link.order_id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-gray-300">{link.client_name || '-'}</p>
                            {link.client_email && (
                              <p className="text-xs text-gray-500">{link.client_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white font-medium">
                            {formatCurrency(link.amount, link.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(link.status)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {formatDate(link.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {link.payment_url && (
                              <>
                                <button
                                  onClick={() => showQR(link)}
                                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Ver QR"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => copyToClipboard(link.payment_url!, link.id)}
                                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Copiar link"
                                >
                                  {copiedId === link.id ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                                <a
                                  href={link.payment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Abrir link"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => deletePaymentLink(link.id)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            {payments.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="w-12 h-12" />}
                title="Sin pagos recibidos"
                description="Los pagos completados aparecerán aquí"
              />
            ) : (
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Descripción</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Monto</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Método</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {payments.map(payment => (
                      <tr key={payment.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium">{payment.description || 'Pago'}</p>
                            <p className="text-xs text-gray-500">{payment.order_id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {payment.client_name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-green-400 font-medium">
                            +{formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                            <CreditCard className="w-3 h-3" />
                            {payment.payment_method || 'Tarjeta'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {formatDate(payment.paid_at || payment.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Payment Link Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Crear Link de Pago"
        >
          <div className="space-y-4">
            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monto *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="100.00"
                  min="100"
                  step="0.01"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Mínimo: USD 100 (o equivalente)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Moneda
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="USD">USD - Dólares</option>
                  <option value="UYU">UYU - Pesos Uruguayos</option>
                  <option value="ARS">ARS - Pesos Argentinos</option>
                  <option value="BRL">BRL - Reales</option>
                  <option value="CLP">CLP - Pesos Chilenos</option>
                  <option value="MXN">MXN - Pesos Mexicanos</option>
                </select>
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                País del cliente
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Desarrollo Web - Proyecto Alpha"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Opcional"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email del cliente
                </label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                  placeholder="email@ejemplo.com"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Requerido para pagos reales con dLocal
                </p>
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expira en
              </label>
              <select
                value={formData.expires_in_days}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_in_days: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="1">1 día</option>
                <option value="3">3 días</option>
                <option value="7">7 días</option>
                <option value="15">15 días</option>
                <option value="30">30 días</option>
                <option value="60">60 días</option>
                <option value="90">90 días</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={createPaymentLink}
                disabled={!formData.amount || !formData.description || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Crear Link
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR Modal */}
      {showQRModal && selectedLink && (
        <Modal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          title="Link de Pago"
        >
          <div className="space-y-6 text-center">
            {/* QR Code */}
            {selectedLink.payment_url && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl">
                  <img 
                    src={generateQRUrl(selectedLink.payment_url)} 
                    alt="QR Code" 
                    className="w-64 h-64" 
                  />
                </div>
              </div>
            )}

            {/* Info */}
            <div className="space-y-2">
              <p className="text-xl font-bold text-white">
                {formatCurrency(selectedLink.amount, selectedLink.currency)}
              </p>
              <p className="text-gray-400">{selectedLink.description}</p>
              {selectedLink.client_name && (
                <p className="text-gray-500">Para: {selectedLink.client_name}</p>
              )}
            </div>

            {/* URL */}
            {selectedLink.payment_url && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                  <input
                    type="text"
                    value={selectedLink.payment_url}
                    readOnly
                    className="flex-1 bg-transparent text-gray-300 text-sm outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(selectedLink.payment_url!, 'modal')}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedId === 'modal' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={() => selectedLink.payment_url && copyToClipboard(selectedLink.payment_url, 'modal')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
              {selectedLink.client_email && (
                <Button
                  onClick={() => {
                    window.open(`mailto:${selectedLink.client_email}?subject=Link de pago - ${selectedLink.description}&body=Hola ${selectedLink.client_name || ''},\n\nTe comparto el link para realizar el pago de ${formatCurrency(selectedLink.amount, selectedLink.currency)}:\n\n${selectedLink.payment_url}\n\nGracias!`);
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar por Email
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
