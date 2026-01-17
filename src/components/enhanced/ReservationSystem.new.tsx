import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Clock, Users, Image as ImageIcon, MessageSquare, Check } from 'lucide-react';
import { format, addDays, isBefore, isAfter, startOfDay, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { addReservation } from '../../utils/reservations';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Amenity {
  id: string;
  name: string;
  description: string;
  images: string[];
  capacity: number;
  schedule: {
    start: string;
    end: string;
  };
  rules: string[];
}

const amenities: Amenity[] = [
  {
    id: 'pool',
    name: 'Cancha de tenis',
    description: 'Cancha de tenis al aire libre',
    images: ['/amenities/pool1.jpg', '/amenities/pool2.jpg'],
    capacity: 20,
    schedule: {
      start: '08:00',
      end: '22:00'
    },
    rules: [
      'Uso de gorro de baño obligatorio',
      'Niños menores de 12 años deben estar acompañados',
      'No se permiten alimentos en el área'
    ]
  },
  {
    id: 'gym',
    name: 'Barbacoas',
    description: 'Barbacoas completamente equipadas',
    images: ['/amenities/gym1.jpg', '/amenities/gym2.jpg'],
    capacity: 15,
    schedule: {
      start: '06:00',
      end: '23:00'
    },
    rules: [
      'Uso de toalla obligatorio',
      'Limpiar equipos después de usar',
      'Máximo 1 hora por sesión en horario pico'
    ]
  },
  {
    id: 'bbq',
    name: 'Sala SUM',
    description: 'Salón de usos múltiples completamente equipado',
    images: ['/amenities/bbq1.jpg', '/amenities/bbq2.jpg'],
    capacity: 12,
    schedule: {
      start: '10:00',
      end: '23:00'
    },
    rules: [
      'Reserva mínima: 2 horas antes',
      'Traer propios utensilios',
      'Limpieza posterior obligatoria'
    ]
  }
];

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const ReservationSystem: React.FC = () => {
  const TIMEZONE = 'America/Montevideo';
  const [today] = useState(() => startOfDay(toZonedTime(new Date(), TIMEZONE)));
  const maxDate = useMemo(() => addDays(today, 30), [today]);
  const dateOptions = useMemo(() => Array.from({ length: 31 }, (_, idx) => addDays(today, idx)), [today]);

  const isDateInRange = useCallback(
    (date: Date) => !isBefore(date, today) && !isAfter(date, maxDate),
    [today, maxDate]
  );

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [guests, setGuests] = useState('1');
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [viewImages, setViewImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showSpecialDateForm, setShowSpecialDateForm] = useState(false);

  const handleReservation = () => {
    if (!selectedAmenity || !selectedDate || !selectedTimeSlot) return;

    const reservation = addReservation({
      residentName: 'Usuario actual',
      service: selectedAmenity.name,
      date: selectedDate.toISOString(),
      time: selectedTimeSlot,
      notes,
      status: 'confirmada',
      apartment: '101'
    });

    if (reservation) {
      toast.success('¡Reserva confirmada!', {
        description: `${selectedAmenity.name} - ${format(selectedDate, 'PPP', { locale: es })} a las ${selectedTimeSlot}hs`
      });
      setShowConfirmation(true);
    } else {
      toast.error('Error al crear la reserva');
    }
  };

  const isTimeSlotAvailable = (time: string) => {
    // Reemplazar por lógica real de disponibilidad cuando haya backend
    return Math.random() > 0.3;
  };

  const handleDateSelect = (date: Date) => {
    if (!isDateInRange(date)) return;
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center lg:text-left">
        <h2 className="text-3xl font-bold text-[#0A1E40] mb-2">Reservas</h2>
        <p className="text-gray-500 text-sm sm:text-base">
          Reserve las instalaciones del edificio de manera fácil y rápida
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6 sm:p-8 border-0 shadow-xl rounded-3xl bg-white/95 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">{step}</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#0A1E40]">
                  {step === 1 ? 'Seleccione Instalación' : step === 2 ? 'Elija Fecha y Hora' : 'Detalles de la Reserva'}
                </h3>
                <p className="text-sm text-gray-500">
                  {step === 1
                    ? 'Explore nuestras instalaciones disponibles'
                    : step === 2
                      ? 'Seleccione el horario que prefiera'
                      : 'Complete los últimos detalles'}
                </p>
              </div>
            </div>

            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                {amenities.map((amenity) => {
                  const isActive = selectedAmenity?.id === amenity.id;
                  return (
                    <div
                      key={amenity.id}
                      className={`rounded-2xl border-2 p-5 transition-all cursor-pointer flex flex-col gap-4
                        ${isActive ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                      onClick={() => setSelectedAmenity(amenity)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-[#0A1E40]">{amenity.name}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{amenity.description}</p>
                        </div>
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          {amenity.schedule.start} - {amenity.schedule.end}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Máx. {amenity.capacity}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600"
                          onClick={(event: React.MouseEvent) => {
                            event.stopPropagation();
                            setSelectedImage(amenity.images[0]);
                            setViewImages(true);
                          }}
                        >
                          <ImageIcon className="w-4 h-4 mr-1" />
                          Ver fotos
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6 shadow-md">
                    <div className="mb-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Rango disponible</p>
                      <h4 className="mt-1 text-xl font-semibold text-[#0A1E40]">
                        {format(today, "d 'de' MMMM", { locale: es })} — {format(maxDate, "d 'de' MMMM", { locale: es })}
                      </h4>
                      <p className="mt-2 text-sm text-blue-900/80 leading-relaxed">
                        Solo se pueden reservar turnos dentro de los próximos 30 días. Para fechas posteriores, solicite autorización a administración.
                      </p>
                    </div>

                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-blue-50 to-blue-50/0" />
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-blue-50 to-blue-50/0" />
                      <div
                        className="flex gap-3 overflow-x-auto pb-3 pr-2 snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none' }}
                      >
                        {dateOptions.map((date) => {
                          const isSelected = isSameDay(date, selectedDate);
                          const dayLabel = format(date, 'EEE', { locale: es }).replace('.', '').slice(0, 3).toUpperCase();
                          return (
                            <button
                              key={date.toISOString()}
                              className={`min-w-[90px] flex flex-col items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition-all snap-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1E40]/40
                                ${isSelected
                                  ? 'border-[#0A1E40] bg-[#0A1E40] text-white shadow-lg'
                                  : 'border-blue-100 bg-white text-[#0A1E40] hover:border-[#0A1E40]/60 hover:bg-[#0A1E40]/10'}`}
                              onClick={() => handleDateSelect(date)}
                              aria-pressed={isSelected}
                            >
                              <span className={`text-[0.65rem] tracking-widest ${isSelected ? 'text-white/80' : 'text-blue-600'}`}>
                                {dayLabel}
                              </span>
                              <span className="text-2xl font-semibold leading-tight">
                                {format(date, 'd')}
                              </span>
                              <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-blue-400'}`}>
                                {format(date, 'MMM', { locale: es })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-sm text-blue-900/80">
                          <p className="font-semibold text-[#0A1E40]">¿Necesitas más antelación?</p>
                          <p className="mt-1 leading-relaxed">
                            Envíanos una solicitud y coordinamos una excepción con el equipo de administración.
                          </p>
                          <Button
                            size="sm"
                            className="mt-3 w-full sm:w-auto bg-[#0A1E40] text-white hover:bg-[#123061]"
                            onClick={() => setShowSpecialDateForm(true)}
                          >
                            Solicitar fecha especial
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-[#0A1E40]">Horarios disponibles</h4>
                        <p className="text-sm text-gray-500">
                          {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                        {selectedAmenity?.name ?? 'Seleccione instalación'}
                      </Badge>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {timeSlots.map((time) => {
                        const available = isTimeSlotAvailable(time);
                        const isSelected = selectedTimeSlot === time;
                        return (
                          <button
                            key={time}
                            className={`group flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1E40]/40
                              ${isSelected
                                ? 'border-[#0A1E40] bg-[#0A1E40] text-white shadow'
                                : available
                                  ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0A1E40]/60 hover:bg-[#0A1E40]/10'
                                  : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                            onClick={() => available && setSelectedTimeSlot(time)}
                            disabled={!available}
                          >
                            <Clock className={`h-4 w-4 ${isSelected ? 'text-white' : available ? 'text-[#0A1E40]' : 'text-slate-300'}`} />
                            {time}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-4 text-xs text-gray-400">
                      Los horarios bloqueados ya cuentan con otra reserva confirmada o están fuera del horario operativo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="guests">Número de Personas</Label>
                  <Input
                    id="guests"
                    type="number"
                    value={guests}
                    onChange={(event) => setGuests(event.target.value)}
                    min="1"
                    max={selectedAmenity?.capacity || 1}
                    className="max-w-[200px]"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Máximo permitido: {selectedAmenity?.capacity} personas
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes">Notas Adicionales (Opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Ej: Necesito sillas adicionales..."
                    className="h-24"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-700 mb-2">Reglas de Uso</h4>
                  <ul className="space-y-2">
                    {selectedAmenity?.rules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-600">
                        <Check className="w-4 h-4 mt-1 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setStep((current) => Math.max(1, current - 1))}
                disabled={step === 1}
                className="w-full sm:w-auto"
              >
                Anterior
              </Button>
              <Button
                onClick={() => {
                  if (step < 3) {
                    setStep((current) => current + 1);
                  } else {
                    handleReservation();
                  }
                }}
                disabled={(step === 1 && !selectedAmenity) || (step === 2 && !selectedTimeSlot)}
                className="w-full sm:w-auto"
              >
                {step === 3 ? 'Confirmar Reserva' : 'Siguiente'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-[#0A1E40] mb-4">Resumen de Reserva</h3>
            {selectedAmenity ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500">Instalación</p>
                  <p className="font-medium text-[#0A1E40]">{selectedAmenity.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Fecha</p>
                  <p className="font-medium text-[#0A1E40]">
                    {format(selectedDate, 'PPP', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Hora</p>
                  <p className="font-medium text-[#0A1E40]">
                    {selectedTimeSlot ? `${selectedTimeSlot}hs` : 'Seleccione un horario'}
                  </p>
                </div>
                {step === 3 && (
                  <div>
                    <p className="text-gray-500">Personas</p>
                    <p className="font-medium text-[#0A1E40]">{guests}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                Seleccione una instalación para ver el resumen
              </p>
            )}
          </Card>

          <Card className="p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-[#0A1E40]">¿Necesita ayuda?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Si tiene dudas sobre cómo realizar una reserva, puede contactar a administración
            </p>
            <Button variant="outline" className="w-full">
              Contactar Administración
            </Button>
          </Card>
        </div>
      </div>

      <Dialog open={viewImages} onOpenChange={setViewImages}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedAmenity?.name}</DialogTitle>
            <DialogDescription>Galería de imágenes</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {selectedAmenity?.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${selectedAmenity.name} ${index + 1}`}
                className="w-full h-64 object-cover rounded-lg"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¡Reserva Confirmada!</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#0A1E40] mb-2">Reserva exitosa</h3>
            <p className="text-gray-600 mb-4">
              Su reserva ha sido confirmada para {selectedAmenity?.name} el {format(selectedDate, 'PPP', { locale: es })} a las {selectedTimeSlot}hs
            </p>
            <Button onClick={() => setShowConfirmation(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSpecialDateForm} onOpenChange={setShowSpecialDateForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Fecha Especial</DialogTitle>
            <DialogDescription>
              Complete el formulario para solicitar una reserva en una fecha posterior al límite de 30 días
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="special-date">Fecha deseada</Label>
              <Input
                id="special-date"
                type="date"
                min={format(addDays(maxDate, 1), 'yyyy-MM-dd')}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="reason">Motivo de la solicitud</Label>
              <Textarea
                id="reason"
                placeholder="Explique por qué necesita reservar con tanta anticipación..."
                className="h-24"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                toast.success('Solicitud enviada correctamente', {
                  description: 'La administración revisará su solicitud y le responderá en 24-48 horas hábiles'
                });
                setShowSpecialDateForm(false);
              }}
            >
              Enviar solicitud
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReservationSystem;
