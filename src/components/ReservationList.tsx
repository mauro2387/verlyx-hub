import React, { useEffect, useState } from 'react';
import { getReservations, deleteReservation } from '../utils/reservations';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface Props {
  filterByCreatedBy?: string;
  filterByApartment?: string;
}

export default function ReservationList({ filterByCreatedBy, filterByApartment }: Props) {
  const [list, setList] = useState<any[]>([]);

  const load = () => {
    const all = getReservations();
    let filtered = all;
    if (filterByCreatedBy) filtered = filtered.filter(r => r.createdBy === filterByCreatedBy);
    if (filterByApartment) filtered = filtered.filter(r => r.apartment === filterByApartment);
    setList(filtered);
  };

  useEffect(() => {
    load();
  }, [filterByCreatedBy, filterByApartment]);

  const handleCancel = (id: number) => {
    if (!confirm('¿Cancelar reserva?')) return;
    const ok = deleteReservation(id);
    if (ok) {
      toast.success('Reserva cancelada');
      load();
    } else {
      toast.error('Error al cancelar');
    }
  };

  if (list.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-[#0A1E40] mb-2">No hay reservas</h3>
        <p className="text-gray-600">Aún no hay reservas para el filtro seleccionado.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {list.map((r) => (
        <Card key={r.id} className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[#0A1E40]" style={{ fontWeight: 700, fontSize: '1.125rem' }}>{r.service}</p>
                <p className="text-gray-600">{r.date} • {r.time}</p>
              </div>
            </div>
            <p className="text-gray-700 mt-2">Residente: <strong>{r.residentName}</strong> {r.apartment ? `• Apt ${r.apartment}` : ''}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm text-gray-500">Creado por: {r.createdBy || '—'}</span>
            <div className="flex gap-2">
              <Button variant="outline" className="border-red-600 text-red-600" onClick={() => handleCancel(r.id)}>Cancelar</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
