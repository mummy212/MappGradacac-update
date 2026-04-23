import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, MapPin, Tag, Calendar,
  Bell, Users, Star, Settings, LogOut, Map, Phone, Newspaper, Layout, Globe
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/locations', label: 'Lokacije', icon: MapPin, end: false },
  { to: '/categories', label: 'Kategorije', icon: Tag, end: false },
  { to: '/events', label: 'Događaji', icon: Calendar, end: false },
  { to: '/attractions', label: 'Atrakcije', icon: Star, end: false },
  { to: '/news', label: 'Vijesti', icon: Newspaper, end: false },
  { to: '/emergency-contacts', label: 'Hitni Brojevi', icon: Phone, end: false },
  { to: '/business-accounts', label: 'Biznis Nalozi', icon: Users, end: false },
  { to: '/notifications', label: 'Obavještenja', icon: Bell, end: false },
]

const cmsItems = [
  { to: '/widgets', label: 'Moduli / Pozicije', icon: Layout, end: false },
  { to: '/site-settings', label: 'Podešavanja Sajta', icon: Globe, end: false },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Map size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Gradačac Mapa</h1>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        <div className="pt-3 pb-1 px-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Web CMS</p>
        </div>
        {cmsItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            {(user?.name || user?.email || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut size={15} />
          Odjava
        </button>
      </div>
    </aside>
  )
}
