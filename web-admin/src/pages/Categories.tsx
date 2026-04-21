import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import type { Category } from '../types'

function CategoryModal({
  category,
  onClose,
  onSuccess,
}: {
  category?: Category
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!category
  const [name, setName] = useState(category?.name || '')
  const [icon, setIcon] = useState(category?.icon || 'location')
  const [color, setColor] = useState(category?.color || '#3B82F6')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { setError('Naziv je obavezan'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await api.put(`/admin/categories/${category!.id}`, { name, icon, color })
      } else {
        await api.post('/admin/categories', { name, icon, color })
      }
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri čuvanju')
    } finally {
      setSaving(false)
    }
  }

  const iconOptions = ['restaurant', 'cart', 'car', 'cafe', 'medkit', 'water', 'location', 'star', 'home', 'briefcase']

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Uredi kategoriju' : 'Nova kategorija'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Naziv *</label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Npr. Restorani"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ikona (Ionicons naziv)</label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="restaurant"
              />
              <select
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={icon}
                onChange={e => setIcon(e.target.value)}
              >
                {iconOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Boja</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#3B82F6"
              />
              <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: color }} />
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
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

export default function Categories() {
  const qc = useQueryClient()
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      alert(e.response?.data?.detail || 'Greška pri brisanju')
    }
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['categories'] })
    setShowCreate(false)
    setEditCat(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kategorije</h1>
          <p className="text-slate-500 text-sm mt-1">{(categories as Category[]).length} ukupno</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nova kategorija
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Učitavanje...</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {(categories as Category[]).map(cat => (
              <div key={cat.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.color + '20' }}>
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800">{cat.name}</p>
                  <p className="text-xs text-slate-400">icon: {cat.icon} · {cat.color}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditCat(cat)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Obrisati "${cat.name}"?`)) deleteMutation.mutate(cat.id) }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showCreate || editCat) && (
        <CategoryModal
          category={editCat || undefined}
          onClose={() => { setShowCreate(false); setEditCat(null) }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
