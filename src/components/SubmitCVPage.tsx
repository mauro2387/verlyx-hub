import { useState } from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from './figma/ImageWithFallback';

export default function SubmitCVPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate AI analysis
    setTimeout(() => {
      setSubmitted(true);
      toast.success('Your application has been received and analyzed by our AI system!');
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      toast.success('CV uploaded successfully');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
                      <h1 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              ¡Solicitud Recibida!
            </h1>
            <p className="text-gray-600 mb-8" style={{ fontSize: '1.125rem' }}>
              Gracias por tu interés en unirte al equipo de Aquarela. Nuestro sistema de IA ha analizado tu CV y lo ha categorizado según tu experiencia y el puesto al que aplicaste.
            </p>
            <Card className="p-6 text-left mb-8 bg-gray-50">
              <h3 className="mb-4 text-[#0A1E40]">Resumen del Análisis de IA</h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Coincidencia con el Puesto:</span>
                  <span className="text-[#0A1E40]" style={{ fontWeight: 700 }}>95%</span>
                </div>
                <div className="flex justify-between">
                  <span>Nivel de Experiencia:</span>
                  <span className="text-[#0A1E40]" style={{ fontWeight: 700 }}>Senior</span>
                </div>
                <div className="flex justify-between">
                  <span>Clasificación:</span>
                  <span className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{formData.position}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="text-green-600" style={{ fontWeight: 700 }}>En Revisión</span>
                </div>
              </div>
            </Card>
            <p className="text-gray-600 mb-6">
              Nuestro equipo de RRHH revisará tu solicitud y te contactará dentro de 5-7 días hábiles si tu perfil coincide con nuestras vacantes actuales.
            </p>
            <Button 
              onClick={() => {
                setSubmitted(false);
                setFormData({ fullName: '', email: '', phone: '', position: '' });
                setFile(null);
              }}
              className="bg-[#0A1E40] hover:bg-[#0f2952] text-white"
            >
              Enviar Otra Solicitud
            </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1E40]/90 to-[#0A1E40]/70 z-10" />
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1758448756350-3d0eec02ba37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBneW0lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NjE4Mzc3NDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Carreras"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 text-center text-white px-4">
          <h1 style={{ fontSize: '3rem', fontWeight: 700 }}>Únete a Nuestro Equipo</h1>
          <p className="mt-4 text-gray-200" style={{ fontSize: '1.25rem' }}>
            Sé parte de una experiencia innovadora en hospitalidad de lujo
          </p>
        </div>
      </section>

      {/* Why Join Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            ¿Por qué trabajar en Aquarela?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontSize: '1.125rem' }}>
            Únete a un equipo que valora la innovación, la excelencia y el crecimiento profesional
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="p-6 text-center">
            <div className="text-[#C9A961] mb-3" style={{ fontSize: '2rem', fontWeight: 700 }}>💼</div>
            <h3 className="mb-2 text-[#0A1E40]">Beneficios Competitivos</h3>
            <p className="text-gray-600">Paquetes de compensación atractivos y oportunidades de desarrollo profesional</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-[#C9A961] mb-3" style={{ fontSize: '2rem', fontWeight: 700 }}>🚀</div>
            <h3 className="mb-2 text-[#0A1E40]">Innovación Primero</h3>
            <p className="text-gray-600">Trabaja con tecnología de punta y sistemas potenciados por IA</p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-[#C9A961] mb-3" style={{ fontSize: '2rem', fontWeight: 700 }}>🌟</div>
            <h3 className="mb-2 text-[#0A1E40]">Ambiente Premium</h3>
            <p className="text-gray-600">Sé parte de la comunidad residencial más exclusiva de Punta del Este</p>
          </Card>
        </div>
      </section>

      {/* Application Form */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-[#0A1E40]" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              Envía tu Solicitud
            </h2>
            <p className="text-gray-600" style={{ fontSize: '1.125rem' }}>
              Nuestra IA analizará tu CV y lo emparejará con los puestos disponibles
            </p>
          </div>
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 text-[#0A1E40]">Nombre Completo *</label>
                <Input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#0A1E40]">Correo Electrónico *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="juan@ejemplo.com"
                  required
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#0A1E40]">Número de Teléfono *</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+598 99 123 456"
                  required
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#0A1E40]">Puesto Deseado *</label>
                <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })} required>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecciona un puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Técnico de Mantenimiento</SelectItem>
                    <SelectItem value="cleaning">Personal de Limpieza</SelectItem>
                    <SelectItem value="concierge">Conserje</SelectItem>
                    <SelectItem value="security">Personal de Seguridad</SelectItem>
                    <SelectItem value="manager">Gerente de Propiedad</SelectItem>
                    <SelectItem value="administrative">Asistente Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 text-[#0A1E40]">Subir CV/Currículum *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#C9A961] transition-colors cursor-pointer bg-white">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    required
                    className="hidden"
                    id="cv-upload"
                  />
                  <label htmlFor="cv-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    {file ? (
                      <p className="text-[#0A1E40]" style={{ fontWeight: 700 }}>{file.name}</p>
                    ) : (
                      <>
                        <p className="text-gray-600 mb-2">Haz clic para subir o arrastra y suelta</p>
                        <p className="text-gray-400">PDF, DOC, o DOCX (máx. 5MB)</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900">
                  <strong>Evaluación con IA:</strong> Tu CV será analizado automáticamente por nuestro sistema de inteligencia artificial para emparejar tus habilidades y experiencia con los puestos disponibles.
                </p>
              </div>

              <Button type="submit" className="w-full bg-[#0A1E40] hover:bg-[#0f2952] text-white">
                Enviar Solicitud
              </Button>
            </form>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
