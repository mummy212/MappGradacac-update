import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { ChevronLeft, ChevronRight, Users, Clock } from 'lucide-react'

const MONTH_NAMES = ['Januar','Februar','Mart','April','Maj','Juni','Juli','Avgust','Septembar','Oktobar','Novembar','Decembar']
const DAY_NAMES = ['Pon','Uto','Sri','Čet','Pet','Sub','Ned']
const ROOM_LABELS: Record<string,string> = { soba:'Soba', apartman:'Apartman', studio:'Studio' }
const BED_LABELS: Record<string,string> = { jedan_krevet:'1 krevet', dva_kreveta:'2 odvojena', bracni_krevet:'Bračni' }

function fmtDate(s?: string) {
  if (!s) return ''
  const MONTHS = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec']
  try { const d = new Date(s+'T12:00:00'); return `${d.getDate()}. ${MONTHS[d.getMonth()]}` } catch { return s }
}

function cellStyle(count: number, isToday: boolean, isSelected: boolean, isPast: boolean) {
  const base = 'relative flex flex-col items-center justify-center rounded-xl aspect-square cursor-pointer transition-all select-none text-sm font-medium border'
  if (isSelected) return base + ' ring-2 ring-offset-1 ring-purple-500 border-purple-300 bg-purple-50 text-purple-900'
  if (count >= 6) return base + ' bg-red-50 border-red-200 text-red-800 hover:bg-red-100'
  if (count >= 3) return base + ' bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
  if (count >= 1) return base + ' bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
  if (isToday)    return base + ' bg-purple-50 border-purple-200 text-purple-700 font-bold'
  if (isPast)     return base + ' border-transparent text-gray-300 cursor-default'
  return base + ' border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-200'
}

function dotColor(count: number) {
  if (count >= 6) return 'bg-red-500'
  if (count >= 3) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export default function ReservationCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reservation-calendar', year, month],
    queryFn: () => api.get(`/business/reservations/calendar?year=${year}&month=${month}`).then(r => r.data),
    staleTime: 60000,
  })

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1); setSelectedDay(null) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1); setSelectedDay(null) }

  const firstWeekday: number = data?.first_weekday ?? 0
  const daysInMonth: number  = data?.days_in_month ?? 30
  const daily = data?.daily ?? {}
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  // Build grid cells (empty + day cells)
  const cells: ({ day: number; dateStr: string; data: any } | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    cells.push({ day: d, dateStr, data: daily[dateStr] || null })
  }

  const selectedData = selectedDay ? daily[selectedDay] : null

  // Summary bar
  const totalCount = Object.values(daily as Record<string,any>).reduce((s: number, d: any) => s + d.count, 0)
  const busyDays = Object.keys(daily).length
  const peakDay = Object.entries(daily as Record<string,any>).sort((a, b) => b[1].count - a[1].count)[0]

  return (
    <div>
      {/* Summary row */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{totalCount}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Rezervacija ovaj mj.</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{busyDays}</p>
            <p className="text-xs text-amber-600 mt-0.5">Zauzeta dana</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-purple-700">{peakDay ? `${peakDay[1].count}×` : '—'}</p>
            <p className="text-xs text-purple-600 mt-0.5">{peakDay ? fmtDate(peakDay[0]) : 'Nema'}</p>
          </div>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-600">
          <ChevronLeft size={18} />
        </button>
        <h2 className="font-bold text-gray-900 text-base">{MONTH_NAMES[month-1]} {year}</h2>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-600">
          <ChevronRight size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} className="aspect-square" />
              const count = cell.data?.count ?? 0
              const isPast = cell.dateStr < todayStr
              return (
                <button
                  key={cell.dateStr}
                  disabled={isPast && count === 0}
                  onClick={() => setSelectedDay(selectedDay === cell.dateStr ? null : cell.dateStr)}
                  className={cellStyle(count, cell.dateStr === todayStr, selectedDay === cell.dateStr, isPast && count === 0)}
                >
                  <span>{cell.day}</span>
                  {count > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor(count)}`} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block" />1–2 rezervacije
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" />3–5 rezervacija
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />6+ rezervacija
            </span>
          </div>
        </div>
      )}

      {/* Day detail panel */}
      {selectedDay && (
        <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">{fmtDate(selectedDay)}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedData ? `${selectedData.count} rezervacija · ${selectedData.confirmed ?? 0} potvrđenih · ${selectedData.pending ?? 0} na čekanju` : 'Nema rezervacija'}
              </p>
            </div>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
          </div>
          {!selectedData || selectedData.items.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nema rezervacija za ovaj dan</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedData.items.map((item: any, idx: number) => (
                <div key={item.id + idx} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg
                    ${item.type === 'room' ? 'bg-purple-50' : 'bg-emerald-50'}`}>
                    {item.type === 'room' ? '🛏️' : '🍽️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.customer_name}</p>
                    {item.type === 'table' ? (
                      <p className="text-xs text-gray-500">
                        <Clock size={10} className="inline mr-1" />{item.time}
                        {' · '}<Users size={10} className="inline mr-1" />{item.guests} os.
                        {item.table_preference && item.table_preference !== 'svejedno' && ` · ${item.table_preference}`}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {fmtDate(item.check_in_date)} → {fmtDate(item.check_out_date)}
                        {item.room_type && ` · ${ROOM_LABELS[item.room_type] ?? item.room_type}`}
                        {item.bed_type && ` · ${BED_LABELS[item.bed_type] ?? item.bed_type}`}
                      </p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold
                    ${item.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {item.status === 'confirmed' ? '✓ Potvrđena' : '⏳ Na čekanju'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
