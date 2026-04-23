import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getImgSrc } from '../api'
import { Plus, Trash2, X, Calendar, Edit2, Clock, MapPin, Tag, Users, Globe, Ticket } from 'lucide-react'
import type { Event, Location } from '../types'
import RichTextEditor from '../components/RichTextEditor'
import MultiImageUpload from '../components/MultiImageUpload'

const EMPTY = {
  title: '', description: '', short_description: '', content_html: '',
  location_name: '', date: '', time: '',
  location_id: '', image: '', images: [] as string[],
  ticket_price: '', organizer: '', website: '', ticket_url: '',
}

type EventForm = typeof EMPTY

function EventModal({
  event, locations, onClose, onSuccess,
}: {
  event?: Event | null
  locations: Location[]
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!event
  const ev = event as any
  const [form, setForm] = useState<EventForm>({
    title: ev?.title || '',
    description: ev?.description || '',
    short_description: ev?.short_description || '',
    content_html: ev?.content_html || '',
    location_name: ev?.location_name || '',
    date: ev?.date ? ev.date.slice(0, 10) : '',
    time: ev?.time || '',
    location_id: ev?.location_id || '',
    image: ev?.image || '',
    images: ev?.images || [],
    ticket_price: ev?.ticket_price || '',
    organizer: ev?.organizer || '',
    website: ev?.website || '',
    ticket_url: ev?.ticket_url || '',
  })
  const [tab, setTab] = useState<'osnovno' | 'sadrzaj' | 'detalji'>('osnovno')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof EventForm, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const cls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-xs font-medium text-slate-600 mb-1'

  const handleSave = async () => {
    if (!form.title || !form.date || !form.location_name) {
      setError('Naslov, datum i naziv mjesta su obavezni')
      return
    }
    if (!form.description && !form.content_html) {
      setError('Dodaj barem kratki opis ili sadržaj')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        description: form.description || form.short_description || '',
        time: form.time || undefined,
        location_id: form.location_id || undefined,
      }
      if (isEdit) {
        await api.put(`/admin/events/${ev.id}`, payload)
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

  const tabs = [
    { key: 'osnovno', label: '📋 Osnovno' },
    { key: 'sadrzaj', label: '✏️ Sadržaj' },
    { key: 'detalji', label: '🎫 Detalji' },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-slate-800 text-lg">
            {isEdit ? `Uredi: ${ev.title}` : 'Novi događaj'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {/* === OSNOVNO === */}
          {tab === 'osnovno' && (
            <>
              <div>
                <label className={lbl}>Naslov *</label>
                <input className={cls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Npr. Gradski festival 2026" />
              </div>
              <div>
                <label className={lbl}>Kratki opis (za listu i previu)</label>
                <textarea className={cls} rows={2} value={form.short_description}
                  onChange={e => set('short_description', e.target.value)}
                  placeholder="Jedna rečenica koja opisuje događaj..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Datum *</label>
                  <input type="date" className={cls} value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Vrijeme (početak)</label>
                  <input type="time" className={cls} value={form.time} onChange={e => set('time', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={lbl}>Naziv mjesta / venue *</label>
                <input className={cls} value={form.location_name} onChange={e => set('location_name', e.target.value)} placeholder="Npr. Gradski trg, Dom kulture..." />
              </div>
              <div>
                <label className={lbl}>Poveži s lokacijom (opciono)</label>
                <select className={cls} value={form.location_id} onChange={e => set('location_id', e.target.value)}>
                  <option value="">— Bez veze —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <MultiImageUpload
                label="Slike događaja (prva slika = naslovna)"
                value={form.images}
                onChange={imgs => set('images', imgs)}
                max={6}
              />
            </>
          )}

          {/* === SADRZAJ === */}
          {tab === 'sadrzaj' && (
            <>
              <div>
                <label className={lbl}>Kratki opis (fallback za mobilnu aplikaciju)</label>
                <textarea className={cls} rows={3} value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Opis koji se koristi i u mobilnoj aplikaciji..." />
              </div>
              <div>
                <label className={lbl}>Detaljni sadržaj (Rich Text editor)</label>
                <p className="text-xs text-slate-400 mb-2">Piši više o događaju: program, izvodiči, historijat, očekivanja...</p>
                <RichTextEditor
                  value={form.content_html}
                  onChange={v => set('content_html', v)}
                  placeholder="Upiši detaljan program i opis događaja..."
                  minHeight="280px"
                />
              </div>
            </>
          )}

          {/* === DETALJI === */}
          {tab === 'detalji' && (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-3">
                  <Tag size={16} className="text-slate-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className={lbl}>Cijena ulaznice / ulaz</label>
                    <input className={cls} value={form.ticket_price}
                      onChange={e => set('ticket_price', e.target.value)}
                      placeholder="Npr. 5 KM / Besplatno / Donacija" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users size={16} className="text-slate-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className={lbl}>Organizator</label>
                    <input className={cls} value={form.organizer}
                      onChange={e => set('organizer', e.target.value)}
                      placeholder="Npr. Općina Gradačac, KUD Bosna..." />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe size={16} className="text-slate-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className={lbl}>Web stranica događaja</label>
                    <input className={cls} value={form.website}
                      onChange={e => set('website', e.target.value)}
                      placeholder="https://..." />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Ticket size={16} className="text-slate-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className={lbl}>Link za kupovinu karata (opciono)</label>
                    <input className={cls} value={form.ticket_url}
                      onChange={e => set('ticket_url', e.target.value)}
                      placeholder="https://ulaznice.ba/..." />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">💡 Savjet</p>
                <p className="text-xs text-amber-700">Cijena, organizator i web stranica se prikazuju u info sidebaru na detaljnoj stranici događaja na webu.</p>
              </div>
            </>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">
            {form.images.length} slika • {form.content_html.length > 10 ? '✅ Sadržaj napisan' : '⚠️ Bez sadržaja'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Odustani</button>
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
          <p className="text-slate-500 text-sm mt-1">Predstojeći i aktivni događaji — slike, rich tekst i detalji</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Novi dogaĚj
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && <div className="col-span-3 p-10 text-center text-slate-400">Učitavanje...</div>}
        {!isLoading && (events as any[]).length === 0 && (
          <div className="col-span-3 p-10 text-center">
            <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400">Nema predstojeći događaja</p>
          </div>
        )}
        {(events as any[]).map(ev => {
          const imgs: string[] = ev.images || []
          const img = imgs[0] ? getImgSrc(imgs[0]) : (ev.image ? getImgSrc(ev.image) : '')
          const evDate = new Date(ev.date)
          const month = evDate.toLocaleDateString('bs-BA', { month: 'short' }).toUpperCase()
          const day = evDate.getDate()
          return (
            <div key={ev.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-36 bg-slate-100 relative overflow-hidden">
                {img
                  ? <img src={img} alt={ev.title} className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                      <Calendar size={40} className="text-blue-300" />
                    </div>
                  )
                }
                {/* Date chip */}
                <div className="absolute top-2 left-2 bg-white rounded-xl px-2.5 py-1.5 text-center shadow-sm">
                  <p className="text-[10px] font-bold text-blue-600 leading-none">{month}</p>
                  <p className="text-lg font-black text-slate-800 leading-none">{day}</p>
                </div>
                {imgs.length > 1 && (
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    📷 {imgs.length}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                      {ev.time && <span className="flex items-center gap-1"><Clock size={11} /> {ev.time}</span>}
                      <span className="flex items-center gap-1"><MapPin size={11} /> {ev.location_name}</span>
                    </div>
                    {ev.ticket_price && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <Tag size={10} /> {ev.ticket_price}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditEvent(ev)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Obrisati "${ev.title}"?`)) deleteMutation.mutate(ev.id) }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(showCreate || editEvent) && (
        <EventModal
          event={editEvent}
          locations={locations as Location[]}
          onClose={() => { setShowCreate(false); setEditEvent(null) }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
