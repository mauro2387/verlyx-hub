/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - TEST HELPERS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Helpers para probar los servicios desde la consola del navegador.
 * 
 * USO:
 * 1. Abre la aplicación en el navegador
 * 2. Abre la consola (F12 → Console)
 * 3. Escribe: window.aquarela
 * 4. Verás todos los servicios disponibles
 * 
 * EJEMPLOS:
 * 
 * // Crear un edificio
 * await window.aquarela.building.create({
 *   name: 'Torre Aquarela',
 *   address: 'Av. Principal 123',
 *   totalUnits: 50
 * })
 * 
 * // Ver edificios
 * window.aquarela.building.list()
 * 
 * // Crear una unidad
 * await window.aquarela.unit.create({
 *   buildingId: 'ID_DEL_EDIFICIO',
 *   floor: 5,
 *   number: '501',
 *   type: 'apartment'
 * })
 * 
 * // Crear un usuario
 * await window.aquarela.user.create({
 *   email: 'propietario@test.com',
 *   firstName: 'Juan',
 *   lastName: 'Pérez',
 *   role: 'owner'
 * })
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Building Service
import * as BuildingService from './building/BuildingService';

// Unit Service
import * as UnitService from './unit/UnitService';

// User Service
import * as UserService from './user/UserService';

// Financial Service
import * as FinancialService from './financial/FinancialService';

// Reservation Service
import * as ReservationService from './reservation/ReservationService';

// Announcement Service
import * as AnnouncementService from './announcement/AnnouncementService';

// Maintenance Service
import * as MaintenanceService from './maintenance/MaintenanceService';

// Access Service
import * as AccessService from './accessService';

// Data Access Layer
import { generateUUID, nowISO } from './repository/DataAccessLayer';

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea datos de prueba completos para demostrar el sistema.
 */
export async function setupDemoData() {
  console.log('🏗️ Creando datos de demostración...\n');
  
  // 1. Crear edificio
  console.log('1️⃣ Creando edificio...');
  const buildingResult = await BuildingService.createBuilding({
    name: 'Torre Aquarela Premium',
    address: 'Av. Las Palmas 500, Asunción',
    totalUnits: 24,
    totalFloors: 8,
    amenities: ['gym', 'pool', 'sauna', 'quincho', 'salon_events'],
    adminContact: {
      name: 'María González',
      phone: '+595 981 123456',
      email: 'admin@aquarela.com.py',
    },
  });
  
  if (!buildingResult.success) {
    console.error('❌ Error creando edificio:', buildingResult.error);
    return null;
  }
  
  const building = buildingResult.data!;
  console.log('✅ Edificio creado:', building.name, `(ID: ${building.id})`);
  
  // 2. Crear unidades
  console.log('\n2️⃣ Creando unidades...');
  const units: Awaited<ReturnType<typeof UnitService.createUnit>>['data'][] = [];
  
  for (let floor = 1; floor <= 3; floor++) {
    for (const apt of ['A', 'B']) {
      const unitResult = await UnitService.createUnit({
        buildingId: building.id,
        floor,
        number: `${floor}${apt}`,
        type: 'apartment',
        area: apt === 'A' ? 120 : 85,
        rooms: apt === 'A' ? 3 : 2,
        bathrooms: apt === 'A' ? 2 : 1,
        hasBalcony: true,
        hasParking: true,
        parkingSpots: apt === 'A' ? 2 : 1,
      });
      
      if (unitResult.success && unitResult.data) {
        units.push(unitResult.data);
        console.log(`  ✅ Unidad ${unitResult.data.number} creada`);
      }
    }
  }
  
  // 3. Crear usuarios
  console.log('\n3️⃣ Creando usuarios...');
  
  const adminResult = await UserService.createUser({
    email: 'admin@aquarela.com.py',
    firstName: 'María',
    lastName: 'González',
    phone: '+595 981 123456',
    role: 'admin',
    password: 'Admin123!',
  });
  
  if (adminResult.success) {
    // Auto-aprobar admin
    await UserService.approveUser(adminResult.data!.id, 'Auto-aprobado para demo');
    console.log('  ✅ Admin creado y aprobado:', adminResult.data!.email);
  }
  
  // Crear propietarios para las primeras 3 unidades
  const owners: Awaited<ReturnType<typeof UserService.createUser>>['data'][] = [];
  const ownerNames = [
    { firstName: 'Carlos', lastName: 'Rodríguez', email: 'carlos@test.com' },
    { firstName: 'Ana', lastName: 'Martínez', email: 'ana@test.com' },
    { firstName: 'Pedro', lastName: 'López', email: 'pedro@test.com' },
  ];
  
  for (let i = 0; i < 3 && i < units.length; i++) {
    const ownerResult = await UserService.createUser({
      email: ownerNames[i].email,
      firstName: ownerNames[i].firstName,
      lastName: ownerNames[i].lastName,
      phone: `+595 98${i + 1} 000${i + 1}00`,
      role: 'owner',
      password: 'Owner123!',
    });
    
    if (ownerResult.success && ownerResult.data) {
      await UserService.approveUser(ownerResult.data.id, 'Demo');
      owners.push(ownerResult.data);
      console.log(`  ✅ Propietario ${ownerNames[i].firstName} creado`);
      
      // Asociar a unidad
      if (units[i]) {
        await UnitService.addOwner(units[i]!.id, {
          userId: ownerResult.data.id,
          ownershipPercentage: 100,
          isPrimary: true,
        });
        console.log(`    → Asociado a unidad ${units[i]!.number}`);
      }
    }
  }
  
  // 4. Crear amenidades
  console.log('\n4️⃣ Creando amenidades reservables...');
  
  const amenities = [
    {
      buildingId: building.id,
      name: 'Quincho con Parrilla',
      description: 'Quincho techado con parrilla, mesada y heladera',
      type: 'quincho' as const,
      capacity: 30,
      pricing: { type: 'block' as const, price: 150000 },
      bookingRules: { minAdvanceHours: 24, maxAdvanceDays: 30, maxDurationHours: 8 },
    },
    {
      buildingId: building.id,
      name: 'Salón de Eventos',
      description: 'Salón climatizado para eventos especiales',
      type: 'salon_events' as const,
      capacity: 50,
      pricing: { type: 'block' as const, price: 300000 },
      bookingRules: { minAdvanceHours: 48, maxAdvanceDays: 60, maxDurationHours: 12 },
    },
    {
      buildingId: building.id,
      name: 'Gimnasio',
      description: 'Gimnasio equipado 24/7',
      type: 'gym' as const,
      capacity: 10,
      pricing: { type: 'free' as const },
      bookingRules: { minAdvanceHours: 0, maxAdvanceDays: 7, maxDurationHours: 2 },
    },
  ];
  
  const createdAmenities: Awaited<ReturnType<typeof ReservationService.createAmenity>>['data'][] = [];
  
  for (const amenity of amenities) {
    const result = await ReservationService.createAmenity(amenity);
    if (result.success && result.data) {
      createdAmenities.push(result.data);
      console.log(`  ✅ ${amenity.name} creada`);
    }
  }
  
  // 5. Crear anuncios
  console.log('\n5️⃣ Creando anuncios...');
  
  const announcementResult = await AnnouncementService.createAnnouncement({
    buildingId: building.id,
    title: 'Bienvenidos al Sistema AQUARELA',
    content: 'Estimados residentes, nos complace presentarles el nuevo sistema de gestión del edificio. Aquí podrán realizar reservas, ver estados de cuenta, y mucho más.',
    type: 'news',
    priority: 'high',
    publishAt: nowISO(),
  });
  
  if (announcementResult.success) {
    await AnnouncementService.publishAnnouncement(announcementResult.data!.id);
    console.log('  ✅ Anuncio de bienvenida creado y publicado');
  }
  
  // Crear actividad
  const activityResult = await AnnouncementService.createActivity({
    buildingId: building.id,
    title: 'Asamblea General Ordinaria',
    description: 'Asamblea anual para aprobación de presupuesto y elección de comisión directiva.',
    type: 'meeting',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // En 7 días
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 horas después
    location: 'Salón de Eventos',
    maxParticipants: 50,
    requiresRegistration: true,
  });
  
  if (activityResult.success) {
    console.log('  ✅ Actividad "Asamblea" creada');
  }
  
  // 6. Crear cargos financieros
  console.log('\n6️⃣ Creando cargos financieros...');
  
  for (let i = 0; i < 3 && i < units.length; i++) {
    const unit = units[i];
    if (!unit) continue;
    
    const chargeResult = await FinancialService.createCharge({
      buildingId: building.id,
      unitId: unit.id,
      concept: 'Expensas Ordinarias - Enero 2026',
      amount: unit.number.endsWith('A') ? 850000 : 650000,
      dueDate: '2026-01-31',
      type: 'expense',
      description: 'Expensas ordinarias del mes',
    });
    
    if (chargeResult.success) {
      console.log(`  ✅ Cargo creado para unidad ${unit.number}: Gs. ${chargeResult.data!.amount.toLocaleString()}`);
    }
  }
  
  // 7. Crear solicitud de mantenimiento
  console.log('\n7️⃣ Creando solicitud de mantenimiento...');
  
  if (units[0] && owners[0]) {
    const maintenanceResult = await MaintenanceService.createMaintenanceRequest({
      buildingId: building.id,
      unitId: units[0].id,
      requestedBy: owners[0].id,
      category: 'plumbing',
      priority: 'medium',
      title: 'Pérdida de agua en baño principal',
      description: 'Hay una pequeña pérdida de agua debajo del lavatorio del baño principal. Se nota humedad en el piso.',
    });
    
    if (maintenanceResult.success) {
      console.log('  ✅ Solicitud de mantenimiento creada:', maintenanceResult.data!.ticketNumber);
    }
  }
  
  // Resumen
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 DATOS DE DEMOSTRACIÓN CREADOS EXITOSAMENTE');
  console.log('═'.repeat(60));
  console.log(`
📊 Resumen:
   • 1 Edificio: ${building.name}
   • ${units.length} Unidades creadas
   • ${owners.length + 1} Usuarios (1 admin + ${owners.length} propietarios)
   • ${createdAmenities.length} Amenidades reservables
   • 2 Anuncios/Actividades
   • ${Math.min(3, units.length)} Cargos financieros
   • 1 Solicitud de mantenimiento

🔑 Credenciales de prueba:
   Admin: admin@aquarela.com.py / Admin123!
   Propietario: carlos@test.com / Owner123!

💡 Para explorar los datos:
   window.aquarela.building.list()
   window.aquarela.unit.list('${building.id}')
   window.aquarela.user.list()
   window.aquarela.financial.getStatement('${building.id}', '${units[0]?.id || ''}')
`);
  
  return {
    building,
    units,
    owners,
    amenities: createdAmenities,
  };
}

/**
 * Limpia todos los datos de localStorage.
 */
export function clearAllData() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('aquarela_'));
  keys.forEach(k => localStorage.removeItem(k));
  console.log(`🗑️ Eliminados ${keys.length} registros de localStorage`);
  return keys;
}

/**
 * Muestra estadísticas de los datos almacenados.
 */
export function showStats() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('aquarela_'));
  
  console.log('\n📊 ESTADÍSTICAS DE DATOS ALMACENADOS');
  console.log('═'.repeat(50));
  
  let totalSize = 0;
  const stats: { key: string; count: number; size: number }[] = [];
  
  for (const key of keys) {
    const value = localStorage.getItem(key) || '[]';
    const size = new Blob([value]).size;
    totalSize += size;
    
    let count = 0;
    try {
      const parsed = JSON.parse(value);
      count = Array.isArray(parsed) ? parsed.length : 1;
    } catch {
      count = 1;
    }
    
    stats.push({ key: key.replace('aquarela_', ''), count, size });
  }
  
  stats.sort((a, b) => b.count - a.count);
  
  for (const stat of stats) {
    const sizeKB = (stat.size / 1024).toFixed(2);
    console.log(`  ${stat.key}: ${stat.count} registros (${sizeKB} KB)`);
  }
  
  console.log('─'.repeat(50));
  console.log(`  TOTAL: ${(totalSize / 1024).toFixed(2)} KB en ${keys.length} colecciones`);
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPOSE TO WINDOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface AquarelaTestAPI {
  // Services
  building: {
    create: typeof BuildingService.createBuilding;
    get: typeof BuildingService.getBuilding;
    list: typeof BuildingService.listBuildings;
    update: typeof BuildingService.updateBuilding;
    stats: typeof BuildingService.getBuildingStatistics;
  };
  unit: {
    create: typeof UnitService.createUnit;
    get: typeof UnitService.getUnit;
    list: typeof UnitService.getUnitsByBuilding;
    update: typeof UnitService.updateUnit;
    addOwner: typeof UnitService.addOwner;
    addTenant: typeof UnitService.addTenant;
    stats: typeof UnitService.getUnitStatistics;
  };
  user: {
    create: typeof UserService.createUser;
    get: typeof UserService.getUser;
    list: typeof UserService.listUsers;
    approve: typeof UserService.approveUser;
    reject: typeof UserService.rejectUser;
    changePassword: typeof UserService.changePassword;
    linkToUnit: typeof UserService.linkUserToUnit;
  };
  financial: {
    createCharge: typeof FinancialService.createCharge;
    recordPayment: typeof FinancialService.recordPayment;
    getStatement: typeof FinancialService.generateAccountStatement;
    getDebt: typeof FinancialService.calculateDebtSummary;
    listTransactions: typeof FinancialService.listTransactions;
  };
  reservation: {
    createAmenity: typeof ReservationService.createAmenity;
    listAmenities: typeof ReservationService.listAmenities;
    getAvailability: typeof ReservationService.getAvailability;
    createReservation: typeof ReservationService.createReservation;
    cancelReservation: typeof ReservationService.cancelReservation;
    listReservations: typeof ReservationService.listReservations;
  };
  announcement: {
    create: typeof AnnouncementService.createAnnouncement;
    publish: typeof AnnouncementService.publishAnnouncement;
    list: typeof AnnouncementService.listAnnouncements;
    createActivity: typeof AnnouncementService.createActivity;
    registerForActivity: typeof AnnouncementService.registerForActivity;
    listActivities: typeof AnnouncementService.listActivities;
  };
  maintenance: {
    create: typeof MaintenanceService.createMaintenanceRequest;
    approve: typeof MaintenanceService.approveRequest;
    assign: typeof MaintenanceService.assignProvider;
    complete: typeof MaintenanceService.completeRequest;
    list: typeof MaintenanceService.listMaintenanceRequests;
    createProvider: typeof MaintenanceService.createProvider;
  };
  access: {
    create: typeof AccessService.createAccessAuthorization;
    approve: typeof AccessService.approveAccessAuthorization;
    list: typeof AccessService.listAccessAuthorizations;
    registerUsage: typeof AccessService.registerAccessUsage;
  };
  
  // Utilities
  utils: {
    generateUUID: typeof generateUUID;
    nowISO: typeof nowISO;
  };
  
  // Test helpers
  setupDemoData: typeof setupDemoData;
  clearAllData: typeof clearAllData;
  showStats: typeof showStats;
}

export function initializeTestAPI(): AquarelaTestAPI {
  const api: AquarelaTestAPI = {
    building: {
      create: BuildingService.createBuilding,
      get: BuildingService.getBuilding,
      list: BuildingService.listBuildings,
      update: BuildingService.updateBuilding,
      stats: BuildingService.getBuildingStatistics,
    },
    unit: {
      create: UnitService.createUnit,
      get: UnitService.getUnit,
      list: UnitService.getUnitsByBuilding,
      update: UnitService.updateUnit,
      addOwner: UnitService.addOwner,
      addTenant: UnitService.addTenant,
      stats: UnitService.getUnitStatistics,
    },
    user: {
      create: UserService.createUser,
      get: UserService.getUser,
      list: UserService.listUsers,
      approve: UserService.approveUser,
      reject: UserService.rejectUser,
      changePassword: UserService.changePassword,
      linkToUnit: UserService.linkUserToUnit,
    },
    financial: {
      createCharge: FinancialService.createCharge,
      recordPayment: FinancialService.recordPayment,
      getStatement: FinancialService.generateAccountStatement,
      getDebt: FinancialService.calculateDebtSummary,
      listTransactions: FinancialService.listTransactions,
    },
    reservation: {
      createAmenity: ReservationService.createAmenity,
      listAmenities: ReservationService.listAmenities,
      getAvailability: ReservationService.getAvailability,
      createReservation: ReservationService.createReservation,
      cancelReservation: ReservationService.cancelReservation,
      listReservations: ReservationService.listReservations,
    },
    announcement: {
      create: AnnouncementService.createAnnouncement,
      publish: AnnouncementService.publishAnnouncement,
      list: AnnouncementService.listAnnouncements,
      createActivity: AnnouncementService.createActivity,
      registerForActivity: AnnouncementService.registerForActivity,
      listActivities: AnnouncementService.listActivities,
    },
    maintenance: {
      create: MaintenanceService.createMaintenanceRequest,
      approve: MaintenanceService.approveRequest,
      assign: MaintenanceService.assignProvider,
      complete: MaintenanceService.completeRequest,
      list: MaintenanceService.listMaintenanceRequests,
      createProvider: MaintenanceService.createProvider,
    },
    access: {
      create: AccessService.createAccessAuthorization,
      approve: AccessService.approveAccessAuthorization,
      list: AccessService.listAccessAuthorizations,
      registerUsage: AccessService.registerAccessUsage,
    },
    utils: {
      generateUUID,
      nowISO,
    },
    setupDemoData,
    clearAllData,
    showStats,
  };
  
  // Expose to window
  (window as unknown as { aquarela: AquarelaTestAPI }).aquarela = api;
  
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                    🎨 AQUARELA TEST API READY                         ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  Escribe window.aquarela en la consola para ver los servicios         ║
║                                                                       ║
║  🚀 INICIO RÁPIDO:                                                    ║
║     await window.aquarela.setupDemoData()                             ║
║                                                                       ║
║  📊 VER ESTADÍSTICAS:                                                 ║
║     window.aquarela.showStats()                                       ║
║                                                                       ║
║  🗑️  LIMPIAR DATOS:                                                   ║
║     window.aquarela.clearAllData()                                    ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
`);
  
  return api;
}
