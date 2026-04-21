import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../api'
import { Save, CheckCircle } from 'lucide-react'
import type { AppSettings } from '../types'

export default function Settings() {
  const [paypalLink, setPaypalLink] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data as AppSettings)
  })

  useEffect(() => {
    if (settings) {
      setPaypalLink(settings.paypal_link || '')
      setContactEmail(settings.contact_email || '')
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => api.put('/admin/settings', { paypal_link: paypalLink, contact_email: contactEmail }),
    onSuccess: () => {
      setSaved(true)
      setError('')
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Greška pri čuvanju')
    }
  })

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Postavke</h1>
        <p className="text-slate-500 text-sm mt-1">Konfiguracija aplikacije</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 max-w-2xl">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Opće postavke</h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              PayPal donacija link
            </label>
            <input
              className={inputCls}
              value={paypalLink}
              onChange={e => setPaypalLink(e.target.value)}
              placeholder="https://paypal.me/vasnalog"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Korisnici će moći donirati putem ovog linka iz mobilne aplikacije
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kontakt email
            </label>
            <input
              type="email"
              className={inputCls}
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="info@gradacac-mapa.ba"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Prikazuje se korisnicima u aplikaciji za kontakt
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle size={16} />
              Postavke su uspješno sačuvane!
            </div>
          )}

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={15} />
            {saveMutation.isPending ? 'Čuvanje...' : 'Sačuvaj postavke'}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-4 max-w-2xl">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Informacije o pristupu</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p>🔐 Admin pristup: <span className="font-mono font-bold">admin@gradacac.ba</span></p>
          <p>📱 Mobilna app verzija: 3.0</p>
          <p>⚙️ Backend: FastAPI + MongoDB</p>
        </div>
      </div>
    </div>
  )
}
