import { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { api } from '../api';
import { Emergency as EmergencyType } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const FALLBACK: EmergencyType[] = [
  { id: '1', section: 'Hitni Servisi', section_emoji: '🚨', name: 'Opći hitni broj', number: '112', note: 'Policija, vatrogasci, hitna pomoć' },
  { id: '2', section: 'Hitni Servisi', section_emoji: '🚨', name: 'Policija', number: '122' },
  { id: '3', section: 'Hitni Servisi', section_emoji: '🚨', name: 'Vatrogasci', number: '123' },
  { id: '4', section: 'Hitni Servisi', section_emoji: '🚨', name: 'Hitna pomoć', number: '124' },
];

const CAT_COLORS: Record<string, { bg: string; icon: string }> = {
  'Hitno':     { bg: 'bg-red-500',    icon: '🚨' },
  'Policija':  { bg: 'bg-blue-600',   icon: '👮' },
  'Vatrogasci':{ bg: 'bg-orange-500', icon: '🔥' },
  'Zdravlje':  { bg: 'bg-emerald-500',icon: '💉' },
  'default':   { bg: 'bg-gray-500',   icon: '📞' },
};

export default function Emergency() {
  const [contacts, setContacts] = useState<EmergencyType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.emergency()
      .then(d => { setContacts(Array.isArray(d) && d.length > 0 ? d : FALLBACK); })
      .catch(() => setContacts(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  // Group by section
  const groups = contacts.reduce<Record<string, EmergencyType[]>>((acc, c) => {
    const g = c.section || 'Ostalo';
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  return (
    <div className="py-10">
      <div className="container-city">
        <div className="mb-8">
          <h1 className="section-title">🚨 Hitni Brojevi</h1>
          <p className="section-sub">Važni kontakti u slučaju hitnosti</p>
        </div>

        {/* Big 112 banner */}
        <div className="bg-red-600 rounded-2xl p-8 mb-10 text-center shadow-lg">
          <div className="text-6xl font-heading font-800 text-white mb-2">112</div>
          <div className="text-red-100 text-lg font-500">Opći hitni broj — Policija, vatrogasci, hitna pomoć</div>
          <a href="tel:112" className="mt-5 inline-flex items-center gap-2 bg-white text-red-600 px-8 py-3 rounded-xl font-heading font-700 hover:bg-red-50 transition-colors shadow-sm">
            <Phone size={18} /> Pozovi 112
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.entries(groups).map(([group, items]) => {
            const style = CAT_COLORS[group] || CAT_COLORS.default;
            return items.map(c => (
              <div key={c.id} className="card p-6 flex items-center gap-5">
                <div className={`w-16 h-16 ${style.bg} rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm`}>
                  <span className="text-2xl">{style.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-600 text-gray-900">{c.name}</div>
                  {c.note && <div className="text-sm text-gray-500 mt-0.5 line-clamp-1">{c.note}</div>}
                  <a href={`tel:${c.number}`} className="font-heading font-700 text-primary-600 text-xl mt-1 block hover:text-primary-700">{c.number}</a>
                </div>
                <a href={`tel:${c.number}`}
                  className="flex-shrink-0 bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
                  <Phone size={20} />
                </a>
              </div>
            ));
          })}
        </div>

        {/* Info box */}
        <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-heading font-600 text-amber-900 mb-2">⚠️ Važna napomena</h3>
          <p className="text-amber-700 text-sm leading-relaxed">
            U slučaju hitnosti uvijek birajte broj <strong>112</strong>. Ovaj broj radi i bez SIM kartice ili bez signala mobilne mreže. Budite mirni i jasno recite svoju lokaciju dispečeru.
          </p>
        </div>
      </div>
    </div>
  );
}
