import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  format,
  addDays,
  addMonths,
  startOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isBefore,
  isAfter,
  isSameDay,
  isSameMonth,
  differenceInCalendarMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { toast } from 'sonner';
import { Clock, Users, MessageSquare, Check, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { addReservation } from '../../utils/reservations';

interface Amenity {
  id: string;
  name: string;
  description: string;
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
    description: 'Cancha de tenis al aire libre pensada para entrenamientos o torneos entre residentes.',
    capacity: 20,
    schedule: {
      start: '08:00',
      end: '22:00',
    },
    rules: [
      'Uso de vestimenta deportiva y calzado adecuado obligatorio.',
      'Niños menores de 12 años deben estar acompañados por un adulto.',
      'No se permite consumir alimentos dentro del área de juego.',
    ],
  },
  {
    id: 'gym',
    name: 'Barbacoas',
    description: 'Espacios gourmet completamente equipados, ideales para celebraciones privadas.',
    capacity: 15,
    schedule: {
      start: '06:00',
      end: '23:00',
    },
    rules: [
      'Reserva mínima con 24 horas de antelación.',
      'Mantener el área limpia y ordenada al finalizar.',
      'Está prohibido fumar dentro del salón cerrado.',
    ],
  },
  {
    id: 'bbq',
    name: 'Sala SUM',
    description: 'Auditorio modular con sonido envolvente para eventos privados o corporativos.',
    capacity: 12,
    schedule: {
      start: '10:00',
      end: '23:00',
    },
    rules: [
      'Permite un máximo de 4 horas de uso continuo.',
      'Solicitar equipamiento audiovisual con 48 horas de antelación.',
      'No está permitido el ingreso de catering sin previa autorización.',
    ],
  },
];

const timeSlots = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

const TIMEZONE = 'America/Montevideo';

const stepCopy = [
  {
    title: 'Selecciona la instalación',
    description: 'Explora los espacios exclusivos del edificio y elige dónde quieres vivir tu próxima experiencia.',
  },
  {
    title: 'Elige fecha y horario',
    description: 'Reserva dentro de los próximos 30 días o solicita una fecha especial si necesitas más antelación.',
  },
  {
    title: 'Completa los detalles',
    description: 'Indica la cantidad de personas y cualquier necesidad adicional para una organización perfecta.',
  },
];

const ReservationSystem: React.FC = () => {
  const today = useMemo(() => startOfDay(toZonedTime(new Date(), TIMEZONE)), []);
  const dateOptions = useMemo(() => Array.from({ length: 31 }, (_, index) => addDays(today, index)), [today]);
  const maxDate = useMemo(() => dateOptions[dateOptions.length - 1], [dateOptions]);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(today));

  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSpecialDateForm, setShowSpecialDateForm] = useState(false);

  const isDateInRange = useCallback(
    (date: Date) => !isBefore(date, today) && !isAfter(date, maxDate),
    [today, maxDate],
  );

  const availabilityByTime = useMemo(() => {
    if (!selectedDate) return {} as Record<string, boolean>;

    const hash = Number(format(selectedDate, 'yyyyMMdd'));

    return timeSlots.reduce<Record<string, boolean>>((map, slot, index) => {
      const seed = hash + index * 37;
      map[slot] = seed % 4 !== 0;
      return map;
    }, {} as Record<string, boolean>);
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && !isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate, currentMonth]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) =>
      format(addDays(start, index), 'EEE', { locale: es }).replace('.', '').toUpperCase(),
    );
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const minMonth = useMemo(() => startOfMonth(today), [today]);
  const maxMonthLimit = useMemo(() => startOfMonth(maxDate), [maxDate]);
  const canGoPrev = differenceInCalendarMonths(currentMonth, minMonth) > 0;
  const canGoNext = differenceInCalendarMonths(maxMonthLimit, currentMonth) > 0;
  const monthLabel = useMemo(() => format(currentMonth, "MMMM yyyy", { locale: es }), [currentMonth]);

  const goToPreviousMonth = useCallback(() => {
    if (canGoPrev) {
      setCurrentMonth((prev) => addMonths(prev, -1));
    }
  }, [canGoPrev]);

  const goToNextMonth = useCallback(() => {
    if (canGoNext) {
      setCurrentMonth((prev) => addMonths(prev, 1));
    }
  }, [canGoNext]);

  useEffect(() => {
    if (selectedTimeSlot && !availabilityByTime[selectedTimeSlot]) {
      setSelectedTimeSlot(null);
    }
  }, [availabilityByTime, selectedTimeSlot]);

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const normalized = startOfDay(date);

      if (!isDateInRange(normalized)) {
        toast.error('Fecha fuera del rango permitido', {
          description:
            'Puedes reservar hasta 30 días desde hoy. Solicita autorización a administración para fechas posteriores.',
        });
        return;
      }

      setSelectedDate(normalized);
      setSelectedTimeSlot(null);
    },
    [isDateInRange],
  );

  const handleReservation = useCallback(() => {
    if (!selectedAmenity || !selectedTimeSlot || !selectedDate) {
      toast.error('Completa la información de la reserva antes de continuar.');
      return;
    }

    const reservation = addReservation({
      residentName: 'Usuario actual',
      service: selectedAmenity.name,
      date: selectedDate.toISOString(),
      time: selectedTimeSlot,
      notes,
      status: 'confirmada',
      apartment: '101',
    });

    if (reservation) {
      toast.success('¡Reserva confirmada!', {
        description: `${selectedAmenity.name} — ${format(selectedDate, "PPP", { locale: es })} a las ${selectedTimeSlot} hs`,
      });
      setShowConfirmation(true);
    } else {
      toast.error('Ocurrió un error al crear la reserva. Inténtalo nuevamente.');
    }
  }, [notes, selectedAmenity, selectedDate, selectedTimeSlot]);

  const canContinue = step === 1 ? Boolean(selectedAmenity) : step === 2 ? Boolean(selectedDate && selectedTimeSlot) : true;

  const { title, description } = stepCopy[step - 1];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2 text-center lg:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">Reservas del edificio</p>
        <h2 className="text-3xl font-semibold text-[#0A1E40] sm:text-4xl">Gestiona tu próxima experiencia</h2>
        <p className="text-sm text-gray-500 sm:text-base">
          Agenda espacios comunes con un flujo guiado, transparente y adaptable a tus necesidades.
        </p>
      </header>

      <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-8">
          <Card className="rounded-3xl border-0 bg-[#0A1E40] p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Resumen</p>
                <h3 className="mt-1 text-xl font-semibold">Tu reserva</h3>
              </div>
              <Badge className="rounded-full bg-white/15 text-white">Paso {step} de 3</Badge>
            </div>

            {selectedAmenity ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Instalación</p>
                  <p className="mt-1 text-base font-semibold">{selectedAmenity.name}</p>
                  <p className="text-sm text-white/70">Capacidad máxima {selectedAmenity.capacity} personas</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Fecha</p>
                  <p className="mt-1 text-base font-semibold">
                    {selectedDate
                      ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                      : 'Selecciona un día disponible'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/60">Horario</p>
                  <p className="mt-1 text-base font-semibold">
                    {selectedTimeSlot ? `${selectedTimeSlot} hs` : 'Selecciona un turno disponible'}
                  </p>
                </div>

                {step === 3 && notes && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/60">Notas adicionales</p>
                    <p className="mt-1 text-sm text-white/70">{notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-6 text-sm text-white/70">
                A medida que avances, verás aquí un resumen claro con todo lo necesario antes de confirmar.
              </p>
            )}

            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm text-white/75">
              <Clock className="h-5 w-5 flex-shrink-0" />
              Los turnos se actualizan en tiempo real. Finaliza el flujo para asegurar tu reserva.
            </div>
          </Card>

          <Card className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-[#0A1E40]">¿Necesitas asistencia?</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Nuestro concierge está disponible para ayudarte con reservas especiales, montajes o servicios adicionales.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              Contactar administración
            </Button>
          </Card>
        </aside>

        <div className="flex-1">
          <Card className="rounded-3xl border-0 bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A1E40] text-white">
                  <span className="text-base font-semibold">{step}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0A1E40]">{title}</h3>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
                Reserva paso a paso
              </Badge>
            </div>

            <div className="space-y-8 px-6 py-8">
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  {amenities.map((amenity) => {
                    const isSelected = selectedAmenity?.id === amenity.id;

                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => setSelectedAmenity(amenity)}
                        className={`group relative overflow-hidden rounded-3xl border px-6 py-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1E40]/40 ${
                          isSelected
                            ? 'border-[#0A1E40] bg-gradient-to-r from-[#0A1E40]/10 via-white to-transparent shadow-xl'
                            : 'border-slate-200 bg-white shadow-sm hover:border-[#0A1E40]/30 hover:shadow-lg'
                        }`}
                      >
                        <span
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-200 via-blue-500 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          aria-hidden="true"
                        />

                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold text-[#0A1E40]">{amenity.name}</h4>
                            <p className="mt-2 max-w-2xl text-sm text-gray-600">{amenity.description}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className="rounded-full border-blue-200 bg-blue-50 px-4 py-1 text-blue-700 self-start sm:self-center"
                          >
                            {amenity.schedule.start} – {amenity.schedule.end}
                          </Badge>
                        </div>

                        <div className="relative mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <div className="flex items-center gap-2 rounded-full bg-slate-100/70 px-3 py-1 text-slate-600">
                            <Users className="h-4 w-4" />
                            Máx. {amenity.capacity} personas
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
                  <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100/40 p-6 lg:sticky lg:top-20 lg:h-fit">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Rango disponible</p>
                    <h4 className="mt-1 text-xl font-semibold text-[#0A1E40]">
                      {format(today, "d 'de' MMMM", { locale: es })} – {format(maxDate, "d 'de' MMMM", { locale: es })}
                    </h4>
                    <p className="mt-2 text-sm text-blue-900/80">
                      Puedes reservar turnos dentro de los próximos 30 días. Si necesitas una fecha posterior, envíanos una solicitud especial.
                    </p>

                    <div className="mt-6">
                      <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 md:hidden" style={{ scrollbarWidth: 'none' }}>
                        {dateOptions.map((date) => {
                          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                          return (
                            <button
                              key={date.toISOString()}
                              type="button"
                              onClick={() => handleDateSelect(date)}
                              className={`flex min-w-[88px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1E40]/40 ${
                                isSelected
                                  ? 'border-[#0A1E40] bg-[#0A1E40] text-white shadow-lg'
                                  : 'border-blue-100 bg-white text-[#0A1E40] hover:border-[#0A1E40]/40 hover:bg-[#0A1E40]/10'
                              }`}
                            >
                              <span className={`text-[0.65rem] uppercase tracking-wide ${isSelected ? 'text-white/70' : 'text-blue-500'}`}>
                                {format(date, 'EEE', { locale: es }).replace('.', '')}
                              </span>
                              <span className="text-xl font-semibold leading-none">{format(date, 'd')}</span>
                              <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-blue-400'}`}>
                                {format(date, 'MMM', { locale: es })}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="hidden md:block">
                        <div className="rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-sm">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold capitalize text-[#0A1E40]">{monthLabel}</p>
                              <p className="text-xs text-blue-500">Selecciona un día dentro del rango habilitado.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 rounded-full border-blue-100 text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                                onClick={goToPreviousMonth}
                                disabled={!canGoPrev}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 rounded-full border-blue-100 text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                                onClick={goToNextMonth}
                                disabled={!canGoNext}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div
                            className="grid gap-2 text-center text-xs font-semibold uppercase text-blue-500"
                            style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                          >
                            {weekDays.map((label) => (
                              <span key={label} className="py-2">
                                {label}
                              </span>
                            ))}
                          </div>

                          <div
                            className="mt-2 grid gap-2"
                            style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                          >
                            {calendarDays.map((day) => {
                              const outsideMonth = !isSameMonth(day, currentMonth);
                              const outOfRange = isBefore(day, today) || isAfter(day, maxDate);
                              const disabled = outsideMonth || outOfRange;
                              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                              const isToday = isSameDay(day, today);

                              const baseClasses = 'flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1E40]/40';
                              let variantClasses = '';

                              if (isSelected) {
                                variantClasses = 'bg-[#0A1E40] text-white shadow-lg';
                              } else if (disabled) {
                                variantClasses = 'text-slate-300';
                              } else if (isToday) {
                                variantClasses = 'bg-blue-50 text-[#0A1E40] ring-2 ring-[#0A1E40]/20';
                              } else {
                                variantClasses = 'bg-white text-[#0A1E40] hover:bg-[#0A1E40]/10';
                              }

                              return (
                                <button
                                  key={day.toISOString()}
                                  type="button"
                                  onClick={() => handleDateSelect(day)}
                                  disabled={disabled}
                                  aria-pressed={isSelected}
                                  className={`${baseClasses} ${variantClasses}`}
                                >
                                  {format(day, 'd')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-blue-100 bg-white/80 p-4 text-sm text-blue-900/80">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 flex-shrink-0 text-blue-500" />
                        <div>
                          <p className="font-semibold text-[#0A1E40]">¿Necesitas más antelación?</p>
                          <p className="mt-1">
                            Envía una solicitud con la fecha deseada y nuestro equipo gestionará la disponibilidad con administración.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 bg-[#0A1E40] text-white hover:bg-[#123061]"
                            onClick={() => setShowSpecialDateForm(true)}
                          >
                            Solicitar fecha especial
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:self-start">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-[#0A1E40]">Horarios disponibles</h4>
                        <p className="text-sm text-gray-500">
                          {selectedDate
                            ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                            : 'Selecciona una fecha para ver horarios.'}
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-700 self-center">
                        {selectedAmenity?.name ?? 'Selecciona una instalación'}
                      </Badge>
                    </div>

                    {selectedDate ? (
                      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                        {timeSlots.map((time) => {
                          const available = availabilityByTime[time];
                          const isSelected = selectedTimeSlot === time;

                          return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => available && setSelectedTimeSlot(time)}
                              disabled={!available}
                              className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1E40]/40 ${
                                isSelected
                                  ? 'border-[#0A1E40] bg-[#0A1E40] text-white shadow-lg'
                                  : available
                                    ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0A1E40]/40 hover:bg-[#0A1E40]/10'
                                    : 'border-slate-100 bg-slate-50 text-slate-300'
                              }`}
                            >
                              <Clock className={`h-4 w-4 ${isSelected ? 'text-white' : available ? 'text-[#0A1E40]' : 'text-slate-300'}`} />
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/40 p-8 text-sm text-blue-900/80">
                        <Clock className="mb-2 h-5 w-5" />
                        Selecciona un día disponible para ver los horarios.
                      </div>
                    )}

                    <p className="mt-4 text-xs text-gray-400">
                      Los horarios deshabilitados ya cuentan con otra reserva confirmada o se encuentran fuera del horario operativo.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100/20 p-6">
                    <h4 className="text-lg font-semibold text-[#0A1E40]">Detalles adicionales</h4>
                    <p className="mt-1 text-sm text-blue-900/80">
                      Cuéntanos si necesitas equipamiento, apoyo operativo o instrucciones especiales.
                    </p>

                    <div className="mt-6 space-y-2">
                      <Label htmlFor="notes">Notas adicionales</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Ej: requerimos sillas extra, setup híbrido o decoración especial."
                        className="h-32 rounded-2xl border-blue-200 bg-white/80 text-[#0A1E40] focus-visible:ring-[#0A1E40]/40"
                      />
                      <p className="text-xs text-blue-500">
                        La administración recibirá esta información junto con tu confirmación.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-[#0A1E40]">Reglas de uso</h4>
                    <p className="mt-1 text-sm text-gray-500">Repasa las recomendaciones para disfrutar sin contratiempos.</p>
                    <ul className="mt-4 space-y-3">
                      {(selectedAmenity?.rules ?? []).map((rule, index) => (
                        <li key={index} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                          <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-600" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setStep((current) => Math.max(1, current - 1))}
                disabled={step === 1}
                className="h-12 rounded-full border-slate-200 px-12 min-w-[120px]"
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
                disabled={!canContinue}
                className="h-12 rounded-full bg-[#0A1E40] px-12 text-white hover:bg-[#123061] disabled:bg-slate-200 min-w-[140px]"
              >
                {step === 3 ? 'Confirmar reserva' : 'Continuar'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¡Reserva confirmada!</DialogTitle>
          </DialogHeader>
          <div className="px-2 pb-2 pt-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#0A1E40]">Reserva exitosa</h3>
            <p className="mt-2 text-sm text-gray-600">
              Tu reserva para {selectedAmenity?.name} el {selectedDate && format(selectedDate, 'PPP', { locale: es })} a las{' '}
              {selectedTimeSlot} hs fue registrada correctamente.
              {notes && (
                <span className="block pt-2 text-sm">
                  Notas enviadas: {notes}
                </span>
              )}
            </p>
            <Button onClick={() => setShowConfirmation(false)} className="mt-5">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSpecialDateForm} onOpenChange={setShowSpecialDateForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar fecha especial</DialogTitle>
            <DialogDescription>
              Completa el formulario y nuestro equipo revisará la disponibilidad junto con administración.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="special-date">Fecha solicitada</Label>
              <Input
                id="special-date"
                type="date"
                min={format(addDays(maxDate, 1), 'yyyy-MM-dd')}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="reason">Motivo de la solicitud</Label>
              <Textarea
                id="reason"
                placeholder="Describe por qué necesitas reservar con más antelación."
                className="mt-1 h-28"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                toast.success('Solicitud enviada correctamente', {
                  description: 'Responderemos dentro de las próximas 48 horas hábiles.',
                });
                setShowSpecialDateForm(false);
              }}
            >
              Enviar solicitud
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ReservationSystem;
