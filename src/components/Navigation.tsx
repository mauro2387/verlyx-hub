import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav style={{backgroundColor: '#64D4F5'}} className="border-b border-[#64D4F5]/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Aquarela Logo"
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link to="/" className="text-white hover:text-[#C9A961] transition-colors whitespace-nowrap text-base xl:text-lg" style={{ fontWeight: 900 }}>
              Inicio
            </Link>
            <Link to="/about" className="text-white hover:text-[#C9A961] transition-colors whitespace-nowrap text-base xl:text-lg" style={{ fontWeight: 900 }}>
              Sobre Nosotros
            </Link>
            <Link to="/services" className="text-white hover:text-[#C9A961] transition-colors whitespace-nowrap text-base xl:text-lg" style={{ fontWeight: 900 }}>
              Servicios
            </Link>
            <Link to="/submit-cv" className="text-white hover:text-[#C9A961] transition-colors whitespace-nowrap text-base xl:text-lg" style={{ fontWeight: 900 }}>
              Trabaja con Nosotros
            </Link>
          </div>

          {/* Login Button */}
          <div className="hidden lg:flex items-center">
            <Link to="/login">
              <Button className="bg-[#0A1E40] hover:bg-[#0f2952] text-white whitespace-nowrap text-base xl:text-lg transition-colors" style={{ fontWeight: 900 }}>
                Iniciar Sesión
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <Link to="/" className="text-white hover:text-[#C9A961] py-2 text-base" style={{ fontWeight: 900 }}>
                Inicio
              </Link>
              <Link to="/about" className="text-white hover:text-[#C9A961] py-2 text-base" style={{ fontWeight: 900 }}>
                Sobre Nosotros
              </Link>
              <Link to="/services" className="text-white hover:text-[#C9A961] py-2 text-base" style={{ fontWeight: 900 }}>
                Servicios
              </Link>
              <Link to="/submit-cv" className="text-white hover:text-[#C9A961] py-2 text-base" style={{ fontWeight: 900 }}>
                Trabaja con Nosotros
              </Link>
              <Link to="/login" className="pt-2">
                <Button className="bg-[#0A1E40] hover:bg-[#0f2952] text-white w-full">
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
