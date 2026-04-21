import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { Star, MessageSquare } from 'lucide-react'
import type { Review } from '../types'

export default function Reviews() {
  const { user } = useAuth()
  const lid = user?.location_id

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ['my-reviews'],
    queryFn: () => api.get(`/locations/${lid}/reviews`).then(r => r.data),
    enabled: !!lid
  })

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length
    : 0

  const distribution = [5, 4, 3, 2, 1].map(n => ({
    stars: n,
    count: reviews.filter(r => r.stars === n).length,
    pct: reviews.length ? Math.round(reviews.filter(r => r.stars === n).length / reviews.length * 100) : 0
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Recenzije</h1>
        <p className="text-slate-500 text-sm mt-1">{reviews.length} ukupno recenzija</p>
      </div>

      {/* Rating overview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-5">
        <div className="flex items-center gap-8">
          <div className="text-center flex-shrink-0">
            <p className="text-5xl font-bold text-slate-800">{avgRating.toFixed(1)}</p>
            <div className="flex justify-center mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className={i < Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'} />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">{reviews.length} recenzija</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {distribution.map(({ stars, count, pct }) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-4">{stars}</span>
                <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-slate-400 w-7 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <MessageSquare size={17} className="text-emerald-600" />
          <h2 className="font-semibold text-slate-800">Sve recenzije</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Učitavanje...</div>
        ) : reviews.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {reviews.map(r => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-sm font-bold text-emerald-700 flex-shrink-0">
                      {r.author_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{r.author_name}</p>
                      <div className="flex mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={11} className={i < r.stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">{new Date(r.created_at).toLocaleDateString('bs-BA')}</p>
                </div>
                {r.comment && <p className="text-sm text-slate-600 mt-2.5 ml-12">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <MessageSquare size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400">Nema recenzija još uvijek</p>
          </div>
        )}
      </div>
    </div>
  )
}
