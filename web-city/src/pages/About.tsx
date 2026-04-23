import { Link } from 'react-router-dom';
import { MapPin, Smartphone, Users, Zap } from 'lucide-react';
import DownloadBanner from '../components/DownloadBanner';

export default function About() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="container-city text-center">
          <div className="w-20 h-20 bg-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <MapPin size={38} className="text-white" />
          </div>
          <h1 className="section-title text-4xl mb-4">O aplikaciji Gradačac Mapa</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Digitalni vodič kroz grad Gradačac — projekt koji spaja lokalce i turiste sa gradom.
          </p>
        </div>
      </section>

      {/* Misija */}
      <section className="py-16">
        <div className="container-city">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="section-title mb-4">Naša misija</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Gradačac Mapa je stvorena sa ciljem da svim stanovnicima i turistima učini grad dostižnijim, informativnijim i privlačnijim.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Vjerujemo da svaki lokalni posao zaslužuje digitalnu vidljivost, a svaki posjetilac zaslužuje lak pristup informacijama o gradu.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Aplikacija je besplatna i uvijek će biti besplatna za korisnike.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <MapPin className="text-primary-600" />,    title: 'Lokacije', val: 'Restorani, marketi, servisi' },
                { icon: <Smartphone className="text-primary-600" />, title: 'Mobilna', val: 'iOS & Android' },
                { icon: <Users className="text-primary-600" />,      title: 'Za sve', val: 'Lokalni i turisti' },
                { icon: <Zap className="text-primary-600" />,        title: 'Besplatno', val: 'Uvijek besplatno' },
              ].map(s => (
                <div key={s.title} className="card p-5">
                  <div className="mb-2">{s.icon}</div>
                  <div className="font-heading font-600 text-gray-900 text-sm">{s.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech */}
      <section className="py-16 bg-gray-50">
        <div className="container-city text-center">
          <h2 className="section-title mb-10">Tehnički stack</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {['React Native + Expo', 'FastAPI (Python)', 'MongoDB', 'Leaflet.js', 'React + Vite', 'Tailwind CSS'].map(t => (
              <span key={t} className="badge bg-primary-100 text-primary-700 px-5 py-2.5 text-sm font-600">{t}</span>
            ))}
          </div>
        </div>
      </section>

      <DownloadBanner />
    </div>
  );
}
