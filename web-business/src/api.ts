import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('business_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('business_token')
      window.location.href = import.meta.env.BASE_URL + 'login'
    }
    return Promise.reject(error)
  }
)
