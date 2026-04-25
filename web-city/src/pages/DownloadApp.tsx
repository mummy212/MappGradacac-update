import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

const FEATURES = [
  { icon: '🗺️', title: 'Interaktivna mapa',   desc: 'GPS navigacija i prikaz svih lokacija u gradu' },
  { icon: '📷', title: 'QR popusti',         desc: 'Skeniraj QR i ostvari ekskluzivne popuste u lokalima' },
  { icon: '⭐', title: 'Loyalty kartica',   desc: 'Skupljaj pečate i osvoji nagradu nakon 10 posjeta' },
  { icon: '📣', title: 'Push notifikacije',  desc: 'Budi prvi koji sazna za nove ponude i događaje' },
  { icon: '📴', title: 'Offline mapa',       desc: 'Preuzmi mapu i koristi bez internet veze' },
  { icon: '🚨', title: 'Hitni kontakti',     desc: 'Brz pristup svim hitnim brojevima u gradu' },
];

export default function DownloadApp() {
  const [apkUrl, setApkUrl] = useState('');
  const [apkSize, setApkSize] = useState('');
  const [apkDate, setApkDate] = useState('');
  const [playStore, setPlayStore] = useState('');
  const [appStore, setAppStore] = useState('');

  useEffect(() => {
    fetch('/api/site-settings')
      .then(r => r.json())
      .then(d => {
        setApkUrl(d.apk_url || '');
        setApkSize(d.apk_size || '');
        setApkDate(d.apk_date || '');
        setPlayStore(d.play_store_url || '');
        setAppStore(d.app_store_url || '');
      })
      .catch(() => {});
  }, []);

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
            Sve što trebate znati o gradu, uvijek uz tebe. Besplatno za Android.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {/* APK direktan download */}
            {apkUrl && (
              <a
                href={apkUrl}
                download
                className="bg-green-500 hover:bg-green-400 text-white px-6 py-4 rounded-2xl font-heading font-600 flex items-center gap-3 transition-colors shadow-lg"
              >
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="text-xs text-green-100">Direktno preuzimanje</div>
                  <div className="font-700 text-base">Android APK</div>
                  {apkSize && <div className="text-xs text-green-200">{apkSize} MB · {apkDate}</div>}
                </div>
                <Download size={18} className="ml-1" />
              </a>
            )}

            {/* Google Play */}
            {playStore ? (
              <a href={playStore} target="_blank" rel="noopener noreferrer"
                className="bg-gray-900 text-white px-6 py-4 rounded-2xl font-heading font-600 flex items-center gap-3 hover:bg-gray-800 transition-colors">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Dostupno na</div>
                  <div className="font-700 text-base">Google Play</div>
                </div>
              </a>
            ) : !apkUrl && (
              <div className="bg-gray-900/60 text-white/60 px-6 py-4 rounded-2xl font-heading font-600 flex items-center gap-3 cursor-not-allowed">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="text-xs text-gray-500">Uskoro dostupno</div>
                  <div className="font-700 text-base">Google Play</div>
                </div>
              </div>
            )}

            {/* App Store */}
            {appStore ? (
              <a href={appStore} target="_blank" rel="noopener noreferrer"
                className="bg-black text-white px-6 py-4 rounded-2xl font-heading font-600 flex items-center gap-3 hover:bg-gray-900 transition-colors">
                <span className="text-2xl"></span>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Preuzmi na</div>
                  <div className="font-700 text-base">App Store</div>
                </div>
              </a>
            ) : (
              <div className="bg-black/60 text-white/60 px-6 py-4 rounded-2xl font-heading font-600 flex items-center gap-3 cursor-not-allowed">
                <span className="text-2xl"></span>
                <div className="text-left">
                  <div className="text-xs text-gray-500">Uskoro dostupno</div>
                  <div className="font-700 text-base">App Store</div>
                </div>
              </div>
            )}
          </div>

          {!apkUrl && !playStore && !appStore && (
            <p className="text-white/70 text-sm mt-6">
              📱 Aplikacija je u fazi testiranja — uskoro dostupna za preuzimanje
            </p>
          )}
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

      {/* Instalacija */}
      <section className="py-16 bg-gray-50">
        <div className="container-city text-center">
          <h2 className="section-title mb-3">Kako instalirati APK?</h2>
          <p className="section-sub mb-10">Jednostavno, za manje od minute</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { n: '1', t: 'Preuzmi APK', d: 'Tapni zeleno dugme "Android APK" i sačuvaj fajl na telefon' },
              { n: '2', t: 'Dozvoli instalaciju', d: 'Android može tražiti dozvolu za instalaciju iz nepoznatih izvora — dozvoli' },
              { n: '3', t: 'Pokreni aplikaciju', d: 'Pronađi instaliranu app na telefonu i uživaj u sadržaju' },
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
