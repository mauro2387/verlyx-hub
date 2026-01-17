import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import ServicesPage from './components/ServicesPage';
import SubmitCVPage from './components/SubmitCVPage';
import LoginPage from './components/LoginPage';
import OwnerDashboard from './components/OwnerDashboard';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';
import ReceptionDashboard from './components/ReceptionDashboard';
import SocialNetwork from './components/SocialNetwork';
import AICenter from './components/AICenter';
import SuggestionsPage from './components/SuggestionsPage';
import AdminSuggestionsPage from './components/AdminSuggestionsPage';

// ═══════════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('owner' | 'admin' | 'staff' | 'super_admin' | 'tenant' | 'visitor' | 'service_provider')[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0A1E40] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirigir al dashboard correspondiente al rol
    const dashboardRoutes: Record<string, string> = {
      owner: '/dashboard/owner',
      admin: '/dashboard/admin',
      staff: '/dashboard/staff',
      super_admin: '/dashboard/admin',
      tenant: '/dashboard/owner',
    };
    return <Navigate to={dashboardRoutes[user.role] || '/login'} replace />;
  }

  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

function AppRoutes() {
  const { user, isAuthenticated, logout } = useAuth();

  // Mapear el usuario de AuthContext al formato esperado por los componentes legacy
  const legacyUser = user ? {
    role: (user.role === 'super_admin' ? 'admin' : user.role === 'tenant' ? 'owner' : user.role) as 'owner' | 'admin' | 'staff' | 'reception',
    name: user.fullName,
    apartment: user.apartment,
  } : null;

  const handleLogout = () => {
    logout();
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/submit-cv" element={<SubmitCVPage />} />
      <Route 
        path="/login" 
        element={
          isAuthenticated 
            ? <Navigate to={`/dashboard/${legacyUser?.role || 'owner'}`} replace /> 
            : <LoginPage />
        } 
      />
      
      {/* Private Routes - Owner */}
      <Route
        path="/dashboard/owner"
        element={
          <ProtectedRoute allowedRoles={['owner', 'tenant']}>
            {legacyUser && <OwnerDashboard user={legacyUser} onLogout={handleLogout} />}
          </ProtectedRoute>
        }
      />

      {/* Private Routes - Admin */}
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            {legacyUser && <AdminDashboard user={legacyUser} onLogout={handleLogout} />}
          </ProtectedRoute>
        }
      />

      {/* Private Routes - Staff */}
      <Route
        path="/dashboard/staff"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            {legacyUser && <StaffDashboard user={legacyUser} onLogout={handleLogout} />}
          </ProtectedRoute>
        }
      />

      {/* Private Routes - Reception */}
      <Route
        path="/dashboard/reception"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            {legacyUser && <ReceptionDashboard user={legacyUser} onLogout={handleLogout} />}
          </ProtectedRoute>
        }
      />

      {/* Social Network */}
      <Route
        path="/social"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'staff', 'tenant']}>
            {legacyUser && (
              <SocialNetwork 
                user={legacyUser as { role: 'owner' | 'admin' | 'staff'; name: string; apartment?: string }} 
                onLogout={handleLogout} 
              />
            )}
          </ProtectedRoute>
        }
      />

      {/* AI Center - Admin Only */}
      <Route
        path="/ai-center"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            {legacyUser && (
              <AICenter 
                user={legacyUser as { role: 'admin'; name: string; apartment?: string }} 
                onLogout={handleLogout} 
              />
            )}
          </ProtectedRoute>
        }
      />

      {/* Suggestions - Owner */}
      <Route
        path="/suggestions"
        element={
          <ProtectedRoute allowedRoles={['owner', 'tenant']}>
            {legacyUser && (
              <SuggestionsPage 
                user={legacyUser as { role: 'owner'; name: string; apartment?: string }} 
                onLogout={handleLogout} 
              />
            )}
          </ProtectedRoute>
        }
      />

      {/* Admin Suggestions */}
      <Route
        path="/admin/suggestions"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            {legacyUser && (
              <AdminSuggestionsPage 
                user={legacyUser as { role: 'admin'; name: string; apartment?: string }} 
                onLogout={handleLogout} 
              />
            )}
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
