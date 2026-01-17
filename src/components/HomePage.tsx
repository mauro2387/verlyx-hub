import { Link } from 'react-router-dom';
import { ArrowRight, Building, Shield, Zap, Users, Calendar, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import Navigation from './Navigation';
import Footer from './Footer';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

export default function HomePage() {
  const heroImages = [
    {
      src: "https://images.unsplash.com/photo-1653895168758-411ef6038015?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDF8fHx8MTc2MTc3MTQyM3ww&ixlib=rb-4.1.0&q=80&w=1080",
      alt: "Exterior del Edificio Aquarela"
    },
    {
      src: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80",
      alt: "Vista Nocturna de Arquitectura Moderna"
    },
    {
      src: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80",
      alt: "Entrada de Edificio de Lujo"
    }
  ];

  const amenities = [
    {
      title: 'Piscina Infinita',
      image: 'https://images.unsplash.com/photo-1558240894-9821078a16a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBidWlsZGluZyUyMHBvb2x8ZW58MXx8fHwxNzYxODU0OTc1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      title: 'Gimnasio Moderno',
      image: 'https://images.unsplash.com/photo-1758448756350-3d0eec02ba37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBneW0lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NjE4Mzc3NDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      title: 'Lobby de Lujo',
      image: 'https://images.unsplash.com/photo-1666880521091-704fe682c175?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBsb2JieSUyMGhvdGVsfGVufDF8fHx8MTc2MTg3NDQwNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      title: 'Vista al Mar',
      image: 'https://images.unsplash.com/photo-1693098243367-93320637839e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvY2VhbiUyMHZpZXclMjBiYWxjb255fGVufDF8fHx8MTc2MTg3NDQwNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    }
  ];

  const features = [
    {
      icon: Building,
      title: 'Ubicación Premium',
      description: 'Ubicado en el corazón de Punta del Este, el destino costero más exclusivo de Uruguay.'
    },
    {
      icon: Shield,
      title: 'Seguridad Inteligente',
      description: 'Monitoreo 24/7 con control de acceso y gestión de visitantes impulsado por IA.'
    },
    {
      icon: Zap,
      title: 'Gestión Instantánea',
      description: 'Reportes de incidentes en tiempo real, seguimiento de pagos y solicitudes de servicios.'
    },
    {
      icon: Users,
      title: 'Centro Comunitario',
      description: 'Conéctate con vecinos, comparte servicios y mantente informado.'
    },
    {
      icon: Calendar,
      title: 'Reservas Fáciles',
      description: 'Reserva amenidades con solo unos clics a través de nuestro sistema inteligente.'
    },
    {
      icon: MessageSquare,
      title: 'Asistente IA',
      description: 'Clasificación y gestión automatizada de solicitudes de mantenimiento.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[600px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1E40]/95 to-[#0A1E40]/80 z-10" />
        <div className="absolute inset-0">
          <Carousel 
            className="w-full h-full" 
            opts={{ 
              loop: true,
              duration: 300,
              interval: 5000,
              skipSnaps: false,
              startIndex: 0,
              dragFree: false,
              containScroll: "trimSnaps",
              align: "center"
            }}
          >
            <CarouselContent className="transition-transform duration-300">
              {heroImages.map((image, index) => (
                <CarouselItem key={index} className="w-full h-[600px]">
                  <ImageWithFallback
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-8 z-20 pointer-events-none">
              <CarouselPrevious className="h-12 w-12 transition-transform hover:scale-105 pointer-events-auto" variant="outline" />
              <CarouselNext className="h-12 w-12 transition-transform hover:scale-105 pointer-events-auto" variant="outline" />
            </div>
          </Carousel>
        </div>
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-center text-white px-4 max-w-4xl">
            <h1 className="mb-6" style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1.2 }}>
              Vida Inteligente. Gestión Sin Complicaciones.
            </h1>
            <p className="mb-8 text-gray-200" style={{ fontSize: '1.25rem' }}>
              Experimenta el futuro de la gestión residencial de lujo en Punta del Este
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button size="lg" className="bg-[#C9A961] hover:bg-[#b39350] text-white">
                  Acceder al Portal
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20 backdrop-blur-sm">
                  Más Información
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="mb-6 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            Bienvenido a Torre Aquarela
          </h2>
          <p className="text-gray-600" style={{ fontSize: '1.125rem' }}>
            Nuestro sistema integral de gestión combina tecnología de vanguardia con servicio personalizado para ofrecer una experiencia de vida sin igual. Desde solicitudes de mantenimiento automatizadas hasta reservas sencillas de amenidades, hemos reinventado lo que significa gestionar un edificio residencial de lujo.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              ¿Por qué elegir Aquarela?
            </h2>
            <p className="text-gray-600" style={{ fontSize: '1.125rem' }}>
              Experimenta la vida de lujo mejorada por tecnología inteligente
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-gray-100">
                <div className="w-12 h-12 bg-[#0A1E40] rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="mb-2 text-[#0A1E40]">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            Amenidades de Clase Mundial
          </h2>
          <p className="text-gray-600" style={{ fontSize: '1.125rem' }}>
            Descubre las excepcionales instalaciones que hacen de Torre Aquarela tu hogar perfecto
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {amenities.map((amenity, index) => (
            <div key={index} className="relative h-80 rounded-xl overflow-hidden group cursor-pointer">
              <ImageWithFallback
                src={amenity.image}
                alt={amenity.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1E40]/80 to-transparent flex items-end">
                <h3 className="text-white p-6" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {amenity.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#0A1E40] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mb-6" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            ¿Listo para Experimentar la Vida Inteligente?
          </h2>
          <p className="mb-8 text-gray-300" style={{ fontSize: '1.125rem' }}>
            Únete a nuestra comunidad o contacta con nuestro equipo de administración
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="bg-[#C9A961] hover:bg-[#b39350] text-white">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                Contactar Administración
              </Button>
            </Link>
            <Link to="/submit-cv">
              <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                Enviar CV
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
