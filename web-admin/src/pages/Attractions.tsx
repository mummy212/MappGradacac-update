import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getImgSrc } from '../api'
import { Plus, Trash2, X, Star, Edit2, Clock, Globe, Phone, Tag, MapPin } from 'lucide-react'
import type { Attraction } from '../types'
import RichTextEditor from '../components/RichTextEditor'
import MultiImageUpload from '../components/MultiImageUpload'

const CATEGORIES = ['Historija', 'Priroda', 'Kultura', 'Religija', 'Sport', 'Gastronomija', 'Ostalo']
const CAT_COLORS: Record<string, string> = {
  Historija: '#8B5CF6', Priroda: '#10B981', Kultura: '#3B82F6',
  Religija: '#F59E0B', Sport: '#EF4444', Gastronomija: '#F97316', Ostalo: '#6B7280'
}

const EMPTY = {
  name: '', description: '', content_html: '', short_description: '',
  latitude: 44.8797, longitude: 18.4275, category: 'Historija',
  images: [] as string[], website: '', working_hours: '', admission_price: '', phone: ''
}

type AttractionForm = typeof EMPTY

function Modal({ attraction, onClose, onSuccess }: {
  attraction?: Attraction
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!attraction
  const [form, setForm] = useState<AttractionForm>({
    name: attraction?.name || '',
    description: attraction?.description || '',
    content_html: (attraction as any)?.content_html || '',
    short_description: (attraction as any)?.short_description || '',
    latitude: attraction?.latitude || 44.8797,
    longitude: attraction?.longitude || 18.4275,
    category: attraction?.category || 'Historija',
    images: attraction?.images || [],
    website: (attraction as any)?.website || '',
    working_hours: (attraction as any)?.working_hours || '',
    admission_price: (attraction as any)?.admission_price || '',
    phone: (attraction as any)?.phone || '',
  })
  const [tab, setTab] = useState<'osnovno' | 'sadrzaj' | 'info'>('osnovno')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof AttractionForm, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const cls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-xs font-medium text-slate-600 mb-1'

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Naziv je obavezan'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }
      if (isEdit) {
        await api.put(`/admin/tourism/attractions/${attraction!.id}`, payload)
      } else {
        await api.post('/admin/tourism/attractions', payload)
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
    { key: 'info', label: '📌 Detalji' },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-slate-800 text-lg">
            {isEdit ? `Uredi: ${attraction!.name}` : 'Nova atrakcija / znamenitost'}
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
                tab === t.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
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
                <label className={lbl}>Naziv *</label>
                <input className={cls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Npr. Gradačačka tvrđava" />
              </div>
              <div>
                <label className={lbl}>Kratki opis (za listu kartica)</label>
                <textarea className={cls} rows={2} value={form.short_description}
                  onChange={e => set('short_description', e.target.value)}
                  placeholder="Jedna-dvije rečenice za prikaz u listi..." />
              </div>
              <div>
                <label className={lbl}>Kategorija</label>
                <select className={cls} value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Latitude (GPS)</label>
                  <input type="number" step="0.0001" className={cls}
                    value={form.latitude} onChange={e => set('latitude', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Longitude (GPS)</label>
                  <input type="number" step="0.0001" className={cls}
                    value={form.longitude} onChange={e => set('longitude', e.target.value)} />
                </div>
              </div>
              <MultiImageUpload
                label="Slike (prva slika = naslovna)"
                value={form.images}
                onChange={imgs => set('images', imgs)}
                max={8}
              />
            </>
          )}

          {/* === SADRZAJ === */}
          {tab === 'sadrzaj' && (
            <>
              <div>
                <label className={lbl}>Kratki opis (fallback tekst)</label>
                <textarea className={cls} rows={3} value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Kratak opis koji se prikazuje i u mobilnoj aplikaciji..." />
              </div>
              <div>
                <label className={lbl}>Detaljni sadržaj (Rich Text editor)</label>
                <p className="text-xs text-slate-400 mb-2">Ovde možeš pisati više, formatirati tekst, dodavati naslove i liste</p>
                <RichTextEditor
                  value={form.content_html}
                  onChange={v => set('content_html', v)}
                  placeholder="Upiši detaljan opis atrakcije, historijat, zanimljivosti..."
                  minHeight="280px"
                />
              </div>
            </>
          )}

          {/* === DETALJI === */}
          {tab === 'info' && (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-slate-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className={lbl}>Radno Vrijeme</label>
                    <input className={cls} value={form.working_hours}
                      onChange={e => set('working_hours', e.target.value)}
                      placeholder="Npr. Pon–Pet: 09:00–17:00, Sub: 10:00–14:00" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Tag size={16} className="text-slate-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className={lbl}>Cijena ulaznice</label>
                    <input className={cls} value={form.admission_price}
                      onChange={e => set('admission_price', e.target.value)}
                      placeholder="Npr. 3 KM odrasli / 1 KM djeca  ili  Besplatno" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-slate-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className={lbl}>Telefon</label>
                    <input className={cls} value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="+387 35 ..." />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe size={16} className="text-slate-400 mt-2.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className={lbl}>Web stranica</label>
                    <input className={cls} value={form.website}
                      onChange={e => set('website', e.target.value)}
                      placeholder="https://www.primjer.ba" />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">💡 Savjet</p>
                <p className="text-xs text-amber-700">Ove informacije se prikazuju u info sidebaru na detaljnoj stranici atrakcije na web-u.</p>
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
              {saving ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Attractions() {
  const qc = useQueryClient()
  const [editAttr, setEditAttr] = useState<Attraction | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: attractions = [], isLoading } = useQuery({
    queryKey: ['attractions'],
    queryFn: () => api.get('/tourism/attractions').then(r => r.data)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/tourism/attractions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attractions'] })
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['attractions'] })
    setShowCreate(false)
    setEditAttr(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Atrakcije i Znamenitosti</h1>
          <p className="text-slate-500 text-sm mt-1">Turistički objekti — slike, rich tekst i detalji</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nova atrakcija
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && (
          <div className="col-span-3 p-10 text-center text-slate-400">Učitavanje...</div>
        )}
        {!isLoading && (attractions as any[]).length === 0 && (
          <div className="col-span-3 p-10 text-center text-slate-400">Nema atrakcija</div>
        )}
        {(attractions as any[]).map(attr => {
          const img = attr.images?.[0] ? getImgSrc(attr.images[0]) : ''
          const col = CAT_COLORS[attr.category] || '#6B7280'
          return (
            <div key={attr.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                {img
                  ? <img src={img} alt={attr.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><span className="text-5xl">🏛️</span></div>
                }
                <span
                  className="absolute top-2 right-2 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: col + '22', color: col, backdropFilter: 'blur(4px)' }}
                >
                  {attr.category}
                </span>
                {attr.images?.length > 1 && (
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    📷 {attr.images.length}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 leading-tight">{attr.name}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {attr.short_description || attr.description || 'Bez opisa'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {attr.working_hours && <span className="flex items-center gap-1"><Clock size={11}/>{attr.working_hours.split(',')[0]}</span>}
                      {attr.phone && <span className="flex items-center gap-1"><Phone size={11}/>{attr.phone}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditAttr(attr)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Obrisati "${attr.name}"?`)) deleteMutation.mutate(attr.id) }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(showCreate || editAttr) && (
        <Modal
          attraction={editAttr || undefined}
          onClose={() => { setShowCreate(false); setEditAttr(null) }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
