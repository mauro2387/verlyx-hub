/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - SERVICE HOOKS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Hooks de React para consumir los servicios de forma reactiva.
 * Manejan estado de carga, errores y refetch automático.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useActiveBuildingId, useActiveUnitId } from '../contexts/AuthContext';

// Services
import * as BuildingService from '../services/building/BuildingService';
import * as UnitService from '../services/unit/UnitService';
import * as UserService from '../services/user/UserService';
import * as FinancialService from '../services/financial/FinancialService';
import * as ReservationService from '../services/reservation/ReservationService';
import * as AnnouncementService from '../services/announcement/AnnouncementService';
import * as MaintenanceService from '../services/maintenance/MaintenanceService';
import * as AccessService from '../services/accessService';

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC HOOK STATE
// ═══════════════════════════════════════════════════════════════════════════════

interface UseServiceState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseServiceListState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDING HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para obtener todos los edificios.
 */
export function useBuildings(): UseServiceListState<BuildingService.Building> {
  const [data, setData] = useState<BuildingService.Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const result = BuildingService.listBuildings();
      setData(result.data);
    } catch (e) {
      setError('Error al cargar edificios');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para obtener un edificio específico.
 */
export function useBuilding(buildingId: string | null): UseServiceState<BuildingService.Building> {
  const [data, setData] = useState<BuildingService.Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!buildingId) {
      setData(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const result = BuildingService.getBuilding(buildingId);
      if (result) {
        setData(result);
      } else {
        setError('Edificio no encontrado');
      }
    } catch (e) {
      setError('Error al cargar edificio');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para obtener estadísticas del edificio activo.
 */
export function useBuildingStats() {
  const buildingId = useActiveBuildingId();
  const [stats, setStats] = useState<ReturnType<typeof BuildingService.getBuildingStatistics> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      setIsLoading(true);
      const result = BuildingService.getBuildingStatistics(buildingId);
      setStats(result);
      setIsLoading(false);
    }
  }, [buildingId]);

  return { stats, isLoading, buildingId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para obtener las unidades de un edificio.
 */
export function useUnits(buildingId?: string): UseServiceListState<UnitService.Unit> {
  const activeBuildingId = useActiveBuildingId();
  const effectiveBuildingId = buildingId || activeBuildingId;
  
  const [data, setData] = useState<UnitService.Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!effectiveBuildingId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = UnitService.getUnitsByBuilding(effectiveBuildingId);
      setData(result);
    } catch (e) {
      setError('Error al cargar unidades');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveBuildingId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para obtener una unidad específica.
 */
export function useUnit(unitId: string | null): UseServiceState<UnitService.Unit> {
  const [data, setData] = useState<UnitService.Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!unitId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = UnitService.getUnit(unitId);
      setData(result);
    } catch (e) {
      setError('Error al cargar unidad');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para la unidad activa del usuario.
 */
export function useMyUnit(): UseServiceState<UnitService.Unit> {
  const unitId = useActiveUnitId();
  return useUnit(unitId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para listar usuarios con filtros.
 */
export function useUsers(filters?: UserService.UserFilters): UseServiceListState<UserService.User> {
  const [data, setData] = useState<UserService.User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Memoizar filtros para evitar re-renders infinitos
  const filtersKey = JSON.stringify(filters || {});

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const result = UserService.listUsers(filters);
      setData(result.data);
    } catch (e) {
      setError('Error al cargar usuarios');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para usuarios pendientes de aprobación.
 */
export function usePendingUsers(): UseServiceListState<UserService.User> {
  return useUsers({ status: 'pending_approval' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para obtener el estado de cuenta de una unidad.
 */
export function useAccountStatement(unitId?: string, months = 12) {
  const activeUnitId = useActiveUnitId();
  const activeBuildingId = useActiveBuildingId();
  const effectiveUnitId = unitId || activeUnitId;

  const [statement, setStatement] = useState<ReturnType<typeof FinancialService.generateAccountStatement> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!effectiveUnitId || !activeBuildingId) {
      setStatement(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = FinancialService.generateAccountStatement(activeBuildingId, effectiveUnitId, months);
      setStatement(result);
    } catch (e) {
      setError('Error al cargar estado de cuenta');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUnitId, activeBuildingId, months]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { statement, isLoading, error, refetch: fetch };
}

/**
 * Hook para obtener el resumen de deuda de una unidad.
 */
export function useDebtSummary(unitId?: string) {
  const activeUnitId = useActiveUnitId();
  const activeBuildingId = useActiveBuildingId();
  const effectiveUnitId = unitId || activeUnitId;

  const [debt, setDebt] = useState<ReturnType<typeof FinancialService.calculateDebtSummary> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!effectiveUnitId || !activeBuildingId) {
      setDebt(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = FinancialService.calculateDebtSummary(activeBuildingId, effectiveUnitId);
    setDebt(result);
    setIsLoading(false);
  }, [effectiveUnitId, activeBuildingId]);

  return { debt, isLoading };
}

/**
 * Hook para listar transacciones.
 */
export function useTransactions(filters?: FinancialService.TransactionFilters) {
  const [data, setData] = useState<FinancialService.Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const result = FinancialService.listTransactions(filters);
      setData(result);
    } catch (e) {
      setError('Error al cargar transacciones');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para estadísticas financieras del edificio.
 */
export function useBuildingFinancialStats() {
  const buildingId = useActiveBuildingId();
  const [stats, setStats] = useState<ReturnType<typeof FinancialService.getBuildingFinancialStats> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      setIsLoading(true);
      const result = FinancialService.getBuildingFinancialStats(buildingId);
      setStats(result);
      setIsLoading(false);
    }
  }, [buildingId]);

  return { stats, isLoading, buildingId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESERVATION HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para listar amenidades del edificio.
 */
export function useAmenities(buildingId?: string): UseServiceListState<ReservationService.Amenity> {
  const activeBuildingId = useActiveBuildingId();
  const effectiveBuildingId = buildingId || activeBuildingId;

  const [data, setData] = useState<ReservationService.Amenity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const result = ReservationService.listAmenities(effectiveBuildingId || undefined);
      setData(result);
    } catch (e) {
      setError('Error al cargar amenidades');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveBuildingId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para obtener disponibilidad de una amenidad.
 */
export function useAmenityAvailability(amenityId: string | null, date: string) {
  const [slots, setSlots] = useState<ReservationService.TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!amenityId || !date) {
      setSlots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = ReservationService.getAvailability(amenityId, date);
    setSlots(result);
    setIsLoading(false);
  }, [amenityId, date]);

  return { slots, isLoading };
}

/**
 * Hook para reservas del usuario.
 */
export function useMyReservations() {
  const { user } = useAuth();
  const [data, setData] = useState<ReservationService.Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!user) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = ReservationService.listReservations({ requestedBy: user.id });
      setData(result.data);
    } catch (e) {
      setError('Error al cargar reservas');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para todas las reservas (admin).
 */
export function useAllReservations(filters?: ReservationService.ReservationFilters) {
  const buildingId = useActiveBuildingId();
  const [data, setData] = useState<ReservationService.Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const result = ReservationService.listReservations({ ...filters, buildingId: buildingId || undefined });
      setData(result.data);
    } catch (e) {
      setError('Error al cargar reservas');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para anuncios del edificio.
 */
export function useAnnouncements(filters?: AnnouncementService.AnnouncementFilters) {
  const buildingId = useActiveBuildingId();
  const [data, setData] = useState<AnnouncementService.Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const result = AnnouncementService.listAnnouncements({ ...filters, buildingId: buildingId || undefined });
      setData(result.data);
    } catch (e) {
      setError('Error al cargar anuncios');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para anuncios publicados (solo activos para residentes).
 */
export function usePublishedAnnouncements() {
  return useAnnouncements({ status: 'published' });
}

/**
 * Hook para actividades/eventos del edificio.
 */
export function useActivities(filters?: AnnouncementService.ActivityFilters) {
  const buildingId = useActiveBuildingId();
  const [data, setData] = useState<AnnouncementService.Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const result = AnnouncementService.listActivities({ ...filters, buildingId: buildingId || undefined });
      setData(result.data);
    } catch (e) {
      setError('Error al cargar actividades');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para próximas actividades.
 */
export function useUpcomingActivities() {
  const buildingId = useActiveBuildingId();
  const [data, setData] = useState<AnnouncementService.Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      setIsLoading(true);
      const result = AnnouncementService.getUpcomingActivities(buildingId);
      setData(result);
      setIsLoading(false);
    }
  }, [buildingId]);

  return { data, isLoading };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para solicitudes de mantenimiento del usuario.
 */
export function useMyMaintenanceRequests() {
  const { user } = useAuth();
  const [data, setData] = useState<MaintenanceService.MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!user) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = MaintenanceService.getUserRequests(user.id);
      setData(result);
    } catch (e) {
      setError('Error al cargar solicitudes');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para todas las solicitudes de mantenimiento (admin).
 */
export function useAllMaintenanceRequests(filters?: MaintenanceService.MaintenanceFilters) {
  const buildingId = useActiveBuildingId();
  const [data, setData] = useState<MaintenanceService.MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const result = MaintenanceService.listMaintenanceRequests({ ...filters, buildingId: buildingId || undefined });
      setData(result);
    } catch (e) {
      setError('Error al cargar solicitudes');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para solicitudes pendientes de mantenimiento.
 */
export function usePendingMaintenanceRequests() {
  const buildingId = useActiveBuildingId();
  const [data, setData] = useState<MaintenanceService.MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      setIsLoading(true);
      const result = MaintenanceService.getPendingRequests(buildingId);
      setData(result);
      setIsLoading(false);
    }
  }, [buildingId]);

  return { data, isLoading };
}

/**
 * Hook para estadísticas de mantenimiento.
 */
export function useMaintenanceStats() {
  const buildingId = useActiveBuildingId();
  const [stats, setStats] = useState<ReturnType<typeof MaintenanceService.getMaintenanceStatistics> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      setIsLoading(true);
      const result = MaintenanceService.getMaintenanceStatistics(buildingId);
      setStats(result);
      setIsLoading(false);
    }
  }, [buildingId]);

  return { stats, isLoading };
}

/**
 * Hook para proveedores de servicio.
 */
export function useServiceProviders(category?: MaintenanceService.MaintenanceCategory) {
  const buildingId = useActiveBuildingId();
  const [data, setData] = useState<MaintenanceService.ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      setIsLoading(true);
      let result: MaintenanceService.ServiceProvider[];
      if (category) {
        result = MaintenanceService.getProvidersByCategory(buildingId, category);
      } else {
        result = MaintenanceService.listProviders(buildingId);
      }
      setData(result);
      setIsLoading(false);
    }
  }, [buildingId, category]);

  return { data, isLoading };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para autorizaciones de acceso de una unidad.
 */
export function useMyAccessAuthorizations() {
  const unitId = useActiveUnitId();
  const [data, setData] = useState<AccessService.listAccessAuthorizations extends (...args: unknown[]) => { data: infer T } ? T : never>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!unitId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = AccessService.getAuthorizationsByUnit(unitId);
      setData(result);
    } catch (e) {
      setError('Error al cargar autorizaciones');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

/**
 * Hook para estadísticas de acceso del edificio.
 */
export function useAccessStats() {
  const buildingId = useActiveBuildingId();
  const [stats, setStats] = useState<ReturnType<typeof AccessService.getAccessStatistics> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      setIsLoading(true);
      const result = AccessService.getAccessStatistics(buildingId);
      setStats(result);
      setIsLoading(false);
    }
  }, [buildingId]);

  return { stats, isLoading };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED DASHBOARD HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook combinado para el dashboard del propietario.
 */
export function useOwnerDashboard() {
  const { user } = useAuth();
  const { debt, isLoading: debtLoading } = useDebtSummary();
  const { statement, isLoading: statementLoading } = useAccountStatement(undefined, 6);
  const { data: reservations, isLoading: reservationsLoading, refetch: refetchReservations } = useMyReservations();
  const { data: maintenance, isLoading: maintenanceLoading, refetch: refetchMaintenance } = useMyMaintenanceRequests();
  const { data: announcements, isLoading: announcementsLoading } = usePublishedAnnouncements();
  const { data: activities, isLoading: activitiesLoading } = useUpcomingActivities();
  const { data: accessAuthorizations, isLoading: accessLoading, refetch: refetchAccess } = useMyAccessAuthorizations();

  const isLoading = debtLoading || statementLoading || reservationsLoading || maintenanceLoading || announcementsLoading || activitiesLoading || accessLoading;

  const refetchAll = useCallback(() => {
    refetchReservations();
    refetchMaintenance();
    refetchAccess();
  }, [refetchReservations, refetchMaintenance, refetchAccess]);

  return {
    user,
    debt,
    statement,
    reservations,
    maintenance,
    announcements,
    activities,
    accessAuthorizations,
    isLoading,
    refetchAll,
  };
}

/**
 * Hook combinado para el dashboard del admin.
 */
export function useAdminDashboard() {
  const { user } = useAuth();
  const { stats: buildingStats, isLoading: buildingLoading } = useBuildingStats();
  const { stats: financialStats, isLoading: financialLoading } = useBuildingFinancialStats();
  const { stats: maintenanceStats, isLoading: maintenanceLoading } = useMaintenanceStats();
  const { stats: accessStats, isLoading: accessLoading } = useAccessStats();
  const { data: pendingUsers, isLoading: pendingUsersLoading, refetch: refetchUsers } = usePendingUsers();
  const { data: users, isLoading: usersLoading, refetch: refetchAllUsers } = useUsers();
  const { data: pendingMaintenance, isLoading: pendingMaintenanceLoading, refetch: refetchMaintenance } = usePendingMaintenanceRequests();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: announcements, isLoading: announcementsLoading } = usePublishedAnnouncements();

  const isLoading = buildingLoading || financialLoading || maintenanceLoading || accessLoading || usersLoading || pendingUsersLoading || pendingMaintenanceLoading || unitsLoading || announcementsLoading;

  const refetchAll = useCallback(() => {
    refetchUsers();
    refetchAllUsers();
    refetchMaintenance();
  }, [refetchUsers, refetchAllUsers, refetchMaintenance]);

  return {
    user,
    buildingStats,
    financialStats,
    maintenanceStats,
    accessStats,
    pendingUsers,
    users,
    pendingMaintenance,
    units,
    announcements,
    isLoading,
    refetchAll,
    refetchUsers,
    refetchMaintenance,
  };
}
