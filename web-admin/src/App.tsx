import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Locations from './pages/Locations'
import Categories from './pages/Categories'
import Events from './pages/Events'
import Notifications from './pages/Notifications'
import BusinessAccounts from './pages/BusinessAccounts'
import Attractions from './pages/Attractions'
import SiteSettings from './pages/SiteSettings'
import Widgets from './pages/Widgets'
import EmergencyContacts from './pages/EmergencyContacts'
import News from './pages/News'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400">Učitavanje...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="locations" element={<Locations />} />
        <Route path="categories" element={<Categories />} />
        <Route path="events" element={<Events />} />
        <Route path="attractions" element={<Attractions />} />
        <Route path="business-accounts" element={<BusinessAccounts />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="news" element={<News />} />
        <Route path="emergency-contacts" element={<EmergencyContacts />} />
        <Route path="widgets" element={<Widgets />} />
        <Route path="site-settings" element={<SiteSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={basename}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
