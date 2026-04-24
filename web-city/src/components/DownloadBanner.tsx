import { Link } from 'react-router-dom';
import { Download, Smartphone, Star } from 'lucide-react';

export default function DownloadBanner() {
  return (
    <section className="hero-gradient py-16 md:py-20">
      <div className="container-city">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white rounded-full px-4 py-2 text-sm font-600 mb-6">
              <Smartphone size={16} /> Mobilna aplikacija
            </div>
            <h2 className="font-heading font-700 text-white text-3xl md:text-4xl mb-4">
              Preuzmi Gradačac Mapu
            </h2>
            <p className="text-primary-100 text-base mb-6 max-w-md">
              Uvijek uz tebe — mapa, navigacija, QR popusti, loyalty kartica i obavještenja
              direktno na tvom telefonu.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
              {['GPS navigacija', 'QR popusti', 'Offline mapa', 'Push notifikacije'].map(f => (
                <span key={f} className="bg-white/15 text-white text-sm px-3 py-1.5 rounded-full border border-white/25">{f}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link to="/preuzmi-app"
                className="bg-white text-primary-700 px-6 py-3 rounded-xl font-heading font-700 flex items-center gap-2 hover:bg-primary-50 transition-colors shadow-lg">
                <Download size={18} /> Preuzmi besplatno
              </Link>
            </div>
          </div>
          <div className="hidden sm:flex flex-shrink-0">
            <div className="w-40 h-72 md:w-48 md:h-80 bg-white/10 rounded-[2.5rem] border-4 border-white/30 flex items-center justify-center shadow-2xl">
              <div className="text-center text-white">
                <div className="text-6xl mb-3">🗺️</div>
                <div className="font-heading font-700 text-xl">Gradačac</div>
                <div className="text-primary-200 text-sm">Mapa</div>
                <div className="mt-3 flex items-center justify-center gap-1">
                  {[1,2,3,4,5].map(s => <Star key={s} size={12} className="text-amber-300 fill-amber-300" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
