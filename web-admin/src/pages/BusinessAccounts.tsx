import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Plus, Trash2, X, Users } from 'lucide-react'
import type { BusinessAccount, Location } from '../types'

function BusinessModal({
  locations,
  onClose,
  onSuccess,
}: {
  locations: Location[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({ email: '', password: '', name: '', location_id: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.email || !form.password || !form.name || !form.location_id) {
      setError('Sva polja su obavezna')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/admin/business-accounts', form)
      onSuccess()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri kreaciji naloga')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Novi biznis nalog</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Naziv poslovnog subjekta *</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Npr. Restoran Stari Grad d.o.o." />
          </div>
          <div>
            <label className={labelCls}>Email adresa *</label>
            <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="biznis@email.com" />
          </div>
          <div>
            <label className={labelCls}>Lozinka *</label>
            <input type="password" className={inputCls} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 6 znakova" />
          </div>
          <div>
            <label className={labelCls}>Poveži s lokacijom *</label>
            <select className={inputCls} value={form.location_id} onChange={e => set('location_id', e.target.value)}>
              <option value="">— Odaberite lokaciju —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-lg">
            💡 Biznis vlasnik će se moći prijaviti s ovim kredencijalima i upravljati samo svojom lokacijom.
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Odustani</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Kreacija...' : 'Kreiraj nalog'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BusinessAccounts() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['business-accounts'],
    queryFn: () => api.get('/admin/business-accounts').then(r => r.data)
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then(r => r.data)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/business-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-accounts'] })
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['business-accounts'] })
    setShowCreate(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Biznis Nalozi</h1>
          <p className="text-slate-500 text-sm mt-1">{(accounts as BusinessAccount[]).length} aktivnih naloga</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novi nalog
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Učitavanje...</div>
        ) : (
          <div>
            {(accounts as BusinessAccount[]).length > 0 ? (
              <div className="divide-y divide-slate-50">
                {(accounts as BusinessAccount[]).map(acc => (
                  <div key={acc.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users size={18} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800">{acc.name}</p>
                      <p className="text-xs text-slate-500">{acc.email}</p>
                      {acc.location_name && (
                        <p className="text-xs text-blue-600 mt-0.5">📍 {acc.location_name}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">
                        {acc.created_at ? new Date(acc.created_at).toLocaleDateString('bs-BA') : '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => { if (confirm(`Obrisati nalog "${acc.email}"?`)) deleteMutation.mutate(acc.id) }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400">Nema biznis naloga</p>
                <p className="text-xs text-slate-400 mt-1">Kreirajte nalog za vlasnike lokacija</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <BusinessModal
          locations={locations as Location[]}
          onClose={() => setShowCreate(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
