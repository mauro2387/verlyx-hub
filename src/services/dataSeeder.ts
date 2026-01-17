/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AQUARELA - DATA SEEDER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Inicializa datos base si el localStorage está vacío.
 * Crea un edificio, unidades, usuarios demo y datos de ejemplo.
 */

import * as BuildingService from '../services/building/BuildingService';
import * as UnitService from '../services/unit/UnitService';
import * as UserService from '../services/user/UserService';
import * as FinancialService from '../services/financial/FinancialService';
import * as ReservationService from '../services/reservation/ReservationService';
import * as AnnouncementService from '../services/announcement/AnnouncementService';
import { nowISO } from '../services/repository/DataAccessLayer';

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK IF DATA EXISTS
// ═══════════════════════════════════════════════════════════════════════════════

export function hasExistingData(): boolean {
  try {
    const buildings = BuildingService.listBuildings();
    return Array.isArray(buildings) && buildings.length > 0;
  } catch (e) {
    console.error('Error checking existing data:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface SeedResult {
  success: boolean;
  buildingId?: string;
  adminId?: string;
  error?: string;
}

export async function seedInitialData(): Promise<SeedResult> {
  try {
    console.log('🌱 Iniciando seed de datos...');

    // Actor del sistema para auditoría
    const systemActor = {
      userId: 'system',
      name: 'Sistema',
      role: 'admin' as const,
    };

    // 1. Crear edificio
    const buildingResult = await BuildingService.createBuilding({
      code: 'AQUA001',
      name: 'Torre Aquarela',
      address: {
        street: 'Av. Aviadores del Chaco',
        number: '2050',
        city: 'Asunción',
        state: 'Central',
        postalCode: '1536',
        country: 'Paraguay',
      },
      totalUnits: 24,
      floors: 8,
      primaryAdminId: 'system',
      contacts: [{
        name: 'Administración Aquarela',
        role: 'Administrador',
        phone: '+595 21 600 000',
        email: 'admin@aquarela.com.py',
        isPrimary: true,
      }],
    }, systemActor);

    if (!buildingResult.success || !buildingResult.data) {
      throw new Error('Error creando edificio');
    }

    const building = buildingResult.data;
    console.log('  ✅ Edificio creado:', building.name);

    // 2. Crear unidades (3 pisos x 4 deptos = 12 unidades)
    const units: UnitService.Unit[] = [];
    const aptTypes = ['A', 'B', 'C', 'D'];

    for (let floor = 1; floor <= 3; floor++) {
      for (const apt of aptTypes) {
        const isLarge = apt === 'A' || apt === 'D';
        const unitResult = await UnitService.createUnit({
          buildingId: building.id,
          floor,
          number: `${floor}0${aptTypes.indexOf(apt) + 1}`,
          type: 'apartment',
          area: isLarge ? 120 : 85,
          bedrooms: isLarge ? 3 : 2,
          bathrooms: isLarge ? 2 : 1,
          hasBalcony: true,
          hasParking: true,
        }, systemActor);

        if (unitResult.success && unitResult.data) {
          units.push(unitResult.data);
        }
      }
    }
    console.log(`  ✅ ${units.length} unidades creadas`);

    // 3. Crear usuarios demo
    // Admin
    const adminResult = await UserService.createUser({
      email: 'admin@aquarela.com.py',
      password: 'Admin123!',
      role: 'admin',
      profile: {
        firstName: 'Carlos',
        lastName: 'Martínez',
        phone: '+595 981 100 000',
      },
      buildingId: building.id,
      autoApprove: true,
    }, systemActor);

    let adminId = '';
    if (adminResult.success && adminResult.data) {
      adminId = adminResult.data.id;
      console.log('  ✅ Admin creado:', adminResult.data.email);
    } else {
      console.error('  ❌ Error creando admin:', adminResult.error);
    }

    // Staff
    const staffResult = await UserService.createUser({
      email: 'staff@aquarela.com.py',
      password: 'Staff123!',
      role: 'staff',
      profile: {
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+595 981 200 000',
      },
      buildingId: building.id,
      autoApprove: true,
    }, systemActor);

    if (staffResult.success && staffResult.data) {
      console.log('  ✅ Staff creado:', staffResult.data.email);
    }

    // Recepción
    const receptionResult = await UserService.createUser({
      email: 'reception@aquarela.com.py',
      password: 'Reception123!',
      role: 'staff',
      profile: {
        firstName: 'Ana',
        lastName: 'García',
        phone: '+595 981 300 000',
      },
      buildingId: building.id,
      autoApprove: true,
    }, systemActor);

    if (receptionResult.success && receptionResult.data) {
      console.log('  ✅ Recepción creado:', receptionResult.data.email);
    }

    // Propietarios (3 propietarios para las primeras 3 unidades)
    const ownerData = [
      { email: 'owner@aquarela.com.py', firstName: 'María', lastName: 'Rodríguez', apartment: '101' },
      { email: 'propietario2@test.com', firstName: 'Roberto', lastName: 'Silva', apartment: '102' },
      { email: 'propietario3@test.com', firstName: 'Laura', lastName: 'Fernández', apartment: '103' },
    ];

    for (let i = 0; i < ownerData.length; i++) {
      const data = ownerData[i];
      const unit = units[i];

      const ownerResult = await UserService.createUser({
        email: data.email,
        password: 'Owner123!',
        role: 'owner',
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: `+595 98${i + 1} 400 00${i}`,
        },
        buildingId: building.id,
        unitId: unit?.id,
        unitRole: 'owner',
        autoApprove: true,
      }, systemActor);

      if (ownerResult.success && ownerResult.data && unit) {
        console.log(`  ✅ Propietario ${data.firstName} creado (${data.apartment})`);
      }
    }

    // 4. Crear amenidades
    const amenitiesData = [
      {
        buildingId: building.id,
        name: 'Quincho con Parrilla',
        description: 'Quincho techado con parrilla, mesada, pileta y heladera. Capacidad para 30 personas.',
        type: 'quincho' as const,
      },
      {
        buildingId: building.id,
        name: 'Salón de Eventos',
        description: 'Salón climatizado para eventos especiales. Incluye sistema de audio y proyector.',
        type: 'salon_events' as const,
      },
      {
        buildingId: building.id,
        name: 'Gimnasio',
        description: 'Gimnasio equipado con máquinas cardiovasculares y pesas. Abierto 6:00 - 22:00.',
        type: 'gym' as const,
      },
      {
        buildingId: building.id,
        name: 'Piscina',
        description: 'Piscina climatizada con área de solárium. Horario: 8:00 - 20:00.',
        type: 'pool' as const,
      },
    ];

    for (const amenity of amenitiesData) {
      await ReservationService.createAmenity(amenity, systemActor);
    }
    console.log(`  ✅ ${amenitiesData.length} amenidades creadas`);

    // 5. Crear anuncio de bienvenida
    const announcementResult = await AnnouncementService.createAnnouncement({
      buildingId: building.id,
      title: 'Bienvenidos al Sistema Aquarela',
      content: `
Estimados residentes,

Nos complace presentarles el nuevo sistema de gestión del edificio Torre Aquarela.

A través de este portal podrán:
• Consultar su estado de cuenta y realizar pagos
• Reservar amenidades (quincho, salón, piscina, gimnasio)
• Reportar incidencias y solicitar mantenimiento
• Autorizar visitas y accesos
• Mantenerse informados de las novedades del edificio

Para cualquier consulta, no duden en contactar a la administración.

¡Bienvenidos!
      `.trim(),
      type: 'general' as const,
      priority: 'high' as const,
      publishImmediately: true,
    }, systemActor);

    if (announcementResult.success && announcementResult.data) {
      console.log('  ✅ Anuncio de bienvenida creado');
    }

    // 6. Crear cargos de expensas para el mes actual
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const dueDate = `${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth}`;
    const period = `${year}-${String(month).padStart(2, '0')}`;

    for (let i = 0; i < 3; i++) {
      const unit = units[i];
      if (!unit) continue;

      const isLarge = unit.area && unit.area > 100;
      const amount = isLarge ? 850000 : 650000;

      await FinancialService.createCharge({
        buildingId: building.id,
        unitId: unit.id,
        accountType: 'expenses',
        description: 'Expensas ordinarias del mes incluyendo servicios comunes, personal y mantenimiento.',
        amount,
        currency: 'USD',
        period,
        dueDate,
      }, systemActor);
    }
    console.log('  ✅ Cargos de expensas creados');

    // 7. Crear actividad de ejemplo
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const endTime = new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000);

    await AnnouncementService.createActivity({
      buildingId: building.id,
      title: 'Asamblea General Ordinaria',
      description: 'Asamblea anual para aprobación de balance y presupuesto del próximo período. Se requiere quórum del 50%+1.',
      startDate: nextWeek.toISOString().split('T')[0],
      startTime: '19:00',
      endDate: endTime.toISOString().split('T')[0],
      endTime: '21:00',
      location: 'Salón de Eventos',
      organizer: {
        userId: adminId,
        name: 'Administración AQUARELA',
        contactInfo: 'admin@aquarela.com.py',
      },
      maxCapacity: 50,
      requiresRegistration: true,
    }, systemActor);
    console.log('  ✅ Actividad de ejemplo creada');

    console.log('\n🎉 Seed completado exitosamente!\n');
    console.log('═'.repeat(50));
    console.log('CREDENCIALES DE PRUEBA:');
    console.log('═'.repeat(50));
    console.log('  Admin:       admin@aquarela.com.py / Admin123!');
    console.log('  Staff:       staff@aquarela.com.py / Staff123!');
    console.log('  Propietario: owner@aquarela.com.py / Owner123!');
    console.log('═'.repeat(50));

    return {
      success: true,
      buildingId: building.id,
      adminId,
    };
  } catch (error) {
    console.error('❌ Error en seed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-SEED ON FIRST LOAD
// ═══════════════════════════════════════════════════════════════════════════════

let seedPromise: Promise<SeedResult> | null = null;

export function initializeDataIfNeeded(): Promise<SeedResult> {
  // Si ya hay datos, no hacer nada
  if (hasExistingData()) {
    return Promise.resolve({ success: true });
  }

  // Si ya se está ejecutando el seed, retornar la misma promesa
  if (seedPromise) {
    return seedPromise;
  }

  // Ejecutar seed
  seedPromise = seedInitialData();
  return seedPromise;
}
