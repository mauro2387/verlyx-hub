import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { CalendarCheck, Clock, Users, Image as ImageIcon, MessageSquare, Check } from 'lucide-react';
import { format, addMonths, isBefore, isAfter } from 'date-fns';
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
    description: 'Salon de Usos Múltiples completamente equipado',
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
  },
  // Agregar más amenities según sea necesario
];

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const ReservationSystem: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [guests, setGuests] = useState('1');
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [viewImages, setViewImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  const handleReservation = () => {
    if (!selectedAmenity || !selectedDate || !selectedTimeSlot) return;

    const reservation = addReservation({
      residentName: 'Usuario actual', // En una implementación real, esto vendría del contexto de autenticación
      service: selectedAmenity.name,
      date: selectedDate.toISOString(),
      time: selectedTimeSlot,
      notes: notes,
        status: 'confirmada',
      apartment: '101', // En una implementación real, esto vendría del contexto de autenticación
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
    // Aquí iría la lógica para verificar disponibilidad
    return Math.random() > 0.3; // Simulación
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#0A1E40] mb-2">Reservas</h2>
        <p className="text-gray-600">Reserve las instalaciones del edificio de manera fácil y rápida</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Principal */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">{step}</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#0A1E40]">
                  {step === 1 ? 'Seleccione Instalación' : 
                   step === 2 ? 'Elija Fecha y Hora' : 
                   'Detalles de la Reserva'}
                </h3>
                <p className="text-sm text-gray-500">
                  {step === 1 ? 'Explore nuestras instalaciones disponibles' :
                   step === 2 ? 'Seleccione el horario que prefiera' :
                   'Complete los últimos detalles'}
                </p>
              </div>
            </div>

            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {amenities.map((amenity) => (
                  <div
                    key={amenity.id}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedAmenity?.id === amenity.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-200'}
                    `}
                    onClick={() => setSelectedAmenity(amenity)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-[#0A1E40]">{amenity.name}</h4>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {amenity.schedule.start} - {amenity.schedule.end}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{amenity.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Máx. {amenity.capacity}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(amenity.images[0]);
                          setViewImages(true);
                        }}
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        Ver fotos
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-[#0A1E40] mb-2">Seleccionar Fecha</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        Seleccione una fecha dentro del próximo mes. Para fechas posteriores, solicite autorización.
                      </p>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-xl border shadow-sm bg-white"
                        locale={es}
                        disabled={(date) => {
                          const today = new Date();
                          const maxDate = addMonths(today, 1);
                          return isBefore(date, today) || isAfter(date, maxDate);
                        }}
                        modifiers={{
                          available: (date) => {
                            const today = new Date();
                            const maxDate = addMonths(today, 1);
                            return !isBefore(date, today) && !isAfter(date, maxDate);
                          }
                        }}
                        modifiersClassNames={{
                          available: 'bg-blue-50 hover:bg-blue-100'
                        }}
                      />
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        onClick={() => {
                          toast.message('Solicitud de fecha especial', {
                            description: 'Contactando a administración para solicitar una fecha posterior...',
                            action: {
                              label: 'Contactar',
                              onClick: () => {
                                // Aquí iría la lógica para abrir el formulario de contacto
                                toast.success('La administración responderá en 24-48 horas hábiles');
                              }
                            }
                          });
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Solicitar fecha especial
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="border-l pl-6">
                  <h4 className="font-semibold text-[#0A1E40] mb-3">Horarios Disponibles</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((time) => {
                      const available = isTimeSlotAvailable(time);
                      return (
                        <button
                          key={time}
                          className={`
                            p-2 rounded-md text-sm font-medium transition-all
                            flex items-center justify-center gap-2
                            ${selectedTimeSlot === time
                              ? 'bg-blue-500 text-white'
                              : available
                                ? 'bg-white border border-gray-200 text-gray-700 hover:border-blue-500'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                          `}
                          onClick={() => available && setSelectedTimeSlot(time)}
                          disabled={!available}
                        >
                          <Clock className="w-4 h-4" />
                          {time}
                        </button>
                      );
                    })}
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
                    onChange={(e) => setGuests(e.target.value)}
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
                    onChange={(e) => setNotes(e.target.value)}
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

            <div className="flex justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                Anterior
              </Button>
              <Button
                onClick={() => {
                  if (step < 3) setStep((s) => s + 1);
                  else handleReservation();
                }}
                disabled={
                  (step === 1 && !selectedAmenity) ||
                  (step === 2 && !selectedTimeSlot)
                }
              >
                {step === 3 ? 'Confirmar Reserva' : 'Siguiente'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Panel Lateral */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h3 className="font-semibold text-[#0A1E40] mb-4">Resumen de Reserva</h3>
            {selectedAmenity ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Instalación</label>
                  <p className="font-medium text-[#0A1E40]">{selectedAmenity.name}</p>
                </div>
                {selectedDate && (
                  <div>
                    <label className="text-sm text-gray-500">Fecha</label>
                    <p className="font-medium text-[#0A1E40]">
                      {format(selectedDate, 'PPP', { locale: es })}
                    </p>
                  </div>
                )}
                {selectedTimeSlot && (
                  <div>
                    <label className="text-sm text-gray-500">Hora</label>
                    <p className="font-medium text-[#0A1E40]">{selectedTimeSlot}hs</p>
                  </div>
                )}
                {step === 3 && (
                  <div>
                    <label className="text-sm text-gray-500">Personas</label>
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

          {/* Ayuda */}
          <Card className="p-6 mt-4">
            <div className="flex items-center gap-2 mb-4">
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

      {/* Modal de Imágenes */}
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

      {/* Modal de Confirmación */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¡Reserva Confirmada!</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#0A1E40] mb-2">
              Reserva exitosa
            </h3>
            <p className="text-gray-600 mb-4">
              Su reserva ha sido confirmada para {selectedAmenity?.name} el{' '}
              {selectedDate && format(selectedDate, 'PPP', { locale: es })} a las {selectedTimeSlot}hs
            </p>
            <Button onClick={() => setShowConfirmation(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReservationSystem;