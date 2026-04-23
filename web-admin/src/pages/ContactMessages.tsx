import { useState, useEffect } from 'react';
import { Mail, Trash2, Inbox } from 'lucide-react';
import { api } from '../api';

const BS_MONTHS = ['januara','februara','marta','aprila','maja','juna','jula','augusta','septembra','oktobra','novembra','decembra'];
const fmtDate = (dt: string) => { try { const d = new Date(dt); return `${d.getDate()}. ${BS_MONTHS[d.getMonth()]} ${d.getFullYear()}.`; } catch { return dt; } };

interface ContactMsg {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function ContactMessages() {
  const [msgs, setMsgs] = useState<ContactMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMsg | null>(null);

  const load = async () => {
    try {
      const data = await api.get('/admin/contact-messages').then(r => r.data);
      setMsgs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.put(`/admin/contact-messages/${id}/read`, {});
    setMsgs(m => m.map(x => x.id === id ? { ...x, read: true } : x));
  };

  const del = async (id: string) => {
    if (!confirm('Obrisati ovu poruku?')) return;
    await api.delete(`/admin/contact-messages/${id}`);
    setMsgs(m => m.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const unread = msgs.filter(m => !m.read).length;

  if (loading) return <div className="p-8 text-center text-slate-500">Učitavanje...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kontakt Poruke</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unread > 0 ? <span className="text-blue-600 font-semibold">{unread} nepročitanih</span> : 'Sve poruke pročitane'}
            {' · '}{msgs.length} ukupno
          </p>
        </div>
        <Mail size={28} className="text-slate-400" />
      </div>

      {msgs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Inbox size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nema kontakt poruka</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* List */}
          <div className="space-y-2">
            {msgs.map(m => (
              <div key={m.id}
                onClick={() => { setSelected(m); if (!m.read) markRead(m.id); }}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:border-blue-300 ${selected?.id === m.id ? 'border-blue-400 shadow-sm' : 'border-slate-200'} ${!m.read ? 'bg-blue-50/30' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!m.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      <span className={`text-sm font-semibold text-slate-800 truncate ${!m.read ? 'font-bold' : ''}`}>{m.name}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{m.email}</div>
                    {m.subject && <div className="text-xs text-slate-600 mt-1 font-medium truncate">{m.subject}</div>}
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{m.message}</div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <div className="text-xs text-slate-400">{fmtDate(m.created_at)}</div>
                    <button onClick={e => { e.stopPropagation(); del(m.id); }}
                      className="text-red-400 hover:text-red-600 p-1 rounded transition-colors block ml-auto">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detail */}
          <div>
            {selected ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{selected.name}</h3>
                    <a href={`mailto:${selected.email}`} className="text-blue-500 text-sm hover:underline">{selected.email}</a>
                  </div>
                  <button onClick={() => del(selected.id)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                {selected.subject && (
                  <div className="text-sm font-semibold text-slate-700 mb-3 pb-3 border-b border-slate-100">{selected.subject}</div>
                )}
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.message}</div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>{fmtDate(selected.created_at)}</span>
                  <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Vaš upit')}`}
                    className="text-blue-500 hover:underline font-medium">
                    Odgovori →
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                <Mail size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Odaberi poruku za prikaz</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
