import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, X, Tag, UtensilsCrossed, ShoppingCart, Wrench } from 'lucide-react'
import type { Offer, MenuItem, Location } from '../types'

// ─── Category config per business type ───────────────────────────────────────
type Mode = 'menu' | 'market' | 'pharmacy' | 'service'

interface ModeConfig {
  label: string
  subtitle: string
  mode: Mode
  icon: React.ReactNode
  emptyText: string
  addBtnLabel: string
  modalTitle: string
  categories?: string[]
}

function getConfig(category: string): ModeConfig {
  switch (category) {
    case 'restaurant':
    case 'cafe':
      return {
        label: 'Meni', subtitle: 'Stavke menija vaše lokacije', mode: 'menu',
        icon: <UtensilsCrossed size={18} className="text-emerald-600" />,
        emptyText: 'Meni je prazan. Dodajte prve stavke.',
        addBtnLabel: 'Nova stavka', modalTitle: 'Nova stavka menija',
        categories: ['Predjela', 'Čorbe', 'Glavna jela', 'Roštilje', 'Ribe', 'Salate', 'Deserti', 'Pića', 'Ostalo'],
      }
    case 'market':
      return {
        label: 'Cjenovnik', subtitle: 'Cjenik proizvoda vašeg marketa', mode: 'market',
        icon: <ShoppingCart size={18} className="text-emerald-600" />,
        emptyText: 'Cjenovnik je prazan. Dodajte prve proizvode.',
        addBtnLabel: 'Novi proizvod', modalTitle: 'Novi proizvod',
        categories: ['Voće i povrće', 'Mliječni proizvodi', 'Mesni proizvodi', 'Pekarski', 'Konzerve i suho', 'Bezalkoholna pića', 'Alkohol', 'Higijena', 'Ostalo'],
      }
    case 'pharmacy':
      return {
        label: 'Ponuda', subtitle: 'Akcijske ponude i popusti', mode: 'pharmacy',
        icon: <Tag size={18} className="text-emerald-600" />,
        emptyText: 'Nema aktivnih ponuda. Dodajte prvu.',
        addBtnLabel: 'Nova ponuda', modalTitle: 'Nova ponuda / akcija',
      }
    case 'auto_service':
    case 'gas_station':
      return {
        label: 'Cjenovnik usluga', subtitle: 'Lista usluga i cijena', mode: 'service',
        icon: <Wrench size={18} className="text-emerald-600" />,
        emptyText: 'Lista usluga je prazna. Dodajte prve usluge.',
        addBtnLabel: 'Nova usluga', modalTitle: 'Nova usluga',
        categories: ['Dijagnostika', 'Mehanika', 'Elektrika', 'Gume i kotači', 'Karoserija', 'Pranje vozila', 'Gorivo i maziva', 'Ostalo'],
      }
    default:
      return {
        label: 'Ponuda', subtitle: 'Aktivne ponude', mode: 'pharmacy',
        icon: <Tag size={18} className="text-emerald-600" />,
        emptyText: 'Nema aktivnih ponuda.',
        addBtnLabel: 'Nova ponuda', modalTitle: 'Nova ponuda',
      }
  }
}

// ─── Shared Item Modal (Menu / Market / Service) ──────────────────────────────
function ItemModal({ lid, config, onClose, onSuccess }: {
  lid: string; config: ModeConfig; onClose: () => void; onSuccess: () => void
}) {
  const defaultCat = config.categories?.[0] || 'Ostalo'
  const [form, setForm] = useState({ name: '', price: '', description: '', category: defaultCat })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const namePlaceholder = config.mode === 'menu' ? 'Npr. Miješani roštilj' : config.mode === 'market' ? 'Npr. Mlijeko 1L' : 'Npr. Zamjena ulja'
  const descPlaceholder = config.mode === 'menu' ? 'Sastojci, alergeni...' : config.mode === 'market' ? 'Brend, opis...' : 'Opis usluge...'

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
          <h2 className="font-semibold text-slate-800">{config.modalTitle}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Naziv *</label>
            <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={namePlaceholder} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cijena (KM) *</label>
              <input type="number" min="0" step="0.5" className={inp} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="12.50" />
            </div>
            {config.categories && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kategorija</label>
                <select className={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {config.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Opis (opciono)</label>
            <textarea className={inp} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={descPlaceholder} />
          </div>
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

// ─── Pharmacy Offer Modal ──────────────────────────────────────────────────────
function PharmacyOfferModal({ lid, onClose, onSuccess }: { lid: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', discount_percent: '', expires_at: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Naslov *</label>
            <input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Npr. 20% popust na vitamne" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Opis *</label>
            <textarea className={inp} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalji ponude, uslovi..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Popust (%)</label>
              <input type="number" min="0" max="100" className={inp} value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} placeholder="20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Važi do</label>
              <input type="date" className={inp} value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
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

// ─── Grouped price list (menu / market / service) ─────────────────────────────
function PriceList({ items, config, onDelete }: {
  items: MenuItem[]; config: ModeConfig; onDelete: (id: string) => void
}) {
  const grouped = items.reduce((acc: Record<string, MenuItem[]>, item) => {
    const key = item.category || 'Ostalo'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
        <div className="flex justify-center mb-2 opacity-30">{config.icon}</div>
        <p className="text-slate-400 text-sm">{config.emptyText}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            {config.icon}
            <h3 className="font-semibold text-sm text-slate-700">{cat}</h3>
            <span className="ml-auto text-xs text-slate-400">{catItems.length} stavki</span>
          </div>
          <div className="divide-y divide-slate-50">
            {catItems.map(item => (
              <div key={item.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800">{item.name}</p>
                  {item.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>}
                </div>
                <span className="text-sm font-bold text-emerald-600 flex-shrink-0">{item.price.toFixed(2)} KM</span>
                <button onClick={() => { if (confirm(`Obrisati "${item.name}"?`)) onDelete(item.id) }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
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
  const config = location ? getConfig(location.category) : getConfig('')
  const isOfferMode = config.mode === 'pharmacy'

  const { data: offers = [] } = useQuery({
    queryKey: ['my-offers'],
    queryFn: () => api.get(`/locations/${lid}/offers`).then(r => r.data),
    enabled: !!lid && isOfferMode
  })

  const { data: menuItems = [] } = useQuery({
    queryKey: ['my-menu'],
    queryFn: () => api.get(`/locations/${lid}/menu`).then(r => r.data),
    enabled: !!lid && !isOfferMode
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
    qc.invalidateQueries({ queryKey: isOfferMode ? ['my-offers'] : ['my-menu'] })
    setShowModal(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{config.label}</h1>
          <p className="text-slate-500 text-sm mt-1">{config.subtitle}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} />{config.addBtnLabel}
        </button>
      </div>

      {/* Price list mode (menu / market / service) */}
      {!isOfferMode && (
        <PriceList items={menuItems as MenuItem[]} config={config} onDelete={id => deleteMenu.mutate(id)} />
      )}

      {/* Pharmacy offer mode */}
      {isOfferMode && (
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
              <p className="text-slate-400 text-sm">{config.emptyText}</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showModal && lid && (
        isOfferMode
          ? <PharmacyOfferModal lid={lid} onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
          : <ItemModal lid={lid} config={config} onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}
    </div>
  )
}
