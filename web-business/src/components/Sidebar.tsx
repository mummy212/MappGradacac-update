import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, MapPin, Tag, Star, LogOut, Map, UtensilsCrossed, ShoppingCart, Wrench } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { Location } from '../types'

type Mode = 'menu' | 'market' | 'pharmacy' | 'service'

function getCategoryConfig(category: string): { label: string; mode: Mode; icon: React.ReactNode } {
  switch (category) {
    case 'restaurant':
    case 'cafe':
      return { label: 'Meni', mode: 'menu', icon: <UtensilsCrossed size={17} /> }
    case 'market':
      return { label: 'Cjenovnik', mode: 'market', icon: <ShoppingCart size={17} /> }
    case 'pharmacy':
      return { label: 'Ponuda', mode: 'pharmacy', icon: <Tag size={17} /> }
    case 'auto_service':
    case 'gas_station':
      return { label: 'Cjenovnik usluga', mode: 'service', icon: <Wrench size={17} /> }
    default:
      return { label: 'Ponuda', mode: 'pharmacy', icon: <Tag size={17} /> }
  }
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: location } = useQuery<Location>({
    queryKey: ['my-location'],
    queryFn: () => api.get(`/locations/${user?.location_id}`).then(r => r.data),
    enabled: !!user?.location_id
  })

  const catConfig = location ? getCategoryConfig(location.category) : getCategoryConfig('')

  const navItems = [
    { to: '/', label: 'Pregled', icon: <LayoutDashboard size={17} />, end: true },
    { to: '/lokacija', label: 'Moja Lokacija', icon: <MapPin size={17} />, end: false },
    { to: '/ponuda', label: catConfig.label, icon: catConfig.icon, end: false },
    { to: '/recenzije', label: 'Recenzije', icon: <Star size={17} />, end: false },
  ]

  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <aside className="w-64 bg-emerald-900 text-white flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-emerald-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Map size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Gradačac Mapa</h1>
            <p className="text-xs text-emerald-300">Biznis Panel</p>
          </div>
        </div>
      </div>

      {/* Location name badge */}
      {location && (
        <div className="mx-3 mt-3 px-3 py-2.5 bg-emerald-800 rounded-xl">
          <p className="text-xs text-emerald-400 font-medium">Vaša lokacija</p>
          <p className="text-sm font-semibold text-white mt-0.5 truncate">{location.name}</p>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 mt-2">
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-emerald-600 text-white font-medium' : 'text-emerald-200 hover:bg-emerald-800 hover:text-white'
              }`
            }
          >
            {icon}{label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-emerald-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            {(user?.name || user?.email || 'B')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Biznis'}</p>
            <p className="text-xs text-emerald-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-300 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors"
        >
          <LogOut size={15} />Odjava
        </button>
      </div>
    </aside>
  )
}
