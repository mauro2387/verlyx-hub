import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface OwnerExperiencesProps {
  experiences?: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    date: string;
    time: string;
    location: string;
    quota: string;
    tags?: string[];
  }>;
}

const statusCopy: Record<'pending' | 'approved' | 'rejected', { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobado', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-700' }
};

const ctaCopy: Record<'pending' | 'approved' | 'rejected', { primary: string; helper: string }> = {
  approved: {
    primary: 'Reservar lugar',
    helper: 'Confirma tu asistencia y recibe instrucciones de concierge.'
  },
  pending: {
    primary: 'Unirse a lista de interés',
    helper: 'Te avisaremos en cuanto se liberen cupos o nuevas fechas.'
  },
  rejected: {
    primary: 'Enviar nueva propuesta',
    helper: '¿Tienes una idea similar? Comparte sugerencias para próximos eventos.'
  }
};

export default function OwnerExperiences({ experiences }: OwnerExperiencesProps) {
  const items = experiences ?? [
    {
      id: '1',
      title: 'Ciclo gastronómico sunset',
      description: 'Experiencia privada con chef residente, maridaje de autor y vista 360° en nuestro sky lounge.',
      status: 'approved' as const,
      date: '2025-11-18',
      time: '19:30 - 22:00',
      location: 'Sky Lounge • Piso 32',
      quota: '12 lugares exclusivos',
      tags: ['Chef invitado', 'Maridaje premium']
    },
    {
      id: '2',
      title: 'Noches de jazz en lobby bar',
      description: 'Sesión íntima con cuarteto residente, cóctel signature y menú finger food del bar del edificio.',
      status: 'pending' as const,
      date: '2025-11-29',
      time: '21:00 - 23:30',
      location: 'Lobby bar • Planta baja',
      quota: '20 cupos por noche',
      tags: ['Música en vivo', 'Mixología house']
    },
    {
      id: '3',
      title: 'Wellness sunrise experience',
      description: 'Clase guiada de yoga y breathwork en la terraza wellness con estaciones de cold-press juicing.',
      status: 'pending' as const,
      date: '2025-12-05',
      time: '06:30 - 08:00',
      location: 'Terraza wellness • Piso 12',
      quota: '16 mats disponibles',
      tags: ['Bienestar', 'Concierge']
    }
  ];

  return (
    <section className="space-y-6">
      {items.map((experience) => {
        const { label, className } = statusCopy[experience.status];
        const { primary, helper } = ctaCopy[experience.status];
        return (
          <Card
            key={experience.id}
            className="relative overflow-hidden border border-blue-100 bg-white/90 shadow-[0_18px_40px_-28px_rgba(10,30,64,0.35)]"
          >
            <div
              className="absolute inset-y-0 right-[-20%] hidden w-1/2 rotate-12 bg-gradient-to-br from-[#C4AC6C]/40 via-[#C9A961]/20 to-transparent blur-3xl lg:block"
              aria-hidden="true"
            />
            <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`${className} border-0`}>{label}</Badge>
                  <span className="text-xs uppercase tracking-[0.2em] text-[#0A1E40]/70">Club de residentes</span>
                </div>
                <h3 className="text-2xl font-semibold text-[#0A1E40]">{experience.title}</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-gray-600">{experience.description}</p>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="border-[#0A1E40]/10 bg-[#0A1E40]/5 text-[#0A1E40]">
                    {experience.location}
                  </Badge>
                  <Badge variant="outline" className="border-[#C9A961]/30 bg-[#C9A961]/10 text-[#7c6232]">
                    Horario: {experience.time}
                  </Badge>
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                    {experience.quota}
                  </Badge>
                  {experience.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-gray-500">Agenda boutique · Fecha: {experience.date}</p>
              </div>

              <div className="flex w-full flex-col gap-3 md:w-64">
                <Button className="w-full bg-[#0A1E40] text-white hover:bg-[#0f2952]">
                  {primary}
                </Button>
                <p className="text-xs text-gray-500 md:text-center">{helper}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
