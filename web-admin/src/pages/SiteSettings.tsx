import { useState, useEffect } from 'react'
import { api } from '../api'
import { Save, Globe, Palette, FileText, Share2, ChevronRight } from 'lucide-react'

const TABS = [
  { key: 'design', label: 'Dizajn', icon: Palette },
  { key: 'content', label: 'Sadržaj', icon: FileText },
  { key: 'seo', label: 'SEO', icon: Globe },
  { key: 'social', label: 'Društvene Mreže', icon: Share2 },
]

const SECTIONS = [
  { key: 'show_offers_section', label: '⚡ Aktivne Ponude i Popusti' },
  { key: 'show_events_section', label: '📅 Nadolazeći Događaji' },
  { key: 'show_news_section', label: '📰 Gradske Vijesti' },
  { key: 'show_attractions_section', label: '🏛️ Znamenitosti' },
]

export default function SiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('design')

  useEffect(() => {
    api.get('/admin/site-settings')
      .then(r => setSettings(r.data))
      .finally(() => setLoading(false))
  }, [])

  const s = (key: string) => settings[key] || ''
  const set = (key: string, val: string) => setSettings(prev => ({ ...prev, [key]: val }))
  const toggle = (key: string) => set(key, settings[key] === 'true' ? 'false' : 'true')

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/admin/site-settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 text-slate-400">Učitavanje...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Podešavanja Stranice</h1>
          <p className="text-slate-500 text-sm mt-0.5">Dizajn, tekst, SEO i društvene mreže</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Save size={16} />
          {saved ? '✓ Sačuvano!' : saving ? 'Čuvanje...' : 'Sačuvaj Promjene'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <Icon size={16} />
                {label}
                {activeTab === key && <ChevronRight size={14} className="ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 space-y-5">

          {/* DESIGN TAB */}
          {activeTab === 'design' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Boje Teme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">Primarna Boja</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={s('primary_color') || '#7C3AED'}
                        onChange={e => set('primary_color', e.target.value)}
                        className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200" />
                      <div>
                        <input className="input text-sm" value={s('primary_color')} onChange={e => set('primary_color', e.target.value)} />
                        <p className="text-xs text-slate-400 mt-1">Navigacija, dugmad, linkovi</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">Akcent Boja</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={s('accent_color') || '#F59E0B'}
                        onChange={e => set('accent_color', e.target.value)}
                        className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200" />
                      <div>
                        <input className="input text-sm" value={s('accent_color')} onChange={e => set('accent_color', e.target.value)} />
                        <p className="text-xs text-slate-400 mt-1">Istaknuti elementi, dugmad</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-2">Pregled boja:</p>
                  <div className="flex gap-2">
                    <div className="h-8 w-24 rounded-lg" style={{ backgroundColor: s('primary_color') || '#7C3AED' }} />
                    <div className="h-8 w-24 rounded-lg" style={{ backgroundColor: s('accent_color') || '#F59E0B' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Sekcije na Naslovnoj Stranici</h3>
                <p className="text-slate-500 text-sm mb-4">Uključi ili isključi sekcije koje se prikazuju posjetiteljima.</p>
                <div className="space-y-3">
                  {SECTIONS.map(sec => (
                    <label key={sec.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100">
                      <span className="text-sm font-medium text-slate-700">{sec.label}</span>
                      <div className={`relative w-11 h-6 rounded-full transition-colors ${
                        settings[sec.key] !== 'false' ? 'bg-blue-600' : 'bg-slate-300'
                      }`} onClick={() => toggle(sec.key)}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          settings[sec.key] !== 'false' ? 'translate-x-5' : ''
                        }`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Raspored Kartica</h3>
                <p className="text-slate-500 text-sm mb-3">Broj lokacija po redu na desktop prikazu.</p>
                <div className="flex gap-3">
                  {['2', '3', '4'].map(n => (
                    <button key={n} onClick={() => set('cards_per_row', n)}
                      className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
                        s('cards_per_row') === n ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      {n} po redu
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CONTENT TAB */}
          {activeTab === 'content' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Hero Sekcija</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Naslov (velika slova su automatska)</label>
                    <input className="input" value={s('hero_title')} onChange={e => set('hero_title', e.target.value)} placeholder="Otkrij Gradačac" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Podnaslov</label>
                    <textarea className="input" rows={3} value={s('hero_subtitle')} onChange={e => set('hero_subtitle', e.target.value)}
                      placeholder="Restorani, eventi, znamenitosti..." />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Naziv Stranice</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Naziv Sajta</label>
                    <input className="input" value={s('site_title')} onChange={e => set('site_title', e.target.value)} placeholder="Gradačac Mapa" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Podnaslov</label>
                    <input className="input" value={s('site_subtitle')} onChange={e => set('site_subtitle', e.target.value)} placeholder="Digitalni vodič kroz grad" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Footer Informacije</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Tekst u footeru</label>
                    <textarea className="input" rows={2} value={s('footer_text')} onChange={e => set('footer_text', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Kontakt telefon (footer)</label>
                      <input className="input" value={s('footer_phone')} onChange={e => set('footer_phone', e.target.value)} placeholder="112" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Kontakt email (footer)</label>
                      <input className="input" value={s('footer_email')} onChange={e => set('footer_email', e.target.value)} placeholder="info@gradacac-mapa.ba" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SEO TAB */}
          {activeTab === 'seo' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">SEO Podešavanja</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Meta Naslov (title tag)</label>
                  <input className="input" value={s('meta_title')} onChange={e => set('meta_title', e.target.value)}
                    placeholder="Gradačac Mapa - Digitalni Vodič" />
                  <p className="text-xs text-slate-400 mt-1">{s('meta_title').length}/60 znakova (preporučeno do 60)</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Meta Opis (description)</label>
                  <textarea className="input" rows={3} value={s('meta_description')} onChange={e => set('meta_description', e.target.value)}
                    placeholder="Pronađite restorane, markete..." />
                  <p className="text-xs text-slate-400 mt-1">{s('meta_description').length}/160 znakova (preporučeno do 160)</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">OG Slika (za Facebook/WhatsApp dijeljenje)</label>
                  <input className="input" value={s('og_image')} onChange={e => set('og_image', e.target.value)}
                    placeholder="https://... URL slike (1200x630px)" />
                  {s('og_image') && (
                    <img src={s('og_image')} alt="OG preview" className="mt-2 h-24 rounded-lg object-cover" onError={e => (e.currentTarget.style.display='none')} />
                  )}
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">📊 Pregled u Google pretrazi:</p>
                  <div className="text-blue-600 text-base font-medium">{s('meta_title') || 'Gradačac Mapa - Digitalni Vodič'}</div>
                  <div className="text-green-700 text-xs">gradacac-mapa.ba/</div>
                  <div className="text-slate-600 text-sm mt-0.5 line-clamp-2">{s('meta_description') || 'Pronađite restorane, markete, servise...'}</div>
                </div>
              </div>
            </div>
          )}

          {/* SOCIAL TAB */}
          {activeTab === 'social' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Linkovi Društvenih Mreža</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Facebook URL</label>
                  <input className="input" value={s('facebook_url')} onChange={e => set('facebook_url', e.target.value)}
                    placeholder="https://facebook.com/gradacacmapa" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Instagram URL</label>
                  <input className="input" value={s('instagram_url')} onChange={e => set('instagram_url', e.target.value)}
                    placeholder="https://instagram.com/gradacacmapa" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">YouTube URL (opcionalno)</label>
                  <input className="input" value={s('youtube_url')} onChange={e => set('youtube_url', e.target.value)}
                    placeholder="https://youtube.com/@gradacacmapa" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">TikTok URL (opcionalno)</label>
                  <input className="input" value={s('tiktok_url')} onChange={e => set('tiktok_url', e.target.value)}
                    placeholder="https://tiktok.com/@gradacacmapa" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
