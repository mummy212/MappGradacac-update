import { useState, useEffect } from 'react'
import { api } from '../api'
import { Plus, Edit2, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Layout, Image, Type, MapPin, Calendar, Tag, Code } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'

const POSITIONS = [
  { key: 'home_hero', label: '🏠 Hero Sekcija', desc: 'Vrh naslovne stranice (zamjenjuje defaultni hero)' },
  { key: 'home_top', label: '⭐ Ispod Heroa', desc: 'Odmah ispod hero sekcije' },
  { key: 'home_after_categories', label: '📦 Nakon Kategorija', desc: 'Između kategorija i ponuda' },
  { key: 'home_after_offers', label: '🎯 Nakon Ponuda', desc: 'Između ponuda i eventa' },
  { key: 'home_before_footer', label: '📢 Prije Footera', desc: 'Direktno iznad footera' },
  { key: 'locations_top', label: '🗺️ Vrh Stranice Lokacija', desc: 'Na vrhu stranice sa listom lokacija' },
]

const WIDGET_TYPES = [
  { key: 'banner', label: 'Baner', icon: <Image size={15} /> },
  { key: 'text_block', label: 'Tekst Blok', icon: <Type size={15} /> },
  { key: 'featured_locations', label: 'Istaknute Lokacije', icon: <MapPin size={15} /> },
  { key: 'featured_events', label: 'Istaknuti Eventi', icon: <Calendar size={15} /> },
  { key: 'promo_card', label: 'Promo Kartica', icon: <Tag size={15} /> },
  { key: 'html_block', label: 'HTML Blok', icon: <Code size={15} /> },
]

interface Widget {
  id: string
  position: string
  widget_type: string
  title?: string
  subtitle?: string
  content?: string
  image?: string
  button_text?: string
  button_url?: string
  bg_color?: string
  text_color?: string
  location_ids?: string[]
  is_active: boolean
  order: number
}

const EMPTY: Partial<Widget> = {
  position: 'home_top',
  widget_type: 'banner',
  title: '',
  subtitle: '',
  content: '',
  image: '',
  button_text: '',
  button_url: '',
  bg_color: '#7C3AED',
  text_color: '#FFFFFF',
  location_ids: [],
  is_active: true,
  order: 0,
}

export default function Widgets() {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Partial<Widget>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<{id:string,name:string}[]>([])
  const [activePos, setActivePos] = useState('home_top')

  const load = async () => {
    setLoading(true)
    try {
      const [wr, lr] = await Promise.all([
        api.get('/admin/widgets'),
        api.get('/locations'),
      ])
      setWidgets(wr.data)
      setLocations(lr.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = (pos: string) => {
    setForm({ ...EMPTY, position: pos })
    setEditId(null)
    setModal('add')
  }

  const openEdit = (w: Widget) => {
    setForm({ ...w })
    setEditId(w.id)
    setModal('edit')
  }

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'add') {
        await api.post('/admin/widgets', form)
      } else {
        await api.put(`/admin/widgets/${editId}`, form)
      }
      setModal(null)
      await load()
    } finally { setSaving(false) }
  }

  const del = async (id: string) => {
    if (!confirm('Obrisati ovaj widget?')) return
    await api.delete(`/admin/widgets/${id}`)
    await load()
  }

  const toggleActive = async (w: Widget) => {
    await api.put(`/admin/widgets/${w.id}`, { is_active: !w.is_active })
    await load()
  }

  const move = async (w: Widget, dir: 'up' | 'down') => {
    const posWidgets = widgets.filter(x => x.position === w.position).sort((a,b) => a.order - b.order)
    const idx = posWidgets.findIndex(x => x.id === w.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= posWidgets.length) return
    const other = posWidgets[swapIdx]
    await Promise.all([
      api.put(`/admin/widgets/${w.id}`, { order: other.order }),
      api.put(`/admin/widgets/${other.id}`, { order: w.order }),
    ])
    await load()
  }

  const typeLabel = (t: string) => WIDGET_TYPES.find(x => x.key === t)?.label || t
  const posWidgets = (pos: string) => widgets.filter(w => w.position === pos).sort((a,b) => a.order - b.order)

  const f = (k: keyof Widget, v: any) => setForm(prev => ({...prev, [k]: v}))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Layout size={22} /> Moduli / Pozicije</h1>
          <p className="text-slate-500 text-sm mt-0.5">Upravljaj sadržajem na pojedinim pozicijama web stranice</p>
        </div>
      </div>

      {/* Position tabs */}
      <div className="flex gap-1 flex-wrap mb-6">
        {POSITIONS.map(p => (
          <button key={p.key} onClick={() => setActivePos(p.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePos === p.key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {p.label} <span className="ml-1 text-xs opacity-70">({posWidgets(p.key).length})</span>
          </button>
        ))}
      </div>

      {/* Active position */}
      {POSITIONS.filter(p => p.key === activePos).map(pos => (
        <div key={pos.key} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">{pos.label}</h3>
              <p className="text-slate-500 text-sm">{pos.desc}</p>
            </div>
            <button onClick={() => openAdd(pos.key)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700">
              <Plus size={15} /> Dodaj Widget
            </button>
          </div>

          {posWidgets(pos.key).length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400">
              Nema widgeta na ovoj poziciji. Klikni "Dodaj Widget" da počneš.
            </div>
          ) : (
            <div className="space-y-2">
              {posWidgets(pos.key).map((w, idx, arr) => (
                <div key={w.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  w.is_active ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-200 opacity-50'
                }`}>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(w, 'up')} disabled={idx === 0}
                      className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={() => move(w, 'down')} disabled={idx === arr.length - 1}
                      className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronDown size={14} /></button>
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: w.bg_color || '#7C3AED' }}>
                    {w.order + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm truncate">{w.title || '(bez naslova)'}</div>
                    <div className="text-xs text-slate-500">{typeLabel(w.widget_type)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(w)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        w.is_active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'
                      }`} title={w.is_active ? 'Vidljivo' : 'Skriveno'}>
                      {w.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => openEdit(w)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => del(w.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">{modal === 'add' ? 'Novi Widget' : 'Uredi Widget'}</h2>
            </div>
            <div className="p-5 space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Pozicija</label>
                  <select className="input" value={form.position} onChange={e => f('position', e.target.value)}>
                    {POSITIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Tip Widgeta</label>
                  <select className="input" value={form.widget_type} onChange={e => f('widget_type', e.target.value)}>
                    {WIDGET_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Naslov</label>
                <input className="input" value={form.title || ''} onChange={e => f('title', e.target.value)} placeholder="Naslov widgeta" />
              </div>

              {form.widget_type !== 'html_block' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Podnaslov</label>
                  <input className="input" value={form.subtitle || ''} onChange={e => f('subtitle', e.target.value)} placeholder="Kratak opis" />
                </div>
              )}

              {['text_block', 'html_block', 'promo_card'].includes(form.widget_type || '') && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {form.widget_type === 'html_block' ? 'HTML Sadržaj' : 'Tekst Sadržaj'}
                  </label>
                  <textarea className="input font-mono text-xs" rows={5}
                    value={form.content || ''}
                    onChange={e => f('content', e.target.value)}
                    placeholder={form.widget_type === 'html_block' ? '<div>HTML ovdje...</div>' : 'Tekst sadržaja...'}
                  />
                </div>
              )}

              {form.widget_type === 'banner' && (
                <div>
                  <ImageUpload
                    label="Slika Banera"
                    aspectHint="Preporučeno: 1200×400px (panorama format)"
                    value={form.image || ''}
                    onChange={v => f('image', v)}
                  />
                </div>
              )}

              {form.widget_type === 'featured_locations' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Odaberi Lokacije</label>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                    {locations.map(l => (
                      <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                        <input type="checkbox"
                          checked={(form.location_ids || []).includes(l.id)}
                          onChange={e => {
                            const ids = form.location_ids || []
                            f('location_ids', e.target.checked ? [...ids, l.id] : ids.filter(x => x !== l.id))
                          }} />
                        {l.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {['banner', 'text_block', 'promo_card'].includes(form.widget_type || '') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Tekst Dugmeta</label>
                    <input className="input" value={form.button_text || ''} onChange={e => f('button_text', e.target.value)} placeholder="Saznaj više" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">URL Dugmeta</label>
                    <input className="input" value={form.button_url || ''} onChange={e => f('button_url', e.target.value)} placeholder="/lokacije" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Boja Pozadine</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.bg_color || '#7C3AED'} onChange={e => f('bg_color', e.target.value)}
                      className="w-10 h-8 rounded cursor-pointer border border-slate-200" />
                    <input className="input flex-1" value={form.bg_color || '#7C3AED'} onChange={e => f('bg_color', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Boja Teksta</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.text_color || '#FFFFFF'} onChange={e => f('text_color', e.target.value)}
                      className="w-10 h-8 rounded cursor-pointer border border-slate-200" />
                    <input className="input flex-1" value={form.text_color || '#FFFFFF'} onChange={e => f('text_color', e.target.value)} />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true} onChange={e => f('is_active', e.target.checked)}
                  className="w-4 h-4" />
                <span className="text-sm text-slate-700">Widget je aktivan (vidljiv na stranici)</span>
              </label>

            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="btn-outline px-4 py-2">Odustani</button>
              <button onClick={save} disabled={saving} className="btn-primary px-4 py-2">
                {saving ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
