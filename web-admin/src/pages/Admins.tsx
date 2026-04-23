import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Plus, Trash2, X, Shield, Edit2, KeyRound, Mail, User } from 'lucide-react'

interface Admin {
  id: string
  name: string
  email: string
  role: string
  created_at?: string
}

function AdminModal({
  admin, onClose, onSuccess, currentUserId,
}: {
  admin?: Admin | null
  onClose: () => void
  onSuccess: () => void
  currentUserId?: string
}) {
  const isEdit = !!admin
  const [form, setForm] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
    password: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Naziv i email su obavezni')
      return
    }
    if (!isEdit && !form.password) {
      setError('Lozinka je obavezna za novog admina')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, string> = { name: form.name.trim(), email: form.email.trim() }
      if (form.password) payload.password = form.password
      if (isEdit) {
        await api.put(`/admin/admins/${admin!.id}`, payload)
      } else {
        await api.post('/admin/admins', payload)
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-purple-600" />
            </div>
            <h2 className="font-semibold text-slate-800">
              {isEdit ? `Uredi: ${admin!.name}` : 'Novi administrator'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className={labelCls}>Puno ime *</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Npr. Mujo Mujić" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email adresa *</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" className={`${inputCls} pl-9`} value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="admin@gradacac.ba" />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              {isEdit ? 'Nova lozinka (ostavite prazno za bez izmjene)' : 'Lozinka *'}
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" className={`${inputCls} pl-9`} value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? 'Ostavite prazno za bez promjene' : 'Min. 6 znakova'} />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
            <p className="text-xs text-purple-700">
              <strong>🛡️ Administrator</strong> ima potpuni pristup panelu: može upravljati lokacijama, događajima, vijestima, korisnicima i svim postavkama.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
            Odustani
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Čuvanje...' : isEdit ? 'Sačuvaj izmjene' : 'Kreiraj admina'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Admins() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null)

  // Get current user info from token
  const currentUserId = (() => {
    try {
      const token = localStorage.getItem('token') || ''
      if (!token) return ''
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.sub || payload.id || ''
    } catch { return '' }
  })()

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get('/admin/admins').then(r => r.data)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/admins/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      alert(e.response?.data?.detail || 'Greška pri brisanju')
    }
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['admins'] })
    setShowCreate(false)
    setEditAdmin(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield size={22} className="text-purple-600" />
            Administratori
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Upravljanje admin nalozima — {(admins as Admin[]).length} admin{(admins as Admin[]).length !== 1 ? 'a' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Novi admin
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-medium text-amber-800">Pažljivo sa admin nalozima</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Svaki administrator ima potpuni pristup svim podacima i funkcijama. Dodajte samo pouzdane osobe.
            Ne možete obrisati vlastiti nalog dok ste prijavljeni.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Učitavanje...</div>
        ) : (admins as Admin[]).length === 0 ? (
          <div className="p-10 text-center">
            <Shield size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400">Nema admina</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(admins as Admin[]).map((admin, idx) => {
              const isSelf = admin.id === currentUserId
              return (
                <div key={admin.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-800">{admin.name}</p>
                      {isSelf && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          Vi
                        </span>
                      )}
                      {idx === 0 && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          Glavni admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{admin.email}</p>
                    {admin.created_at && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Dodan: {new Date(admin.created_at).toLocaleDateString('bs-BA')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditAdmin(admin)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Uredi">
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (isSelf) { alert('Ne možete obrisati vlastiti nalog!'); return }
                        if (confirm(`Obrisati admina "${admin.email}"?`)) deleteMutation.mutate(admin.id)
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSelf
                          ? 'text-slate-200 cursor-not-allowed'
                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title={isSelf ? 'Ne možete obrisati vlastiti nalog' : 'Obriši'}
                      disabled={isSelf}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <AdminModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleSuccess}
          currentUserId={currentUserId}
        />
      )}
      {editAdmin && (
        <AdminModal
          admin={editAdmin}
          onClose={() => setEditAdmin(null)}
          onSuccess={handleSuccess}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
