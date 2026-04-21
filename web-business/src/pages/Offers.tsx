import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, X, Tag, UtensilsCrossed } from 'lucide-react'
import type { Offer, MenuItem, Location } from '../types'

// Category-based label
function getLabel(category: string) {
  if (['restaurant', 'cafe'].includes(category)) return { label: 'Meni', type: 'menu' as const }
  if (['auto_service', 'gas_station'].includes(category)) return { label: 'Usluge', type: 'offer' as const }
  return { label: 'Ponuda', type: 'offer' as const }
}

// ─── Offer Modal ──────────────────────────────────────────────────────────────
function OfferModal({ lid, onClose, onSuccess }: { lid: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', discount_percent: '', expires_at: '' })
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.title || !form.description) { setError('Naslov i opis su obavezni'); return }
    setSaving(true); setError('')
    try {
      await api.post('/business/offers', {
        location_id: lid, title: form.title, description: form.description,
        discount_percent: form.discount_percent ? parseInt(form.discount_percent) : undefined,
        expires_at: form.expires_at || undefined
      })
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška')
    } finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Nova ponuda / akcija</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Naslov *</label>
            <input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Npr. 20% popust na ćevape" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Opis *</label>
            <textarea className={inp} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalji ponude..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Popust (%)</label>
              <input type="number" min="0" max="100" className={inp} value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} placeholder="20" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Važi do</label>
              <input type="date" className={inp} value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} /></div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Odustani</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Čuvanje...' : 'Sačuvaj'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Menu Modal ───────────────────────────────────────────────────────────────
function MenuModal({ lid, onClose, onSuccess }: { lid: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', price: '', description: '', category: 'Ostalo' })
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const menuCats = ['Predjela', 'Glavna jela', 'Roštilje', 'Ribe', 'Salate', 'Deserti', 'Pića', 'Ostalo']

  const handleSave = async () => {
    if (!form.name || !form.price) { setError('Naziv i cijena su obavezni'); return }
    setSaving(true); setError('')
    try {
      await api.post(`/business/menu?lid=${lid}`, {
        name: form.name, price: parseFloat(form.price),
        description: form.description || undefined, category: form.category
      })
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška')
    } finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Nova stavka menija</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Naziv *</label>
            <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Npr. Miješani roštilj" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Cijena (KM) *</label>
              <input type="number" min="0" step="0.5" className={inp} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="12.50" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Kategorija</label>
              <select className={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {menuCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Opis (opciono)</label>
            <textarea className={inp} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Sastojci, alergeni..." /></div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Odustani</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Čuvanje...' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Offers() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: location } = useQuery<Location>({
    queryKey: ['my-location'],
    queryFn: () => api.get(`/locations/${user?.location_id}`).then(r => r.data),
    enabled: !!user?.location_id
  })

  const lid = user?.location_id || ''
  const { label, type } = location ? getLabel(location.category) : { label: 'Ponuda', type: 'offer' as const }

  const { data: offers = [] } = useQuery({
    queryKey: ['my-offers'],
    queryFn: () => api.get(`/locations/${lid}/offers`).then(r => r.data),
    enabled: !!lid && type === 'offer'
  })

  const { data: menuItems = [] } = useQuery({
    queryKey: ['my-menu'],
    queryFn: () => api.get(`/locations/${lid}/menu`).then(r => r.data),
    enabled: !!lid && type === 'menu'
  })

  const deleteOffer = useMutation({
    mutationFn: (id: string) => api.delete(`/business/offers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-offers'] })
  })

  const deleteMenu = useMutation({
    mutationFn: (id: string) => api.delete(`/business/menu/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-menu'] })
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: type === 'menu' ? ['my-menu'] : ['my-offers'] })
    setShowModal(false)
  }

  // Group menu by category
  const menuByCategory = (menuItems as MenuItem[]).reduce((acc: Record<string, MenuItem[]>, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{label}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {type === 'menu' ? 'Stavke menija vaše lokacije' : 'Aktivne ponude i popusti'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} />
          {type === 'menu' ? 'Nova stavka' : 'Nova ponuda'}
        </button>
      </div>

      {/* MENU mode */}
      {type === 'menu' && (
        <div>
          {Object.keys(menuByCategory).length > 0 ? (
            Object.entries(menuByCategory).map(([cat, items]) => (
              <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-100 mb-4">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <UtensilsCrossed size={15} className="text-emerald-600" />
                  <h3 className="font-semibold text-sm text-slate-700">{cat}</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {items.map(item => (
                    <div key={item.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800">{item.name}</p>
                        {item.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>}
                      </div>
                      <span className="text-sm font-bold text-emerald-600 flex-shrink-0">{item.price.toFixed(2)} KM</span>
                      <button onClick={() => { if (confirm(`Obrisati "${item.name}"?`)) deleteMenu.mutate(item.id) }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
              <UtensilsCrossed size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400">Meni je prazan. Dodajte prve stavke.</p>
            </div>
          )}
        </div>
      )}

      {/* OFFERS mode */}
      {type === 'offer' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          {(offers as Offer[]).length > 0 ? (
            <div className="divide-y divide-slate-50">
              {(offers as Offer[]).map(offer => (
                <div key={offer.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Tag size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-800">{offer.title}</p>
                      {offer.discount_percent && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                          -{offer.discount_percent}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{offer.description}</p>
                    {offer.expires_at && <p className="text-xs text-slate-400 mt-0.5">Važi do: {new Date(offer.expires_at).toLocaleDateString('bs-BA')}</p>}
                  </div>
                  <button onClick={() => { if (confirm(`Obrisati "${offer.title}"?`)) deleteOffer.mutate(offer.id) }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Tag size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400">Nema aktivnih ponuda. Dodajte prvu.</p>
            </div>
          )}
        </div>
      )}

      {showModal && lid && (
        type === 'menu'
          ? <MenuModal lid={lid} onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
          : <OfferModal lid={lid} onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}
    </div>
  )
}
