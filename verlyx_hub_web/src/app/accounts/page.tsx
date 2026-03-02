'use client';

import { useEffect, useState } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Loading, Modal, Input, Select, StatCard, ConfirmDialog, Badge } from '@/components/ui';
import { useAccountsStore, useCompanyStore } from '@/lib/store';
import { Account } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function AccountsPage() {
  const { accounts, isLoading, fetchAccounts, addAccount, updateAccount, deleteAccount, getTotalBalance } = useAccountsStore();
  const { selectedCompanyId } = useCompanyStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as 'cash' | 'bank' | 'mercadopago' | 'stripe' | 'paypal' | 'other',
    currency: 'UYU',
    bankName: '',
    accountNumber: '',
    initialBalance: '0',
    color: '#3B82F6',
    icon: '💵',
  });

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const typeConfig = {
    cash: { label: 'Efectivo', icon: '💵', color: '#10B981' },
    bank: { label: 'Banco', icon: '🏦', color: '#3B82F6' },
    mercadopago: { label: 'MercadoPago', icon: '💳', color: '#00B1EA' },
    stripe: { label: 'Stripe', icon: '💳', color: '#635BFF' },
    paypal: { label: 'PayPal', icon: '💳', color: '#0070BA' },
    other: { label: 'Otro', icon: '💰', color: '#6B7280' },
  };

  const accountsByType = accounts.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  const stats = {
    total: accounts.length,
    totalBalance: getTotalBalance(),
    cash: accounts.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.currentBalance, 0),
    bank: accounts.filter(a => a.type === 'bank').reduce((sum, a) => sum + a.currentBalance, 0),
    digital: accounts.filter(a => ['mercadopago', 'stripe', 'paypal'].includes(a.type)).reduce((sum, a) => sum + a.currentBalance, 0),
  };

  const handleOpenModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        currency: account.currency,
        bankName: account.bankName || '',
        accountNumber: account.accountNumber || '',
        initialBalance: account.initialBalance.toString(),
        color: account.color || '#3B82F6',
        icon: account.icon || '💵',
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        type: 'cash',
        currency: 'UYU',
        bankName: '',
        accountNumber: '',
        initialBalance: '0',
        color: '#3B82F6',
        icon: '💵',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const accountData = {
      myCompanyId: selectedCompanyId || 'demo-company-1',
      name: formData.name,
      type: formData.type,
      currency: formData.currency,
      bankName: formData.bankName || undefined,
      accountNumber: formData.accountNumber || undefined,
      initialBalance: parseFloat(formData.initialBalance),
      currentBalance: parseFloat(formData.initialBalance),
      isActive: true,
      color: formData.color,
      icon: formData.icon,
    };

    if (editingAccount) {
      await updateAccount(editingAccount.id, accountData);
    } else {
      await addAccount(accountData);
    }
    
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleDelete = async () => {
    if (accountToDelete) {
      await deleteAccount(accountToDelete.id);
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
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
        title="🏦 Cuentas y Cajas"
        description="Gestiona efectivo, bancos y pasarelas de pago"
        actions={
          <Button onClick={() => handleOpenModal()}>
            ➕ Nueva Cuenta
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Balance Total"
          value={formatCurrency(stats.totalBalance)}
          description={`${stats.total} cuentas`}
          color="blue"
        />
        <StatCard
          title="Efectivo"
          value={formatCurrency(stats.cash)}
          color="green"
        />
        <StatCard
          title="Bancos"
          value={formatCurrency(stats.bank)}
          color="indigo"
        />
        <StatCard
          title="Digital"
          value={formatCurrency(stats.digital)}
          description="MP, Stripe, PayPal"
          color="purple"
        />
      </div>

      {/* Accounts by Type */}
      <div className="space-y-6">
        {Object.entries(typeConfig).map(([type, config]) => {
          const typeAccounts = accountsByType[type] || [];
          if (typeAccounts.length === 0) return null;

          return (
            <Card key={type}>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span style={{ fontSize: '24px' }}>{config.icon}</span>
                    {config.label}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {typeAccounts.length} cuenta{typeAccounts.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      style={{ borderLeftWidth: '4px', borderLeftColor: account.color || config.color }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ fontSize: '20px' }}>{account.icon || config.icon}</span>
                            <h4 className="font-semibold">{account.name}</h4>
                          </div>
                          {account.bankName && (
                            <div className="text-sm text-gray-500">{account.bankName}</div>
                          )}
                          {account.accountNumber && (
                            <div className="text-xs text-gray-400">***{account.accountNumber.slice(-4)}</div>
                          )}
                        </div>
                        <Badge variant={account.isActive ? 'success' : 'default'}>
                          {account.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>

                      <div className="mb-3 pt-3 border-t">
                        <div className="text-2xl font-bold" style={{ color: account.color || config.color }}>
                          {formatCurrency(account.currentBalance, account.currency)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Balance inicial: {formatCurrency(account.initialBalance, account.currency)}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(account)}
                          className="flex-1"
                        >
                          ✏️ Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAccountToDelete(account);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {accounts.length === 0 && (
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏦</div>
                <h3 className="text-xl font-semibold mb-2">No hay cuentas configuradas</h3>
                <p className="text-gray-500 mb-6">
                  Crea tu primera cuenta para empezar a gestionar el dinero de tu empresa
                </p>
                <Button onClick={() => handleOpenModal()}>
                  ➕ Crear Primera Cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Formulario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Nombre de la Cuenta *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ej: Caja Principal, Cuenta BROU, MercadoPago Verlyx"
            />

            <Select
              label="Tipo de Cuenta *"
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as keyof typeof typeConfig;
                const config = typeConfig[newType];
                setFormData({ 
                  ...formData, 
                  type: newType,
                  icon: config.icon,
                  color: config.color,
                });
              }}
              required
              options={Object.entries(typeConfig).map(([value, config]) => ({
                value,
                label: `${config.icon} ${config.label}`,
              }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Balance Inicial *"
                type="number"
                step="0.01"
                value={formData.initialBalance}
                onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                required
                placeholder="0.00"
                disabled={!!editingAccount}
              />
              
              <Select
                label="Moneda *"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                required
                options={[
                  { value: 'UYU', label: 'UYU (Pesos Uruguayos)' },
                  { value: 'USD', label: 'USD (Dólares)' },
                  { value: 'EUR', label: 'EUR (Euros)' },
                ]}
              />
            </div>

            {formData.type === 'bank' && (
              <>
                <Input
                  label="Nombre del Banco"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Ej: BROU, Santander, Itaú"
                />

                <Input
                  label="Número de Cuenta"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Ej: 001234567890"
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Icono
                </label>
                <Select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  options={[
                    { value: '💵', label: '💵 Dinero' },
                    { value: '🏦', label: '🏦 Banco' },
                    { value: '💳', label: '💳 Tarjeta' },
                    { value: '💰', label: '💰 Tesoro' },
                    { value: '🏪', label: '🏪 Comercio' },
                    { value: '📱', label: '📱 Digital' },
                    { value: '💎', label: '💎 Premium' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Color
                </label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" variant="primary" className="flex-1">
              {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingAccount(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Cuenta"
        message={`¿Estás seguro de que deseas eliminar la cuenta "${accountToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </MainLayout>
  );
}
