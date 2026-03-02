'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor ingresa tu email y contraseña');
      return;
    }

    const success = await login(email, password);
    if (success) {
      router.push('/dashboard');
    } else {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              V
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">Verlyx Hub</h1>
          <p className="text-indigo-200 mt-2">Plataforma de gestión empresarial</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error && !email ? 'Email requerido' : undefined}
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error && !password ? 'Contraseña requerida' : undefined}
            />

            {error && email && password && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Ingresar
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center">
              ¿No tienes cuenta?{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Regístrate
              </a>
            </p>
          </div>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
            <p className="text-xs text-indigo-600 text-center">
              <strong>Demo:</strong> Ingresa cualquier email y contraseña para acceder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
