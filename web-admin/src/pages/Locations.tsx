import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Plus, Edit2, Trash2, Star, Crown, X, Upload, Image as ImageIcon } from 'lucide-react'
import type { Location, Category } from '../types'

interface LocationFormData {
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  phone: string
  description: string
  working_hours: string
  is_premium: boolean
  service_tags: string
  price_level: number
}

function LocationModal({
  location,
  categories,
  onClose,
  onSuccess,
}: {
  location?: Location
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!location
  const [tab, setTab] = useState<'basic' | 'details' | 'images'>('basic')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const [form, setForm] = useState<LocationFormData>({
    name: location?.name || '',
    category: location?.category || (categories[0]?.id || ''),
    address: location?.address || '',
    latitude: location?.latitude || 44.8797,
    longitude: location?.longitude || 18.4275,
    phone: location?.phone || '',
    description: location?.description || '',
    working_hours: location?.working_hours || '',
    is_premium: location?.is_premium || false,
    service_tags: location?.service_tags?.join(', ') || '',
    price_level: location?.price_level || 0,
  })

  const set = (k: keyof LocationFormData, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.category || !form.address) {
      setError('Naziv, kategorija i adresa su obavezni')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        service_tags: form.service_tags.split(',').map(t => t.trim()).filter(Boolean),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        price_level: Number(form.price_level),
      }
      if (isEdit) {
        await api.put(`/admin/locations/${location!.id}`, payload)
      } else {
        await api.post('/admin/locations', payload)
      }
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri čuvanju')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !location) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/admin/locations/${location.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      qc.invalidateQueries({ queryKey: ['locations'] })
      onSuccess()
    } catch {
      setError('Greška pri uploadu slike')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteImage = async (idx: number) => {
    if (!location) return
    if (!confirm('Obrisati sliku?')) return
    try {
      await api.delete(`/admin/locations/${location.id}/images/${idx}`)
      qc.invalidateQueries({ queryKey: ['locations'] })
      onSuccess()
    } catch {
      setError('Greška pri brisanju slike')
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            {isEdit ? `Uredi: ${location!.name}` : 'Nova lokacija'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 pb-0 flex gap-4 border-b border-slate-100">
          {['basic', 'details', ...(isEdit ? ['images'] : [])].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as 'basic' | 'details' | 'images')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'basic' ? 'Osnovno' : t === 'details' ? 'Detalji' : 'Slike'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'basic' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Naziv *</label>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Npr. Restoran Stari Grad" />
              </div>
              <div>
                <label className={labelCls}>Kategorija *</label>
                <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Telefon</label>
                <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+387 35 000 000" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Adresa *</label>
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Ulica i broj" />
              </div>
              <div>
                <label className={labelCls}>Latitude (GPS)</label>
                <input type="number" step="0.0001" className={inputCls} value={form.latitude} onChange={e => set('latitude', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Longitude (GPS)</label>
                <input type="number" step="0.0001" className={inputCls} value={form.longitude} onChange={e => set('longitude', e.target.value)} />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400">💡 GPS koordinate možete pronaći na <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="text-blue-500 underline">Google Maps</a> — desni klik na lokaciju</p>
              </div>
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Radno vrijeme</label>
                <input className={inputCls} value={form.working_hours} onChange={e => set('working_hours', e.target.value)} placeholder="08:00 - 22:00" />
              </div>
              <div>
                <label className={labelCls}>Opis</label>
                <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Kratki opis lokacije..." />
              </div>
              <div>
                <label className={labelCls}>Tagovi usluga (odvojeni zarezom)</label>
                <input className={inputCls} value={form.service_tags} onChange={e => set('service_tags', e.target.value)} placeholder="Npr. Ćevapi, Roštilj, WiFi" />
              </div>
              <div>
                <label className={labelCls}>Nivo cijena</label>
                <select className={inputCls} value={form.price_level} onChange={e => set('price_level', e.target.value)}>
                  <option value={0}>Nije određeno</option>
                  <option value={1}>€ — Jeftino</option>
                  <option value={2}>€€ — Umjereno</option>
                  <option value={3}>€€€ — Skuplje</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={form.is_premium}
                  onChange={e => set('is_premium', e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="isPremium" className="text-sm text-slate-700 flex items-center gap-1.5">
                  <Crown size={14} className="text-yellow-500" />
                  Premium lokacija
                </label>
              </div>
            </div>
          )}

          {tab === 'images' && isEdit && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">{location?.images?.length || 0} slika</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <Upload size={14} />
                  {uploading ? 'Upload...' : 'Dodaj sliku'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </div>

              {location?.images?.length ? (
                <div className="grid grid-cols-3 gap-3">
                  {location.images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square bg-slate-100">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleDeleteImage(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nema slika. Dodajte prvu sliku.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {error && (
          <div className="mx-6 mb-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}
        {tab !== 'images' && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
              Odustani
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
          </div>
        )}
        {tab === 'images' && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
              Zatvori
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Locations() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editLoc, setEditLoc] = useState<Location | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then(r => r.data)
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] })
  })

  const filtered = (locations as Location[]).filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.address.toLowerCase().includes(search.toLowerCase())
  )

  const catMap = Object.fromEntries((categories as Category[]).map(c => [c.id, c]))

  const handleModalSuccess = () => {
    qc.invalidateQueries({ queryKey: ['locations'] })
    setShowCreate(false)
    setEditLoc(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lokacije</h1>
          <p className="text-slate-500 text-sm mt-1">{(locations as Location[]).length} ukupno</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nova lokacija
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <input
            type="text"
            placeholder="Pretraži lokacije..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Učitavanje...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Naziv</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kategorija</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Adresa</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ocjena</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Slike</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((loc: Location) => (
                  <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {loc.is_premium && <Crown size={13} className="text-yellow-500 flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-sm text-slate-800">{loc.name}</p>
                          <p className="text-xs text-slate-400">{loc.working_hours || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {catMap[loc.category] ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: (catMap[loc.category]?.color || '#888') + '20',
                            color: catMap[loc.category]?.color || '#888'
                          }}
                        >
                          {catMap[loc.category].name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{loc.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate">{loc.address}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="font-medium">{loc.avg_rating?.toFixed(1) || '—'}</span>
                        <span className="text-slate-400 text-xs">({loc.review_count || 0})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {loc.images?.length || 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditLoc(loc)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Uredi"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Obrisati "${loc.name}"?`)) deleteMutation.mutate(loc.id)
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Obriši"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                {search ? 'Nema rezultata pretrage' : 'Nema lokacija'}
              </div>
            )}
          </div>
        )}
      </div>

      {(showCreate || editLoc) && (
        <LocationModal
          location={editLoc || undefined}
          categories={categories as Category[]}
          onClose={() => { setShowCreate(false); setEditLoc(null) }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}
