import Navigation from './Navigation';
import Footer from './Footer';
import { Card } from './ui/card';
import { Building2, Home, Wrench, Users, Calendar, Brain } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export default function ServicesPage() {
  const services = [
    {
      icon: Building2,
      title: 'Administración Centralizada',
      description: 'Gestión completa del edificio desde una plataforma unificada. Seguimiento de gastos, monitoreo de operaciones y acceso a informes en tiempo real.',
      features: [
        'Seguimiento financiero en tiempo real',
        'Integración contable automatizada',
        'Gestión digital de documentos',
        'Monitoreo de cumplimiento'
      ],
      color: '#0A1E40'
    },
    {
      icon: Home,
      title: 'Portal del Propietario',
      description: 'Los residentes disfrutan de control total sobre su experiencia en el apartamento a través de un panel personalizado e intuitivo.',
      features: [
        'Saldo de cuenta e historial de pagos',
        'Estados de gastos digitales',
        'Seguimiento de solicitudes de mantenimiento',
        'Sistema de autorización de visitantes'
      ],
      color: '#3b82f6'
    },
    {
      icon: Wrench,
      title: 'Informes de Mantenimiento IA',
      description: 'Envíe problemas con fotos y descripciones. Nuestra IA clasifica, prioriza y los dirige automáticamente al equipo adecuado.',
      features: [
        'Categorización inteligente de problemas',
        'Detección automática de urgencia',
        'Documentación fotográfica',
        'Actualizaciones de estado en tiempo real'
      ],
      color: '#C9A961'
    },
    {
      icon: Users,
      title: 'Red Social Interna',
      description: 'Manténgase conectado con su comunidad. Comparta actualizaciones, coordine servicios, participe en encuestas e interactúe con los vecinos.',
      features: [
        'Anuncios comunitarios',
        'Mensajería entre residentes',
        'Recomendaciones de servicios',
        'Coordinación de eventos y encuestas'
      ],
      color: '#8b5cf6'
    },
    {
      icon: Calendar,
      title: 'Sistema Inteligente de Reservas',
      description: 'Reserve amenidades sin esfuerzo. Vea la disponibilidad en tiempo real y reserve sus horarios preferidos al instante.',
      features: [
        'Calendario de disponibilidad en tiempo real',
        'Confirmación instantánea de reservas',
        'Recordatorios automáticos',
        'Análisis de uso'
      ],
      color: '#10b981'
    },
    {
      icon: Brain,
      title: 'Automatización con IA',
      description: 'La inteligencia artificial avanzada optimiza las operaciones, desde la evaluación de CV para la contratación hasta el mantenimiento predictivo.',
      features: [
        'Análisis automatizado de CV',
        'Alertas de mantenimiento predictivo',
        'Generación inteligente de informes',
        'Asignación inteligente de tareas'
      ],
      color: '#0A1E40'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1E40]/90 to-[#0A1E40]/70 z-10" />
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1666880521091-704fe682c175?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBsb2JieSUyMGhvdGVsfGVufDF8fHx8MTc2MTg3NDQwNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Servicios"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 text-center text-white px-4">
          <h1 style={{ fontSize: '3rem', fontWeight: 700 }}>Nuestros Servicios</h1>
          <p className="mt-4 text-gray-200" style={{ fontSize: '1.25rem' }}>
            Soluciones integrales para una vida de lujo moderna
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            Todo lo que Necesitas
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontSize: '1.125rem' }}>
            Nuestra plataforma integrada reúne todos los aspectos de la gestión de edificios y la vida residencial en una experiencia perfecta.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="p-8 hover:shadow-xl transition-all duration-300 border-gray-100">
              <div 
                className="w-14 h-14 rounded-lg flex items-center justify-center mb-6"
                style={{ backgroundColor: service.color }}
              >
                <service.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="mb-3 text-[#0A1E40]" style={{ fontSize: '1.5rem' }}>
                {service.title}
              </h3>
              <p className="text-gray-600 mb-6">
                {service.description}
              </p>
              <div className="space-y-3">
                {service.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-[#C9A961] rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              Cómo Funciona
            </h2>
            <p className="text-gray-600" style={{ fontSize: '1.125rem' }}>
              Simple, eficiente y siempre a tu alcance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#0A1E40] rounded-full flex items-center justify-center mx-auto mb-6 text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                1
              </div>
              <h3 className="mb-3 text-[#0A1E40]">Accede a tu Portal</h3>
              <p className="text-gray-600">
                Inicia sesión con tus credenciales para acceder a tu panel personalizado con toda la información relevante.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#C9A961] rounded-full flex items-center justify-center mx-auto mb-6 text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                2
              </div>
              <h3 className="mb-3 text-[#0A1E40]">Toma Acción</h3>
              <p className="text-gray-600">
                Envía solicitudes, haz reservas, verifica pagos o interactúa con la comunidad, todo en un solo lugar.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#0A1E40] rounded-full flex items-center justify-center mx-auto mb-6 text-white" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                3
              </div>
              <h3 className="mb-3 text-[#0A1E40]">Mantente Informado</h3>
              <p className="text-gray-600">
                Recibe actualizaciones y notificaciones en tiempo real sobre tus solicitudes, reservas y anuncios del edificio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-[#0A1E40] mb-2" style={{ fontSize: '3rem', fontWeight: 700 }}>98%</div>
            <p className="text-gray-600">Satisfacción de Residentes</p>
          </div>
          <div className="text-center">
            <div className="text-[#0A1E40] mb-2" style={{ fontSize: '3rem', fontWeight: 700 }}>24/7</div>
            <p className="text-gray-600">Disponibilidad del Sistema</p>
          </div>
          <div className="text-center">
            <div className="text-[#0A1E40] mb-2" style={{ fontSize: '3rem', fontWeight: 700 }}>&lt;2h</div>
            <p className="text-gray-600">Tiempo de Respuesta Promedio</p>
          </div>
          <div className="text-center">
            <div className="text-[#0A1E40] mb-2" style={{ fontSize: '3rem', fontWeight: 700 }}>100%</div>
            <p className="text-gray-600">Transparencia</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
