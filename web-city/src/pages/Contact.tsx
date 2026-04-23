import { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle } from 'lucide-react';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Open mailto
    const subject = encodeURIComponent(form.subject || 'Upit - Gradacac Mapa');
    const body = encodeURIComponent(`Ime: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.open(`mailto:info@gradacac-mapa.ba?subject=${subject}&body=${body}`);
    setSent(true);
  };

  return (
    <div className="py-10">
      <div className="container-city">
        <div className="mb-10">
          <h1 className="section-title">Kontakt</h1>
          <p className="section-sub">Imate pitanje ili prijedlog? Javite nam se!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="card p-10 text-center">
                <CheckCircle size={52} className="text-emerald-500 mx-auto mb-4" />
                <h2 className="font-heading font-700 text-xl mb-2">Hvala na poruci!</h2>
                <p className="text-gray-500">Vaš email klijent bi trebao otvoriti poruku. Možete je poslati direktno.</p>
                <button onClick={() => setSent(false)} className="btn-outline mt-6">Pošalji još jednu</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-600 text-gray-700 mb-1.5">Ime i prezime *</label>
                    <input required type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      placeholder="Amer Hasanović"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-600 text-gray-700 mb-1.5">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                      placeholder="amer@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-600 text-gray-700 mb-1.5">Naslov poruke</label>
                  <input type="text" value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}
                    placeholder="Upit, prijedlog, prijava..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
                <div>
                  <label className="block text-sm font-600 text-gray-700 mb-1.5">Poruka *</label>
                  <textarea required value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))}
                    rows={5} placeholder="Vaša poruka..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" />
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-4">
                  <Send size={18} /> Pošalji poruku
                </button>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            {[
              { icon: <Mail size={20} className="text-primary-600" />, title: 'Email', val: 'info@gradacac-mapa.ba' },
              { icon: <Phone size={20} className="text-primary-600" />, title: 'Telefon', val: '+387 35 xxx xxx' },
              { icon: <MapPin size={20} className="text-primary-600" />, title: 'Lokacija', val: 'Gradačac, Bosna i Hercegovina' },
            ].map(c => (
              <div key={c.title} className="card p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">{c.icon}</div>
                <div>
                  <div className="font-heading font-600 text-gray-900 text-sm">{c.title}</div>
                  <div className="text-gray-500 text-sm mt-0.5">{c.val}</div>
                </div>
              </div>
            ))}

            <div className="card p-5">
              <h4 className="font-heading font-600 text-sm mb-3">Radno vrijeme podrške</h4>
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex justify-between"><span>Pon – Pet</span><span className="font-600">09:00 – 17:00</span></div>
                <div className="flex justify-between"><span>Subota</span><span className="font-600">10:00 – 14:00</span></div>
                <div className="flex justify-between"><span>Nedjelja</span><span className="font-600 text-gray-400">Zatvoreno</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
