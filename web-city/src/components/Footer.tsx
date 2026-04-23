import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';

const LINKS = [
  { group: 'Istraži', items: [
    { to: '/lokacije',     label: 'Sve lokacije' },
    { to: '/dogadjaji',    label: 'Događaji' },
    { to: '/vijesti',      label: 'Vijesti' },
    { to: '/znamenitosti', label: 'Znamenitosti' },
  ]},
  { group: 'Korisno', items: [
    { to: '/hitni-brojevi', label: 'Hitni brojevi' },
    { to: '/preuzmi-app',   label: 'Preuzmi app' },
    { to: '/o-aplikaciji',  label: 'O aplikaciji' },
    { to: '/kontakt',       label: 'Kontakt' },
  ]},
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-city py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <MapPin size={20} className="text-white" />
              </div>
              <div>
                <div className="font-heading font-700 text-white text-xl">Gradačac Mapa</div>
                <div className="text-primary-400 text-xs">Digitalni vodič kroz grad</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-400 max-w-xs">
              Sve što trebate znati o Gradačcu na jednom mjestu.
              Restorani, eventi, znamenitosti, hitni brojevi i još mnogo toga.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="#" className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors">
                <Facebook size={16} />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors">
                <Instagram size={16} />
              </a>
            </div>
          </div>

          {/* Links */}
          {LINKS.map(g => (
            <div key={g.group}>
              <h4 className="font-heading font-600 text-white text-sm mb-4 uppercase tracking-wide">{g.group}</h4>
              <ul className="space-y-2">
                {g.items.map(item => (
                  <li key={item.to}>
                    <Link to={item.to} className="text-sm text-gray-400 hover:text-white transition-colors">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© 2026 Gradačac Mapa. Sva prava zadržana.</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Phone size={12} /> 112</span>
            <span className="flex items-center gap-1"><Mail size={12} /> info@gradacac-mapa.ba</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
