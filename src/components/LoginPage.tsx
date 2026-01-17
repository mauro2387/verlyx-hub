import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(loginData.email, loginData.password);
      
      if (result.success) {
        toast.success('¡Bienvenido!');
        // La redirección se maneja automáticamente en App.tsx
      } else {
        setError(result.error || 'Error al iniciar sesión');
        toast.error(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión');
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login para desarrollo
  const quickLogin = async (email: string, password: string) => {
    setLoginData({ email, password });
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('¡Bienvenido!');
      } else {
        setError(result.error || 'Error al iniciar sesión');
        toast.error(result.error || 'Credenciales inválidas. Asegúrate de que los datos iniciales estén cargados.');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1E40]/90 to-[#0A1E40]/60 z-10" />
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1653895168758-411ef6038015?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDF8fHx8MTc2MTc3MTQyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Edificio Aquarela"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#C9A961] rounded-lg flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.5rem' }}>Aquarela</span>
          </div>
          <h1 className="mb-4" style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 }}>
            Bienvenido a tu Hogar Inteligente
          </h1>
          <p className="text-gray-200" style={{ fontSize: '1.125rem' }}>
            Accede a tu panel personalizado y gestiona tu experiencia de vida de lujo con facilidad.
          </p>
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#C9A961] rounded-full" />
              <span>Gestión de cuenta en tiempo real</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#C9A961] rounded-full" />
              <span>Solicitudes de mantenimiento instantáneas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#C9A961] rounded-full" />
              <span>Reserva fácil de amenidades</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0A1E40] to-[#1a3a6e] rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-[#0A1E40]" style={{ fontWeight: 700, fontSize: '1.5rem' }}>Aquarela</span>
          </div>

          <Card className="p-8">
            <div className="mb-6">
              <h2 className="text-[#0A1E40] mb-2" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                Iniciar Sesión
              </h2>
              <p className="text-gray-600">Ingresa tus credenciales para acceder a tu cuenta</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block mb-2 text-[#0A1E40]">Correo Electrónico</label>
                <Input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="tu@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block mb-2 text-[#0A1E40]">Contraseña</label>
                <Input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-gray-600">Recordarme</span>
                </label>
                <a href="#" className="text-[#C9A961] hover:underline">¿Olvidaste tu contraseña?</a>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#0A1E40] hover:bg-[#0f2952] text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>

            {/* Quick Login Buttons */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 mb-3"><strong>Acceso Rápido (Demo):</strong></p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => quickLogin('owner@aquarela.com.py', 'owner123')}
                  disabled={isLoading}
                >
                  Propietario
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => quickLogin('admin@aquarela.com.py', 'admin123')}
                  disabled={isLoading}
                >
                  Administrador
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => quickLogin('staff@aquarela.com.py', 'staff123')}
                  disabled={isLoading}
                >
                  Personal
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => quickLogin('reception@aquarela.com.py', 'reception123')}
                  disabled={isLoading}
                >
                  Recepción
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Los datos se cargan automáticamente al iniciar
              </p>
            </div>
          </Card>

          <div className="text-center mt-6">
            <Link to="/" className="text-gray-600 hover:text-[#0A1E40] transition-colors">
              ← Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}