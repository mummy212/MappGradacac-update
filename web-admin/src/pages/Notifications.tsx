import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Send, Smartphone, CheckCircle, XCircle, Moon, Shield, Users } from 'lucide-react'
import type { Notification } from '../types'

const CATEGORIES = [
  { value: '', label: 'Svi korisnici', desc: 'Pošalji svima bez obzira na preferencije' },
  { value: 'news', label: 'Vijesti', desc: 'Korisnici koji prate vijesti' },
  { value: 'events', label: 'Dogadjaji', desc: 'Korisnici koji prate dogadjaje' },
  { value: 'offers', label: 'Ponude', desc: 'Korisnici koji prate ponude' },
]

export default function Notifications() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetCat, setTargetCat] = useState('')
  const [smartLimit, setSmartLimit] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string; quietHours?: boolean } | null>(null)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/admin/notifications').then(r => r.data)
  })

  const { data: pushStats } = useQuery({
    queryKey: ['push-stats', targetCat],
    queryFn: () => api.get(`/admin/push-stats${targetCat ? `?category=${targetCat}` : ''}`).then(r => r.data),
    refetchInterval: 30000,
  })

  const sendMutation = useMutation({
    mutationFn: () => api.post('/admin/notifications/send', {
      title, body,
      target_category: targetCat || null,
      smart_limit: smartLimit,
    }),
    onSuccess: (res) => {
      const d = res.data
      const quietWarn = d.quiet_hours ? ' Tihe sate (22:00-08:00)!' : ''
      setResult({ ok: true, message: `Poslano na ${d.successful}/${d.total_devices} uredaja${quietWarn}`, quietHours: d.quiet_hours })
      setTitle('')
      setBody('')
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['push-stats'] })
    },
    onError: () => {
      setResult({ ok: false, message: 'Greska pri slanju obavjestenja' })
    },
    onSettled: () => setSending(false)
  })

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return
    if (pushStats?.quiet_hours) {
      const confirmed = window.confirm(`Trenutno su tihe sate (${pushStats.quiet_hours_range}). Korisnici mogu biti uznemireni. Nastaviti?`)
      if (!confirmed) return
    }
    setSending(true)
    setResult(null)
    sendMutation.mutate()
  }

  const estimatedReach = pushStats?.targeted_devices ?? pushStats?.active_devices ?? 0
  const isQuietHours = pushStats?.quiet_hours

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Obavjestenja</h1>
        <p className="text-slate-500 text-sm mt-1">Posaljite ciljane push notifikacije korisnicima</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Send form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Send size={18} className="text-violet-600" />
            <h2 className="font-semibold text-slate-800">Pošalji obavještenje</h2>
          </div>

          <div className="space-y-4">
            {/* Target audience */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                <Users size={12} />
                Ciljana grupa
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setTargetCat(cat.value)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      targetCat === cat.value
                        ? 'bg-violet-50 border-violet-400 text-violet-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-violet-300'
                    }`}
                  >
                    <div className="font-medium text-xs">{cat.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Naslov *</label>
              <input
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Npr. Nova ponuda u centru!"
                maxLength={100}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{title.length}/100</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Poruka *</label>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                rows={3}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Tekst obavjestenja..."
                maxLength={200}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{body.length}/200</p>
            </div>

            {/* Smart limit toggle */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Shield size={16} className="text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-700">Anti-spam zastita (max 2/dan)</p>
                <p className="text-xs text-slate-400">Preskoci uredjaje koji su vec primili 2 obavjestenja danas</p>
              </div>
              <button
                onClick={() => setSmartLimit(v => !v)}
                className={`w-10 h-5 rounded-full transition-colors relative ${smartLimit ? 'bg-green-500' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${smartLimit ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {result && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                result.ok
                  ? result.quietHours
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {result.ok ? (result.quietHours ? <Moon size={16} /> : <CheckCircle size={16} />) : <XCircle size={16} />}
                {result.message}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full justify-center"
            >
              <Send size={15} />
              {sending ? 'Slanje...' : `Pošalji (${estimatedReach} uredjaja)`}
            </button>
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-violet-600" />
              <h2 className="font-semibold text-slate-800">Doseg</h2>
            </div>
            <div className="text-center py-2">
              <p className="text-4xl font-bold text-slate-800">{estimatedReach}</p>
              <p className="text-sm text-slate-500 mt-1">
                {targetCat ? 'uredjaja za odabranu kategoriju' : 'aktivnih uredjaja'}
              </p>
              {targetCat && (
                <p className="text-xs text-slate-400 mt-1">od {pushStats?.active_devices ?? 0} ukupno</p>
              )}
            </div>
          </div>

          {/* Quiet hours */}
          <div className={`rounded-xl border p-4 ${isQuietHours ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Moon size={16} className={isQuietHours ? 'text-amber-600' : 'text-green-600'} />
              <span className={`text-sm font-medium ${isQuietHours ? 'text-amber-700' : 'text-green-700'}`}>
                {isQuietHours ? 'Tihe sate aktivne' : 'Dobro vrijeme za slanje'}
              </span>
            </div>
            <p className={`text-xs ${isQuietHours ? 'text-amber-600' : 'text-green-600'}`}>
              Tihe sate: {pushStats?.quiet_hours_range ?? '22:00 - 08:00'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-green-600" />
              <span className="text-sm font-medium text-slate-700">Anti-spam pravila</span>
            </div>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>Max 2 push / uredjaj / dan</li>
              <li>Korisnici biraju kategorije</li>
              <li>Tihe sate 22:00 - 08:00</li>
            </ul>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Historija obavjestenja</h2>
        </div>
        {(notifications as Notification[]).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Naslov</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kategorija</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Uspjesno</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(notifications as any[]).map((n: any) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-400 max-w-[180px] truncate">{n.body}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                        n.target_category ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {n.target_category
                          ? CATEGORIES.find(c => c.value === n.target_category)?.label ?? n.target_category
                          : 'Svi'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CheckCircle size={13} className="text-green-500" />
                        <span className="text-sm font-medium text-green-600">{n.successful}</span>
                        <span className="text-xs text-slate-400">/ {n.total_devices}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(n.created_at).toLocaleDateString('bs-BA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400">Nema poslanih obavjestenja</div>
        )}
      </div>
    </div>
  )
}
