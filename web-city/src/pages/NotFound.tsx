import { Link } from 'react-router-dom';
import { MapPin, Home, ArrowLeft, Search } from 'lucide-react';
import SEOHead from '../components/SEOHead';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <SEOHead title="Stranica nije pronađena" noindex />

      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <MapPin size={42} className="text-primary-600" />
        </div>

        {/* 404 */}
        <div className="text-8xl font-heading font-800 text-primary-200 mb-2 leading-none">404</div>

        <h1 className="text-2xl font-heading font-700 text-gray-900 mb-3">
          Stranica nije pronađena
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Ova stranica ne postoji ili je premještena. Možda je URL pogrešan?
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary justify-center">
            <Home size={18} />
            Početna stranica
          </Link>
          <Link to="/lokacije" className="btn-outline justify-center">
            <Search size={18} />
            Pretraži lokacije
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-10 pt-8 border-t border-slate-200">
          <p className="text-sm text-gray-400 mb-4">Možda tražite:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { to: '/dogadjaji', label: 'Događaji' },
              { to: '/vijesti', label: 'Vijesti' },
              { to: '/znamenitosti', label: 'Znamenitosti' },
              { to: '/hitni-brojevi', label: 'Hitni Brojevi' },
            ].map(l => (
              <Link key={l.to} to={l.to}
                className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
