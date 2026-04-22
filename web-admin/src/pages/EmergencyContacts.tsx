import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Plus, Trash2, X, Phone } from 'lucide-react'

interface EmergencyContact {
  id: string
  section: string
  section_emoji: string
  name: string
  number: string
  icon: string
  color: string
  bg: string
  note?: string
  order: number
}

const SECTIONS = ['Hitni Servisi', 'Zdravstvo – Gradačac', 'Gradska uprava', 'Ostale Usluge']
const ICONS = ['call', 'alert-circle', 'shield-checkmark', 'flame', 'medkit', 'medical', 'flask', 'moon', 'business', 'construct', 'water', 'car', 'flash', 'car-sport']
const SECTION_EMOJIS: Record<string, string> = {
  'Hitni Servisi': '🚨', 'Zdravstvo – Gradačac': '🏥',
  'Gradska uprava': '🏛️', 'Ostale Usluge': '📞',
}

function ContactModal({ contact, onClose, onSuccess }: {
  contact?: EmergencyContact; onClose: () => void; onSuccess: () => void
}) {
  const isEdit = !!contact
  const [form, setForm] = useState({
    section: contact?.section || 'Hitni Servisi',
    section_emoji: contact?.section_emoji || '🚨',
    name: contact?.name || '',
    number: contact?.number || '',
    icon: contact?.icon || 'call',
    color: contact?.color || '#3B82F6',
    bg: contact?.bg || '#EFF6FF',
    note: contact?.note || '',
    order: contact?.order ?? 0,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.number || !form.section) { setError('Naziv, broj i sekcija su obavezni'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, note: form.note || undefined, order: Number(form.order) }
      if (isEdit) await api.put(`/admin/emergency-contacts/${contact!.id}`, payload)
      else await api.post('/admin/emergency-contacts', payload)
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri čuvanju')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Uredi kontakt' : 'Novi kontakt'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sekcija *</label>
              <select className={inputCls} value={form.section} onChange={e => {
                set('section', e.target.value)
                set('section_emoji', SECTION_EMOJIS[e.target.value] || '📞')
              }}>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Red (order)</label>
              <input type="number" className={inputCls} value={form.order} onChange={e => set('order', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Naziv *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Npr. Dom zdravlja Gradačac" />
          </div>
          <div>
            <label className={labelCls}>Broj telefona *</label>
            <input className={inputCls} value={form.number} onChange={e => set('number', e.target.value)} placeholder="Npr. 035 367 000" />
          </div>
          <div>
            <label className={labelCls}>Napomena</label>
            <input className={inputCls} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Npr. Radi 0-24h" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Ikona</label>
              <select className={inputCls} value={form.icon} onChange={e => set('icon', e.target.value)}>
                {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Boja ikone</label>
              <input type="color" className="w-full h-9 border border-slate-200 rounded-lg cursor-pointer" value={form.color === '#fff' ? '#ffffff' : form.color} onChange={e => set('color', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Pozadina</label>
              <input type="color" className="w-full h-9 border border-slate-200 rounded-lg cursor-pointer" value={form.bg} onChange={e => set('bg', e.target.value)} />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Odustani</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving ? 'Čuvanje...' : 'Sačuvaj'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmergencyContacts() {
  const qc = useQueryClient()
  const [editContact, setEditContact] = useState<EmergencyContact | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['emergency-contacts'],
    queryFn: () => api.get('/emergency-contacts').then(r => r.data as EmergencyContact[])
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/emergency-contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergency-contacts'] })
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['emergency-contacts'] })
    setShowCreate(false); setEditContact(null)
  }

  const grouped = contacts.reduce((acc, c) => {
    if (!acc[c.section]) acc[c.section] = []
    acc[c.section].push(c)
    return acc
  }, {} as Record<string, EmergencyContact[]>)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hitni Brojevi</h1>
          <p className="text-slate-500 text-sm mt-1">Upravljanje hitnim kontaktima u aplikaciji</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Novi kontakt
        </button>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-slate-400">Učitavanje...</div>
      ) : (
        Object.entries(grouped).map(([section, sContacts]) => (
          <div key={section} className="mb-6">
            <h2 className="text-base font-semibold text-slate-700 mb-2 px-1">{section}</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Naziv</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Broj</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Napomena</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Red</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sContacts.sort((a, b) => a.order - b.order).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.bg }}>
                            <Phone size={14} style={{ color: c.color === '#fff' ? '#EF4444' : c.color }} />
                          </div>
                          <span className="font-medium text-sm text-slate-800">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-slate-800">{c.number}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{c.note || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{c.order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditContact(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                          <button onClick={() => { if (confirm(`Obrisati "${c.name}"?`)) deleteMutation.mutate(c.id) }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {contacts.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl p-10 text-center text-slate-400 border border-slate-100">Nema hitnih kontakata</div>
      )}

      {(showCreate || editContact) && (
        <ContactModal contact={editContact || undefined} onClose={() => { setShowCreate(false); setEditContact(null) }} onSuccess={handleSuccess} />
      )}
    </div>
  )
}
