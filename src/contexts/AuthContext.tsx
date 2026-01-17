/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - CONTEXTO DE AUTENTICACIÓN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Maneja la sesión del usuario, autenticación y permisos.
 * Integrado con UserService para validación real de credenciales.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as UserService from '../services/user/UserService';
import type { User, UserRole, UserPermissions } from '../services/user/UserService';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  permissions: UserPermissions;
  phone?: string;
  avatar?: string;
  unitIds: string[];
  buildingIds: string[];
  // Para compatibilidad con el sistema actual
  apartment?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Acciones
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; needsApproval?: boolean }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  
  // Permisos
  hasPermission: (permission: keyof UserPermissions) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'aquarela_auth_session';

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión guardada al iniciar
  useEffect(() => {
    const loadSession = () => {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const session = JSON.parse(saved) as { userId: string; expiresAt: string };
          
          // Verificar que no haya expirado
          if (new Date(session.expiresAt) > new Date()) {
            const userData = UserService.getUser(session.userId);
            if (userData && userData.status === 'active') {
              setUser(mapUserToAuthUser(userData));
            } else {
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
          } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error('Error loading auth session:', e);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Mapear User del servicio a AuthUser
  const mapUserToAuthUser = (serviceUser: User): AuthUser => {
    // buildingIds viene de unitAssociations O de buildingAccess (para admins)
    const buildingIdsFromUnits = serviceUser.unitAssociations.map(a => a.buildingId);
    const allBuildingIds = [...new Set([...buildingIdsFromUnits, ...(serviceUser.buildingAccess || [])])];
    
    return {
      id: serviceUser.id,
      email: serviceUser.email,
      firstName: serviceUser.profile.firstName,
      lastName: serviceUser.profile.lastName,
      fullName: `${serviceUser.profile.firstName} ${serviceUser.profile.lastName}`,
      role: serviceUser.role,
      permissions: serviceUser.permissions,
      phone: serviceUser.profile.phone,
      avatar: serviceUser.profile.avatar,
      unitIds: serviceUser.unitAssociations.map(a => a.unitId),
      buildingIds: allBuildingIds,
      // Para compatibilidad - tomar la primera unidad
      apartment: serviceUser.unitAssociations[0]?.unitNumber,
    };
  };

  // Login
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      const result = await UserService.validateCredentials(email, password);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error?.message || 'Credenciales inválidas' };
      }

      const userData = result.data;

      // Verificar estado del usuario
      if (userData.status === 'pending_approval') {
        return { success: false, error: 'Tu cuenta está pendiente de aprobación' };
      }
      
      if (userData.status === 'suspended') {
        return { success: false, error: 'Tu cuenta está suspendida. Contacta al administrador.' };
      }
      
      if (userData.status === 'inactive') {
        return { success: false, error: 'Tu cuenta está inactiva' };
      }

      // Crear sesión (24 horas)
      const session = {
        userId: userData.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      
      setUser(mapUserToAuthUser(userData));
      
      return { success: true };
    } catch (e) {
      console.error('Login error:', e);
      return { success: false, error: 'Error al iniciar sesión' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  // Registro
  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string; needsApproval?: boolean }> => {
    try {
      const result = await UserService.createUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role || 'owner',
        password: data.password,
      });

      if (!result.success) {
        return { success: false, error: result.error?.message || 'Error al registrar' };
      }

      // Los owners necesitan aprobación
      if (data.role === 'owner' || !data.role) {
        return { success: true, needsApproval: true };
      }

      return { success: true };
    } catch (e) {
      console.error('Register error:', e);
      return { success: false, error: 'Error al registrar' };
    }
  }, []);

  // Cambiar contraseña
  const changePassword = useCallback(async (
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No hay sesión activa' };
    }

    try {
      const result = await UserService.changePassword(user.id, currentPassword, newPassword);
      
      if (!result.success) {
        return { success: false, error: result.error?.message || 'Error al cambiar contraseña' };
      }

      return { success: true };
    } catch (e) {
      console.error('Change password error:', e);
      return { success: false, error: 'Error al cambiar contraseña' };
    }
  }, [user]);

  // Actualizar perfil
  const updateProfile = useCallback(async (data: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No hay sesión activa' };
    }

    try {
      const result = await UserService.updateUser(user.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatar: data.avatar,
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error?.message || 'Error al actualizar perfil' };
      }

      setUser(mapUserToAuthUser(result.data));
      return { success: true };
    } catch (e) {
      console.error('Update profile error:', e);
      return { success: false, error: 'Error al actualizar perfil' };
    }
  }, [user]);

  // Verificar permiso
  const hasPermission = useCallback((permission: keyof UserPermissions): boolean => {
    if (!user) return false;
    return user.permissions[permission] === true;
  }, [user]);

  // Verificar rol
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    changePassword,
    updateProfile,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para verificar si el usuario tiene acceso a una funcionalidad.
 */
export function usePermission(permission: keyof UserPermissions): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

/**
 * Hook para verificar el rol del usuario.
 */
export function useRole(role: UserRole | UserRole[]): boolean {
  const { hasRole } = useAuth();
  return hasRole(role);
}

/**
 * Hook que retorna el ID del edificio activo.
 * Por ahora retorna el primer edificio asociado.
 */
export function useActiveBuildingId(): string | null {
  const { user } = useAuth();
  return user?.buildingIds[0] || null;
}

/**
 * Hook que retorna el ID de la unidad activa.
 * Por ahora retorna la primera unidad asociada.
 */
export function useActiveUnitId(): string | null {
  const { user } = useAuth();
  return user?.unitIds[0] || null;
}
