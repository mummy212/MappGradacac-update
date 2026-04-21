import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import { MapPin, Tag, Users, Bell, Smartphone, TrendingUp } from 'lucide-react'
import type { Notification } from '../types'

export default function Dashboard() {
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then(r => r.data)
  })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data)
  })
  const { data: businessAccounts } = useQuery({
    queryKey: ['business-accounts'],
    queryFn: () => api.get('/admin/business-accounts').then(r => r.data)
  })
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/admin/notifications').then(r => r.data)
  })
  const { data: pushStats } = useQuery({
    queryKey: ['push-stats'],
    queryFn: () => api.get('/admin/push-stats').then(r => r.data)
  })

  const stats = [
    { label: 'Ukupno lokacija', value: locations?.length || 0, icon: MapPin, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Kategorije', value: categories?.length || 0, icon: Tag, color: 'bg-purple-500', bg: 'bg-purple-50' },
    { label: 'Biznis nalozi', value: businessAccounts?.length || 0, icon: Users, color: 'bg-green-500', bg: 'bg-green-50' },
    { label: 'Aktivni uređaji', value: pushStats?.active_devices || 0, icon: Smartphone, color: 'bg-orange-500', bg: 'bg-orange-50' },
  ]

  const premiumCount = locations?.filter((l: { is_premium: boolean }) => l.is_premium).length || 0
  const totalViews = locations?.reduce((s: number, l: { views?: number }) => s + (l.views || 0), 0) || 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Pregled aplikacije Gradačac Mapa</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className="text-white" size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Premium lokacije</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{premiumCount}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-yellow-600 text-lg">👑</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Ukupno pregleda</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{totalViews.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Bell size={17} className="text-slate-600" />
          <h2 className="font-semibold text-slate-800">Posljednja obavještenja</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {(notifications as Notification[])?.slice(0, 5).map((n) => (
            <div key={n.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-medium text-green-600">{n.successful}/{n.total_devices}</p>
                <p className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString('bs-BA')}</p>
              </div>
            </div>
          )) || (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              Nema poslanih obavještenja
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
