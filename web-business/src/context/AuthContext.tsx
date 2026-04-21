import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null; login: (email: string, password: string) => Promise<void>
  logout: () => void; isLoading: boolean
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('business_token')
    if (token) {
      api.get('/auth/me').then(r => setUser(r.data)).catch(() => localStorage.removeItem('business_token')).finally(() => setIsLoading(false))
    } else { setIsLoading(false) }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    if (!['admin', 'business'].includes(res.data.role)) throw new Error('Pristup odbijen')
    localStorage.setItem('business_token', res.data.token)
    setUser(res.data)
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    localStorage.removeItem('business_token')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
