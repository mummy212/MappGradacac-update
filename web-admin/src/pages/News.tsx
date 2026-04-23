import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Plus, Trash2, X, Globe, EyeOff, Edit2 } from 'lucide-react'
import RichTextEditor from '../components/RichTextEditor'

interface NewsArticle {
  id: string
  title: string
  content: string
  category: string
  image?: string
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
    category: article?.category || 'Vijesti',
    is_published: article?.is_published ?? true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title || !form.content) { setError('Naslov i sadržaj su obavezni'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) await api.put(`/admin/news/${article!.id}`, form)
      else await api.post('/admin/news', form)
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri čuvanju')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Uredi vijest' : 'Nova vijest'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Naslov *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Npr. Festival kulture u Gradačcu" />
          </div>
          <div>
            <label className={labelCls}>Sadržaj *</label>
            <RichTextEditor
              value={form.content}
              onChange={val => set('content', val)}
              placeholder="Tekst vijesti..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Kategorija</label>
              <select className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Objavljeno (vidljivo u app)</span>
              </label>
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Odustani</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            {saving ? 'Čuvanje...' : 'Sačuvaj'}
          </button>
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
          <p className="text-slate-500 text-sm mt-1">Gradske vijesti i obavještenja</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16} /> Nova vijest
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
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Naslov</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Kategorija</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(articles as NewsArticle[]).map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{a.content}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: (CAT_COLORS[a.category] || '#6B7280') + '20', color: CAT_COLORS[a.category] || '#6B7280' }}>
                        {a.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.is_published
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700"><Globe size={12} /> Objavljeno</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400"><EyeOff size={12} /> Skriveno</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditArticle(a)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                        <button onClick={() => { if (confirm(`Obrisati "${a.title}"?`)) deleteMutation.mutate(a.id) }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {articles.length === 0 && <div className="p-10 text-center text-slate-400">Nema vijesti</div>}
          </div>
        )}
      </div>

      {(showCreate || editArticle) && (
        <NewsModal article={editArticle || undefined} onClose={() => { setShowCreate(false); setEditArticle(null) }} onSuccess={handleSuccess} />
      )}
    </div>
  )
}
