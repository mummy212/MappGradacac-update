import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { Eye, Phone, Navigation, Star, MessageSquare, TrendingUp } from 'lucide-react'
import type { Location, BusinessStats } from '../types'

export default function Dashboard() {
  const { user } = useAuth()
  const lid = user?.location_id

  const { data: location } = useQuery<Location>({
    queryKey: ['my-location'],
    queryFn: () => api.get(`/locations/${lid}`).then(r => r.data),
    enabled: !!lid
  })

  const { data: stats } = useQuery<BusinessStats>({
    queryKey: ['business-stats'],
    queryFn: () => api.get('/business/stats').then(r => r.data),
    enabled: !!lid
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get(`/locations/${lid}/reviews`).then(r => r.data),
    enabled: !!lid
  })

  const statCards = [
    { label: 'Pregleda', value: stats?.totals?.views || location?.views || 0, icon: Eye, color: 'bg-blue-500' },
    { label: 'Navigacija', value: stats?.totals?.nav_clicks || location?.nav_clicks || 0, icon: Navigation, color: 'bg-purple-500' },
    { label: 'Poziva', value: stats?.totals?.call_clicks || location?.call_clicks || 0, icon: Phone, color: 'bg-orange-500' },
    { label: 'Recenzija', value: location?.review_count || 0, icon: MessageSquare, color: 'bg-pink-500' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {location ? location.name : 'Pregled'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {location ? location.address : 'Učitavanje...'}
        </p>
      </div>

      {/* Rating highlight */}
      {location && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-5 flex items-center gap-5">
          <div className="text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <Star size={24} className="text-yellow-400 fill-yellow-400" />
              <span className="text-3xl font-bold text-slate-800">{location.avg_rating?.toFixed(1) || '—'}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Prosječna ocjena</p>
          </div>
          <div className="h-12 w-px bg-emerald-200" />
          <div>
            <p className="text-sm font-medium text-slate-700">
              {location.review_count} recenzija od korisnika
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Radno vrijeme: {location.working_hours || 'Nije postavljeno'}
            </p>
          </div>
          <div className="ml-auto">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${location.is_premium ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
              {location.is_premium ? '👑 Premium' : 'Standard'}
            </span>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className="text-white" size={19} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent reviews */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp size={17} className="text-emerald-600" />
          <h2 className="font-semibold text-slate-800">Posljednje recenzije</h2>
        </div>
        {(reviews as { id: string; author_name: string; stars: number; comment?: string; created_at: string }[]).length > 0 ? (
          <div className="divide-y divide-slate-50">
            {(reviews as { id: string; author_name: string; stars: number; comment?: string; created_at: string }[]).slice(0, 5).map(r => (
              <div key={r.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-700">
                  {r.author_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{r.author_name}</p>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={11} className={i < r.stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.comment}</p>}
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">{new Date(r.created_at).toLocaleDateString('bs-BA')}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Nema recenzija još uvijek</div>
        )}
      </div>
    </div>
  )
}
