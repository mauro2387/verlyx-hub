import { Link } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0A1E40] text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#C9A961] rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Aquarela Building System</span>
            </div>
            <p className="text-gray-300 mb-4">
              Smart Living. Seamless Management. Experience luxury residential management in Punta del Este.
            </p>
            <div className="flex flex-col gap-2 text-gray-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Punta del Este, Uruguay</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>info@aquarela.com.uy</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+598 4224 5678</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-gray-300 hover:text-[#C9A961] transition-colors">
                Home
              </Link>
              <Link to="/about" className="text-gray-300 hover:text-[#C9A961] transition-colors">
                About Us
              </Link>
              <Link to="/services" className="text-gray-300 hover:text-[#C9A961] transition-colors">
                Services
              </Link>
              <Link to="/submit-cv" className="text-gray-300 hover:text-[#C9A961] transition-colors">
                Careers
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4">Legal</h4>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-gray-300 hover:text-[#C9A961] transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-gray-300 hover:text-[#C9A961] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-300 hover:text-[#C9A961] transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Aquarela Building System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
