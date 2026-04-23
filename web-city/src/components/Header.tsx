import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MapPin, Bell } from 'lucide-react';

const NAV = [
  { to: '/lokacije',     label: 'Lokacije' },
  { to: '/dogadjaji',    label: 'Događaji' },
  { to: '/vijesti',      label: 'Vijesti' },
  { to: '/znamenitosti', label: 'Znamenitosti' },
  { to: '/hitni-brojevi',label: 'Hitni br.' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm border-b border-gray-100'
    }`}>
      <div className="container-city">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-primary-700 transition-colors">
              <MapPin size={18} className="text-white" />
            </div>
            <div>
              <span className="font-heading font-700 text-gray-900 text-lg leading-none block">Gradačac</span>
              <span className="font-heading font-500 text-primary-600 text-xs leading-none">Mapa</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(n => (
              <Link key={n.to} to={n.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(n.to)
                    ? 'bg-primary-50 text-primary-700 font-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                {n.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/preuzmi-app"
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-heading font-600
                hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-1.5">
              <Bell size={15} />
              Preuzmi App
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <div className="container-city py-3 flex flex-col gap-1">
            {NAV.map(n => (
              <Link key={n.to} to={n.to}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname.startsWith(n.to)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {n.label}
              </Link>
            ))}
            <Link to="/preuzmi-app"
              className="mt-2 bg-primary-600 text-white px-4 py-3 rounded-xl text-sm font-600
                text-center font-heading">
              📱 Preuzmi App
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
