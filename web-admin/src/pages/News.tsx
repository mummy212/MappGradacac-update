import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getImgSrc } from '../api'
import { Plus, Trash2, X, Globe, EyeOff, Edit2, Newspaper } from 'lucide-react'
import RichTextEditor from '../components/RichTextEditor'
import MultiImageUpload from '../components/MultiImageUpload'

interface NewsArticle {
  id: string
  title: string
  content: string
  short_description?: string
  author?: string
  category: string
  image?: string
  images?: string[]
  is_published: boolean
  created_at: string
}

const CATEGORIES = ['Vijesti', 'Obavještenje', 'Kultura', 'Sport', 'Turizam', 'Ostalo']

const CAT_COLORS: Record<string, string> = {
  Vijesti: '#3B82F6', Obavještenje: '#F59E0B', Kultura: '#8B5CF6',
  Sport: '#EF4444', Turizam: '#10B981', Ostalo: '#6B7280',
}

function NewsModal({ article, onClose, onSuccess }: {
  article?: NewsArticle; onClose: () => void; onSuccess: () => void
}) {
  const isEdit = !!article
  const [form, setForm] = useState({
    title: article?.title || '',
    content: article?.content || '',
    short_description: article?.short_description || '',
    author: article?.author || '',
    category: article?.category || 'Vijesti',
    images: article?.images || [] as string[],
    is_published: article?.is_published ?? true,
  })
  const [tab, setTab] = useState<'osnovno' | 'sadrzaj' | 'slike'>('osnovno')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const cls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-xs font-medium text-slate-600 mb-1'

  const handleSave = async () => {
    if (!form.title || !form.content) { setError('Naslov i sadržaj su obavezni'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form }
      if (isEdit) await api.put(`/admin/news/${article!.id}`, payload)
      else await api.post('/admin/news', payload)
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri čuvanju')
    } finally { setSaving(false) }
  }

  const tabs = [
    { key: 'osnovno', label: '📋 Osnovno' },
    { key: 'sadrzaj', label: '✏️ Sadržaj' },
    { key: 'slike', label: '🖼️ Slike' },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-slate-800 text-lg">{isEdit ? `Uredi: ${article!.title.slice(0, 40)}` : 'Nova vijest'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
          {tabs.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {/* === OSNOVNO === */}
          {tab === 'osnovno' && (
            <>
              <div>
                <label className={lbl}>Naslov *</label>
                <input className={cls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Npr. Festival kulture u Gradačcu" />
              </div>
              <div>
                <label className={lbl}>Kratki uvod (prikazuje se u listi)</label>
                <textarea className={cls} rows={2} value={form.short_description}
                  onChange={e => set('short_description', e.target.value)}
                  placeholder="Jedna-dvije rečenice koje privlače čitaoca..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Kategorija</label>
                  <select className={cls} value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Autor (opciono)</label>
                  <input className={cls} value={form.author}
                    onChange={e => set('author', e.target.value)}
                    placeholder="Npr. Redakcija, Općina Gradačac..." />
                </div>
              </div>
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-slate-700">Objavljeno (vidljivo na webu i u mobilnoj app)</span>
                </label>
              </div>
            </>
          )}

          {/* === SADRZAJ === */}
          {tab === 'sadrzaj' && (
            <>
              <div>
                <label className={lbl}>Tekst vijesti * (Rich Text)</label>
                <p className="text-xs text-slate-400 mb-2">Formatuj tekst, dodaj naslove, liste, bold, italic...</p>
                <RichTextEditor
                  value={form.content}
                  onChange={val => set('content', val)}
                  placeholder="Upiši tekst vijesti..."
                  minHeight="320px"
                />
              </div>
            </>
          )}

          {/* === SLIKE === */}
          {tab === 'slike' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-2">
                <p className="text-xs text-blue-700">
                  <strong>💡 Savjet:</strong> Prva slika je naslovna i prikazuje se u listi vijesti. Ostale slike se prikazuju kao galerija u tekstu vijesti.
                </p>
              </div>
              <MultiImageUpload
                label="Slike vijesti"
                value={form.images}
                onChange={imgs => set('images', imgs)}
                max={8}
              />
            </>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-400">
            {form.images.length} slika • {form.content.length > 20 ? '✅ Sadržaj napisan' : '⚠️ Bez sadržaja'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Odustani</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Čuvanje...' : isEdit ? 'Sačuvaj izmjene' : 'Sačuvaj'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function News() {
  const qc = useQueryClient()
  const [editArticle, setEditArticle] = useState<NewsArticle | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: () => api.get('/news?published_only=false').then(r => r.data as NewsArticle[])
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/news/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news'] })
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['news'] })
    setShowCreate(false); setEditArticle(null)
  }

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('bs-BA', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vijesti</h1>
          <p className="text-slate-500 text-sm mt-1">Gradske vijesti i obavještenja — slike i rich tekst</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nova vijest
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && <div className="col-span-3 p-10 text-center text-slate-400">Učitavanje...</div>}
        {!isLoading && (articles as NewsArticle[]).length === 0 && (
          <div className="col-span-3 p-10 text-center">
            <Newspaper size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400">Nema vijesti</p>
          </div>
        )}
        {(articles as NewsArticle[]).map(a => {
          const imgs = a.images || []
          const img = imgs[0] ? getImgSrc(imgs[0]) : (a.image ? getImgSrc(a.image) : '')
          const col = CAT_COLORS[a.category] || '#6B7280'
          const plain = a.short_description || a.content.replace(/<[^>]*>/g, '').slice(0, 100)
          return (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-36 bg-slate-50 relative overflow-hidden">
                {img
                  ? <img src={img} alt={a.title} className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper size={40} className="text-slate-200" />
                    </div>
                  )
                }
                <span className="absolute top-2 left-2 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: col + 'ee', color: '#fff' }}>
                  {a.category}
                </span>
                {!a.is_published && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
                    <EyeOff size={11} /> Skriveno
                  </span>
                )}
                {imgs.length > 1 && (
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    🖼️ {imgs.length}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 leading-tight line-clamp-2">{a.title}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{plain}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-300">{formatDate(a.created_at)}</span>
                      {a.author && <span className="text-xs text-slate-400">— {a.author}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditArticle(a)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Obrisati "${a.title}"?`)) deleteMutation.mutate(a.id) }}
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

      {(showCreate || editArticle) && (
        <NewsModal
          article={editArticle || undefined}
          onClose={() => { setShowCreate(false); setEditArticle(null) }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
