import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Plus, Trash2, X, Star } from 'lucide-react'
import type { Attraction } from '../types'

function AttractionModal({
  attraction,
  onClose,
  onSuccess,
}: {
  attraction?: Attraction
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!attraction
  const [form, setForm] = useState({
    name: attraction?.name || '',
    description: attraction?.description || '',
    latitude: attraction?.latitude || 44.8797,
    longitude: attraction?.longitude || 18.4275,
    category: attraction?.category || 'Historija',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.description) { setError('Naziv i opis su obavezni'); return }
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

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1'
  const categories = ['Historija', 'Priroda', 'Kultura', 'Religija', 'Sport', 'Ostalo']

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Uredi atrakciju' : 'Nova atrakcija'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Naziv *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Npr. Gradačačka tvrđava" />
          </div>
          <div>
            <label className={labelCls}>Opis *</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Opis atrakcije..." />
          </div>
          <div>
            <label className={labelCls}>Kategorija</label>
            <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Latitude (GPS)</label>
              <input type="number" step="0.0001" className={inputCls} value={form.latitude} onChange={e => set('latitude', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Longitude (GPS)</label>
              <input type="number" step="0.0001" className={inputCls} value={form.longitude} onChange={e => set('longitude', e.target.value)} />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Odustani</button>
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

  const categoryColors: Record<string, string> = {
    Historija: '#8B5CF6', Priroda: '#10B981', Kultura: '#3B82F6',
    Religija: '#F59E0B', Sport: '#EF4444', Ostalo: '#6B7280'
  }

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['attractions'] })
    setShowCreate(false)
    setEditAttr(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Atrakcije</h1>
          <p className="text-slate-500 text-sm mt-1">Turistički objekti i mjesta</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nova atrakcija
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Učitavanje...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Naziv</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kategorija</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">GPS</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(attractions as Attraction[]).map(attr => (
                  <tr key={attr.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Star size={13} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm text-slate-800">{attr.name}</p>
                          <p className="text-xs text-slate-400 line-clamp-1">{attr.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: (categoryColors[attr.category] || '#6B7280') + '20', color: categoryColors[attr.category] || '#6B7280' }}
                      >
                        {attr.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {attr.latitude?.toFixed(4)}, {attr.longitude?.toFixed(4)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditAttr(attr)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => { if (confirm(`Obrisati "${attr.name}"?`)) deleteMutation.mutate(attr.id) }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(attractions as Attraction[]).length === 0 && (
              <div className="p-10 text-center text-slate-400">Nema atrakcija</div>
            )}
          </div>
        )}
      </div>

      {(showCreate || editAttr) && (
        <AttractionModal
          attraction={editAttr || undefined}
          onClose={() => { setShowCreate(false); setEditAttr(null) }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
