import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { Save, Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react'
import type { Location } from '../types'

export default function LocationEdit() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const lid = user?.location_id
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'info' | 'images'>('info')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const { data: location, isLoading } = useQuery<Location>({
    queryKey: ['my-location'],
    queryFn: () => api.get(`/locations/${lid}`).then(r => r.data),
    enabled: !!lid
  })

  const [form, setForm] = useState({
    name: '', phone: '', description: '', working_hours: '',
    service_tags: '', price_level: 0,
    total_spots: '' as number | '',
    is_free_parking: false,
  })

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name || '',
        phone: location.phone || '',
        description: location.description || '',
        working_hours: location.working_hours || '',
        service_tags: location.service_tags?.join(', ') || '',
        price_level: location.price_level || 0,
        total_spots: location.total_spots ?? '',
        is_free_parking: location.is_free_parking ?? false,
      })
    }
  }, [location])

  const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () => api.put('/business/profile', {
      name: form.name || undefined,
      phone: form.phone || undefined,
      description: form.description || undefined,
      working_hours: form.working_hours || undefined,
      service_tags: form.service_tags.split(',').map(t => t.trim()).filter(Boolean),
      price_level: Number(form.price_level),
      total_spots: form.total_spots !== '' ? Number(form.total_spots) : null,
      is_free_parking: form.is_free_parking,
    }),
    onSuccess: () => {
      setSaved(true)
      setError('')
      qc.invalidateQueries({ queryKey: ['my-location'] })
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri čuvanju')
    }
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !lid) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      await api.post(`/admin/locations/${lid}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      qc.invalidateQueries({ queryKey: ['my-location'] })
    } catch { setError('Greška pri uploadu') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleDeleteImage = async (idx: number) => {
    if (!lid || !confirm('Obrisati sliku?')) return
    try {
      await api.delete(`/admin/locations/${lid}/images/${idx}`)
      qc.invalidateQueries({ queryKey: ['my-location'] })
    } catch { setError('Greška pri brisanju') }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'

  if (isLoading) return <div className="text-slate-400">Učitavanje...</div>
  if (!location) return <div className="text-red-500">Lokacija nije pronađena.</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Moja Lokacija</h1>
        <p className="text-slate-500 text-sm mt-1">{location.address}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        {(['info', 'images'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'info' ? 'Informacije' : `Slike (${location.images?.length || 0})`}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className={labelCls}>Naziv lokacije</label>
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+387 35 000 000" />
            </div>
            <div>
              <label className={labelCls}>Radno vrijeme</label>
              <input className={inputCls} value={form.working_hours} onChange={e => set('working_hours', e.target.value)} placeholder="08:00 - 22:00" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Opis</label>
              <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Kratak opis vaše lokacije..." />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Tagovi usluga (odvojeni zarezom)</label>
              <input className={inputCls} value={form.service_tags} onChange={e => set('service_tags', e.target.value)} placeholder="Npr. Ćevapi, Roštilj, WiFi, Dostava" />
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
            <div className="flex items-end">
              <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-sm text-slate-500">
                Kategorija: <span className="font-medium text-slate-700">{location.category}</span>
                <p className="text-xs mt-0.5 text-slate-400">Kategoriju može mijenjati samo admin</p>
              </div>
            </div>

            {/* Parking-specific fields - shown conditionally */}
            {location.category === 'parking' && (
              <div className="col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
                <p className="text-sm font-semibold text-blue-800">🅿️ Postavke parkinga</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Ukupno mjesta</label>
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.total_spots}
                      onChange={e => set('total_spots', e.target.value)}
                      placeholder="Npr. 80"
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-6">
                    <input
                      type="checkbox"
                      id="bizIsFreePark"
                      checked={form.is_free_parking}
                      onChange={e => set('is_free_parking', e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <label htmlFor="bizIsFreePark" className="text-sm text-slate-700 font-medium">
                      Besplatan parking
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          {saved && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle size={16} />Promjene su sačuvane!
            </div>
          )}

          <div className="mt-5">
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Save size={15} />{saveMutation.isPending ? 'Čuvanje...' : 'Sačuvaj promjene'}
            </button>
          </div>
        </div>
      )}

      {tab === 'images' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-slate-600">{location.images?.length || 0} slika</p>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              <Upload size={14} />{uploading ? 'Upload...' : 'Dodaj sliku'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>

          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

          {location.images?.length ? (
            <div className="grid grid-cols-3 gap-3">
              {location.images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => handleDeleteImage(idx)}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <ImageIcon size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nema slika. Dodajte prve slike vaše lokacije.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
