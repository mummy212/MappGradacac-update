import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Plus, Trash2, X, Calendar, Edit2 } from 'lucide-react'
import type { Event, Location } from '../types'
import ImageUpload from '../components/ImageUpload'

function EventModal({
  event, locations, onClose, onSuccess,
}: {
  event?: Event | null
  locations: Location[]
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!event
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location_name: event?.location_name || '',
    date: event?.date ? event.date.slice(0, 10) : '',
    time: event?.time || '',
    location_id: event?.location_id || '',
    image: event?.image || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title || !form.description || !form.location_name || !form.date) {
      setError('Naslov, opis, lokacija i datum su obavezni')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        time: form.time || undefined,
        location_id: form.location_id || undefined,
      }
      if (isEdit) {
        await api.put(`/admin/events/${event!.id}`, payload)
      } else {
        await api.post('/admin/events', payload)
      }
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri čuvanju')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-slate-800">{isEdit ? `Uredi: ${event!.title}` : 'Novi događaj'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className={labelCls}>Naslov *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Npr. Gradski festival" />
          </div>
          <div>
            <label className={labelCls}>Opis *</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Opis događaja..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Datum *</label>
              <input type="date" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Vrijeme</label>
              <input type="time" className={inputCls} value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Naziv mjesta *</label>
            <input className={inputCls} value={form.location_name} onChange={e => set('location_name', e.target.value)} placeholder="Npr. Gradski trg" />
          </div>
          <div>
            <label className={labelCls}>Poveži s lokacijom (opciono)</label>
            <select className={inputCls} value={form.location_id} onChange={e => set('location_id', e.target.value)}>
              <option value="">— Bez veze —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <ImageUpload
              label="Slika Događaja (opciono)"
              aspectHint="Preporučeno: 1200×630px"
              value={form.image}
              onChange={v => set('image', v)}
            />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Odustani</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Čuvanje...' : isEdit ? 'Sačuvaj izmjene' : 'Sačuvaj'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Events() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then(r => r.data)
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then(r => r.data)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] })
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['events'] })
    setShowCreate(false)
    setEditEvent(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Događaji</h1>
          <p className="text-slate-500 text-sm mt-1">Predstojeći događaji</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novi događaj
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Učitavanje...</div>
        ) : (
          <div>
            {(events as Event[]).length > 0 ? (
              <div className="divide-y divide-slate-50">
                {(events as Event[]).map(ev => (
                  <div key={ev.id} className="px-5 py-4 flex items-start gap-4">
                    {/* Thumbnail */}
                    {ev.image ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={ev.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar size={18} className="text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800">{ev.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ev.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-blue-600 font-medium">
                          {new Date(ev.date).toLocaleDateString('bs-BA')} {ev.time && `• ${ev.time}`}
                        </span>
                        <span className="text-xs text-slate-400">📍 {ev.location_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditEvent(ev)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Uredi"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Obrisati "${ev.title}"?`)) deleteMutation.mutate(ev.id) }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Obriši"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400">Nema predstojeći događaja</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <EventModal
          locations={locations as Location[]}
          onClose={() => setShowCreate(false)}
          onSuccess={handleSuccess}
        />
      )}
      {editEvent && (
        <EventModal
          event={editEvent}
          locations={locations as Location[]}
          onClose={() => setEditEvent(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
