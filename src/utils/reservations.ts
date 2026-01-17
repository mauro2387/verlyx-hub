export interface Reservation {
  id: number;
  residentName: string;
  apartment?: string;
  service: string;
  date: string; // ISO date
  time: string; // HH:MM
  notes?: string;
  createdBy?: string;
    status?: 'pendiente' | 'confirmada' | 'cancelada';
  createdAt: string;
}

const STORAGE_KEY = 'reservations_v1';

export function getReservations(): Reservation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Reservation[];
  } catch (e) {
    console.error('Failed to read reservations from storage', e);
    return [];
  }
}

export function saveReservations(list: Reservation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save reservations', e);
  }
}

import { addTask } from './tasks';

export function addReservation(input: Omit<Reservation, 'id' | 'createdAt'>): Reservation {
  const list = getReservations();
  const id = list.length > 0 ? Math.max(...list.map(r => r.id)) + 1 : 1;
  const newRes: Reservation = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  } as Reservation;
  list.unshift(newRes);
  saveReservations(list);

  try {
    // Crear una tarea auxiliar para que el equipo prepare la reserva
    addTask({
      title: `Preparación para reserva: ${input.service}`,
      description: `Reserva para ${input.service} el ${input.date} a las ${input.time}. Apto: ${input.apartment || 'N/A'}`,
      reservationId: id,
      assignedTo: 'Recepción',
      status: 'open',
    });
  } catch (e) {
    console.error('No se pudo crear la tarea relacionada con la reserva', e);
  }

  return newRes;
}

export function clearReservations() {
  localStorage.removeItem(STORAGE_KEY);
}

export function deleteReservation(id: number) {
  try {
    const list = getReservations();
    const filtered = list.filter(r => r.id !== id);
    saveReservations(filtered);
    return true;
  } catch (e) {
    console.error('Failed to delete reservation', e);
    return false;
  }
}
