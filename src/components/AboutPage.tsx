import { useState } from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Building2, Target, Eye, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function AboutPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('¡Mensaje enviado con éxito! Te contactaremos pronto.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1E40]/90 to-[#0A1E40]/70 z-10" />
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1646420890000-f5185ccbec82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdW50YSUyMGRlbCUyMGVzdGUlMjBza3lsaW5lfGVufDF8fHx8MTc2MTg3NDQwNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Punta del Este"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 text-center text-white px-4">
          <h1 style={{ fontSize: '3rem', fontWeight: 700 }}>Sobre Torre Aquarela</h1>
          <p className="mt-4 text-gray-200" style={{ fontSize: '1.25rem' }}>
            Redefiniendo el lujo residencial en Punta del Este
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="mb-6 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              Nuestra Historia
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Torre Aquarela se alza como un faro de lujo moderno en Punta del Este, el destino costero más prestigioso de Uruguay. Nuestra historia comenzó con una visión simple: crear no solo una residencia, sino un estilo de vida que combine perfectamente tecnología, confort y comunidad.
              </p>
              <p>
                Ubicada en el corazón de Punta del Este, nuestro edificio ofrece acceso incomparable a playas prístinas, restaurantes de clase mundial y experiencias culturales vibrantes. Pero lo que verdaderamente nos distingue es nuestro compromiso con la innovación en la gestión de edificios.
              </p>
              <p>
                A través de nuestro Sistema Aquarela, hemos transformado la experiencia tradicional de vida en apartamentos. Cada aspecto de tu vida diaria —desde solicitudes de mantenimiento hasta reservas de amenidades, desde pagos hasta participación comunitaria— está optimizado mediante automatización inteligente y servicio personalizado.
              </p>
            </div>
          </div>
          <div className="relative h-[500px] rounded-xl overflow-hidden shadow-2xl">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1653895168758-411ef6038015?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDF8fHx8MTc2MTc3MTQyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Aquarela Tower"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              Nuestra Misión y Valores
            </h2>
            <p className="text-gray-600" style={{ fontSize: '1.125rem' }}>
              Principios que definen quiénes somos
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#0A1E40] rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="mb-4 text-[#0A1E40]">Transparencia</h3>
              <p className="text-gray-600">
                Visibilidad completa de las operaciones, gastos y decisiones del edificio. Cada residente tiene acceso a información en tiempo real.
              </p>
            </Card>
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#C9A961] rounded-full flex items-center justify-center mx-auto mb-6">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="mb-4 text-[#0A1E40]">Automatización</h3>
              <p className="text-gray-600">
                Sistemas inteligentes que manejan tareas rutinarias, permitiendo a nuestro equipo enfocarse en el servicio personalizado y experiencias excepcionales.
              </p>
            </Card>
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-[#0A1E40] rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="mb-4 text-[#0A1E40]">Confort</h3>
              <p className="text-gray-600">
                Tu tranquilidad es nuestra prioridad. Desde soporte 24/7 hasta mantenimiento proactivo, nos aseguramos de que tu hogar esté siempre perfecto.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative h-[400px] rounded-xl overflow-hidden shadow-2xl">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1646420890000-f5185ccbec82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdW50YSUyMGRlbCUyMGVzdGUlMjBza3lsaW5lfGVufDF8fHx8MTc2MTg3NDQwNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Punta del Este"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="mb-6 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              Punta del Este
            </h2>
            <p className="text-gray-600 mb-6">
              Conocida como el "Mónaco de Sudamérica", Punta del Este es el principal balneario de Uruguay y uno de los destinos más exclusivos de América Latina. Con sus impresionantes playas, vida nocturna sofisticada y atractivo durante todo el año, ofrece el equilibrio perfecto entre tranquilidad y emoción.
            </p>
            <div className="space-y-3 text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#C9A961] rounded-full" />
                <span>2 aeropuertos internacionales a menos de 90 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#C9A961] rounded-full" />
                <span>Campos de golf y puertos deportivos de clase mundial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#C9A961] rounded-full" />
                <span>Restaurantes gourmet y compras de lujo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#C9A961] rounded-full" />
                <span>Comunidad segura, estable y acogedora</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              Contáctanos
            </h2>
            <p className="text-gray-600" style={{ fontSize: '1.125rem' }}>
              ¿Tienes preguntas? Nos encantaría escucharte.
            </p>
          </div>
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 text-[#0A1E40]">Nombre Completo</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                  className="bg-gray-50"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#0A1E40]">Correo Electrónico</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                  required
                  className="bg-gray-50"
                />
              </div>
              <div>
                <label className="block mb-2 text-[#0A1E40]">Mensaje</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="¿Cómo podemos ayudarte?"
                  required
                  rows={6}
                  className="bg-gray-50"
                />
              </div>
              <Button type="submit" className="w-full bg-[#0A1E40] hover:bg-[#0f2952] text-white">
                Enviar Mensaje
              </Button>
            </form>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
