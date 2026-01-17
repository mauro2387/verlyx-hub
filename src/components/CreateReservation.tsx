import React, { useState } from 'react';
import { addReservation, getReservations } from '../utils/reservations';
import { Button } from './ui/button';
import { DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';

interface Props {
  createdBy?: string;
  onCreated?: (id: number) => void;
}

export default function CreateReservation({ createdBy, onCreated }: Props) {
  const [residentName, setResidentName] = useState('');
  const [apartment, setApartment] = useState('');
  const [service, setService] = useState('Meeting Room');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [checking, setChecking] = useState(false);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!residentName || !service || !date || !time) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    // client-side conflict check: same service, same date and same time
    setChecking(true);
    const existing = getReservations();
    const conflict = existing.find(r => r.service === service && r.date === date && r.time === time);
    if (conflict) {
      setChecking(false);
      toast.error('Ya existe una reserva para ese servicio y horario. Por favor elige otro.');
      return;
    }

    const reservation = addReservation({
      residentName,
      apartment: apartment || undefined,
      service,
      date,
      time,
      notes: notes || undefined,
      createdBy: createdBy || 'system',
      status: 'confirmed',
    } as any);

    setChecking(false);
    toast.success('Reserva creada correctamente');
    // reset
    setResidentName('');
    setApartment('');
    setService('Meeting Room');
    setDate('');
    setTime('');
    setNotes('');

    if (onCreated) onCreated(reservation.id);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Crear Reserva</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div>
          <label className="block mb-1 text-sm text-[#0A1E40]">Nombre del residente</label>
          <input value={residentName} onChange={(e) => setResidentName(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Ej. María Pérez" />
        </div>

        <div>
          <label className="block mb-1 text-sm text-[#0A1E40]">Apartamento (opcional)</label>
          <input value={apartment} onChange={(e) => setApartment(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="Ej. 1205" />
        </div>

        <div>
          <label className="block mb-1 text-sm text-[#0A1E40]">Servicio</label>
          <select value={service} onChange={(e) => setService(e.target.value)} className="w-full border px-3 py-2 rounded">
            <option>Meeting Room</option>
            <option>Gym</option>
            <option>Pool</option>
            <option>Spa</option>
            <option>Parking</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm text-[#0A1E40]">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block mb-1 text-sm text-[#0A1E40]">Hora</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
        </div>

        <div>
          <label className="block mb-1 text-sm text-[#0A1E40]">Notas (opcional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border px-3 py-2 rounded" rows={3} />
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => { /* Dialog close handled by parent trigger */ }}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-[#0A1E40] text-white">
            Crear Reserva
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
