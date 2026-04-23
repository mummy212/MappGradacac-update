import { Download, Smartphone, Star, CheckCircle, QrCode, MapPin, Bell } from 'lucide-react';

const FEATURES = [
  { icon: '🗺️', title: 'Interaktivna mapa',   desc: 'GPS navigacija i prikaz svih lokacija u gradu' },
  { icon: '📷', title: 'QR popusti',         desc: 'Skeniraj QR i ostvari ekskluzivne popuste u lokalima' },
  { icon: '⭐', title: 'Loyalty kartica',   desc: 'Skupljaj pečate i osvoji nagradu nakon 10 posjeta' },
  { icon: '📣', title: 'Push notifikacije',  desc: 'Budi prvi koji sazna za nove ponude i događaje' },
  { icon: '📴', title: 'Offline mapa',       desc: 'Preuzmi mapu i koristi bez internet veze' },
  { icon: '🚨', title: 'Hitni kontakti',     desc: 'Brz pristup svim hitnim brojevima u gradu' },
];

export default function DownloadApp() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient py-20 text-center">
        <div className="container-city">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white rounded-full px-5 py-2 text-sm font-600 mb-6">
            <Smartphone size={16} /> Besplatna mobilna aplikacija
          </div>
          <h1 className="font-heading font-800 text-white text-4xl md:text-5xl mb-4">
            Preuzmi Gradačac Mapu
          </h1>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Sve što trebate znati o gradu, uvijek uz tebe. Besplatno za iOS i Android.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="#" className="bg-black text-white px-6 py-4 rounded-2xl font-heading font-600 flex items-center gap-3 hover:bg-gray-900 transition-colors">
              <span className="text-2xl"></span>
              <div className="text-left">
                <div className="text-xs text-gray-400">Preuzmi na</div>
                <div className="font-700 text-base">App Store</div>
              </div>
            </a>
            <a href="#" className="bg-gray-900 text-white px-6 py-4 rounded-2xl font-heading font-600 flex items-center gap-3 hover:bg-gray-800 transition-colors">
              <span className="text-2xl">🤖</span>
              <div className="text-left">
                <div className="text-xs text-gray-400">Dostupno na</div>
                <div className="font-700 text-base">Google Play</div>
              </div>
            </a>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-2 mt-8 text-white/90">
            {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400">★</span>)}
            <span className="font-600">5.0</span>
            <span className="text-primary-200 text-sm">u App Store-u</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container-city">
          <div className="text-center mb-12">
            <h2 className="section-title">Zašto preuzeti aplikaciju?</h2>
            <p className="section-sub">Sve što nudi web stranica i još mnogo više</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6 flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">{f.icon}</div>
                <div>
                  <h3 className="font-heading font-600 text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR or instructions */}
      <section className="py-16 bg-gray-50">
        <div className="container-city text-center">
          <h2 className="section-title mb-3">Kako preuzeti?</h2>
          <p className="section-sub mb-10">Brzo i jednostavno, za manje od minute</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { n: '1', t: 'Otvori App Store / Play', d: 'Na svom telefonu otvori Apple App Store ili Google Play' },
              { n: '2', t: 'Pretraži aplikaciju', d: 'Upiši "Gradačac Mapa" u polje za pretragu' },
              { n: '3', t: 'Preuzmi besplatno', d: 'Tapni Preuzmi i aplikacija se instalira automatski' },
            ].map(s => (
              <div key={s.n} className="card p-6">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-heading font-700 text-xl mx-auto mb-4">{s.n}</div>
                <h3 className="font-heading font-600 text-gray-900 mb-2">{s.t}</h3>
                <p className="text-sm text-gray-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
