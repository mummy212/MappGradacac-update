import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { Calendar, Clock, Users, Phone, Mail, CheckCircle2, XCircle, CheckCheck, ChevronDown, Filter } from 'lucide-react'

interface Reservation {
  id: string
  location_name: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  date: string
  time: string
  guests: number
  special_requests?: string
  table_preference?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  business_note?: string
  created_at?: string
}

const STATUS_CONFIG = {
  pending:   { label: 'Čeka potvrdu', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200', icon: <Clock size={14} /> },
  confirmed: { label: 'Potvrđena',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={14} /> },
  cancelled: { label: 'Otkazana',     bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200', icon: <XCircle size={14} /> },
  completed: { label: 'Završena',     bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200', icon: <CheckCheck size={14} /> },
}

function formatDate(dateStr: string) {
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  try {
    const d = new Date(dateStr + 'T12:00:00')
    return `${d.getDate()}. ${MONTHS[d.getMonth()]}. ${d.getFullYear()}.`
  } catch { return dateStr }
}

export default function Reservations() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['business-reservations'],
    queryFn: () => api.get('/business/reservations').then(r => r.data),
    refetchInterval: 30000,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      api.put(`/business/reservations/${id}/status`, { status, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['business-reservations'] }); setSelectedId(null) },
  })

  const filtered = filterStatus === 'all' ? reservations : reservations.filter(r => r.status === filterStatus)
  const counts = { all: reservations.length, pending: reservations.filter(r => r.status === 'pending').length, confirmed: reservations.filter(r => r.status === 'confirmed').length, cancelled: reservations.filter(r => r.status === 'cancelled').length, completed: reservations.filter(r => r.status === 'completed').length }
  const selected = selectedId ? reservations.find(r => r.id === selectedId) : null

  const handleAction = (id: string, status: string) => {
    updateStatus.mutate({ id, status, note: noteInput || undefined })
    setNoteInput('')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rezervacije</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upravljajte rezervacijama vaše lokacije</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-semibold">{counts.pending} novih</span>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-semibold">{counts.confirmed} potvrđenih</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {([['all', 'Sve'], ['pending', 'Čekaju'], ['confirmed', 'Potvrđene'], ['completed', 'Završene'], ['cancelled', 'Otkazane']] as [string, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatus === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {label} <span className="text-xs opacity-70">({counts[key as keyof typeof counts] ?? 0})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium">Nema rezervacija</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
            const isExpanded = selectedId === r.id
            return (
              <div key={r.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}>
                <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setSelectedId(isExpanded ? null : r.id)}>
                  {/* Date block */}
                  <div className="w-14 h-14 bg-emerald-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-emerald-100">
                    <span className="text-xl font-bold text-emerald-700 leading-none">{new Date(r.date + 'T12:00:00').getDate()}</span>
                    <span className="text-xs text-emerald-500 font-medium">{['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][new Date(r.date + 'T12:00:00').getMonth()]}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{r.customer_name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.bg} ${st.text} ${st.border}`}>
                        {st.icon}{st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={12} />{r.time}</span>
                      <span className="flex items-center gap-1"><Users size={12} />{r.guests} {r.guests === 1 ? 'osoba' : 'osobe/a'}</span>
                      <span className="flex items-center gap-1"><Phone size={12} />{r.customer_phone}</span>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4">
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 font-medium mb-1">DATUM I VRIJEME</p>
                        <p className="font-medium text-gray-900">{formatDate(r.date)} u {r.time}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 font-medium mb-1">KONTAKT</p>
                        <p className="font-medium text-gray-900">{r.customer_phone}</p>
                        {r.customer_email && <p className="text-gray-500 text-xs mt-0.5">{r.customer_email}</p>}
                      </div>
                      {r.special_requests && (
                        <div className="col-span-2 bg-amber-50 rounded-xl p-3 border border-amber-100">
                          <p className="text-xs text-amber-600 font-medium mb-1">POSEBNI ZAHTJEVI</p>
                          <p className="text-gray-700 text-sm">{r.special_requests}</p>
                        </div>
                      )}
                      {r.table_preference && (
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-blue-500 font-medium mb-1">PREFERENCIJA</p>
                          <p className="text-gray-700 text-sm">{r.table_preference}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {r.status === 'pending' && (
                      <div className="space-y-3">
                        <input
                          type="text" placeholder="Opciona napomena za gosta (npr. 'Sto br. 4 je rezervisan')"
                          value={noteInput} onChange={e => setNoteInput(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(r.id, 'confirmed')}
                            disabled={updateStatus.isPending}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                            <CheckCircle2 size={15} />Potvrdi rezervaciju
                          </button>
                          <button onClick={() => handleAction(r.id, 'cancelled')}
                            disabled={updateStatus.isPending}
                            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50">
                            <XCircle size={15} />Otkaži
                          </button>
                        </div>
                      </div>
                    )}
                    {r.status === 'confirmed' && (
                      <button onClick={() => handleAction(r.id, 'completed')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition disabled:opacity-50">
                        <CheckCheck size={15} />Označi kao završenu
                      </button>
                    )}
                    {r.business_note && (
                      <div className="mt-3 text-xs text-gray-400">
                        <span className="font-medium">Vaša napomena:</span> {r.business_note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
