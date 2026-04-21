import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Send, Smartphone, CheckCircle, XCircle } from 'lucide-react'
import type { Notification } from '../types'

export default function Notifications() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/admin/notifications').then(r => r.data)
  })
  const { data: pushStats } = useQuery({
    queryKey: ['push-stats'],
    queryFn: () => api.get('/admin/push-stats').then(r => r.data)
  })

  const sendMutation = useMutation({
    mutationFn: () => api.post('/admin/notifications/send', { title, body }),
    onSuccess: (res) => {
      setResult({ ok: true, message: `Poslano na ${res.data.successful}/${res.data.total_devices} uređaja` })
      setTitle('')
      setBody('')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => {
      setResult({ ok: false, message: 'Greška pri slanju obavještenja' })
    },
    onSettled: () => setSending(false)
  })

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setResult(null)
    sendMutation.mutate()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Obavještenja</h1>
        <p className="text-slate-500 text-sm mt-1">Pošaljite push notifikaciju svim korisnicima</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Send form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Send size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-800">Pošalji obavještenje</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Naslov *</label>
              <input
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Tekst obavještenja..."
                maxLength={300}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{body.length}/300</p>
            </div>

            {result && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {result.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {result.message}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Send size={15} />
              {sending ? 'Slanje...' : 'Pošalji svima'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-800">Statistike</h2>
          </div>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-slate-800">{pushStats?.active_devices || 0}</p>
            <p className="text-sm text-slate-500 mt-1">aktivnih uređaja</p>
          </div>
          <div className="border-t border-slate-100 pt-4 mt-2">
            <p className="text-xs text-slate-500 text-center">Ukupno poslanih obavještenja: <span className="font-semibold text-slate-700">{(notifications as Notification[]).length}</span></p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Historija obavještenja</h2>
        </div>
        {(notifications as Notification[]).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Naslov</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Poruka</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Uspješno</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(notifications as Notification[]).map(n => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-slate-800">{n.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600 max-w-[200px] truncate">{n.body}</p>
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
          <div className="p-10 text-center text-slate-400">
            Nema poslanih obavještenja
          </div>
        )}
      </div>
    </div>
  )
}
