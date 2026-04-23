export interface Location {
  id: string
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  phone?: string
  description?: string
  working_hours?: string
  is_premium: boolean
  images: string[]
  service_tags: string[]
  price_level: number
  avg_rating: number
  review_count: number
  views: number
  nav_clicks: number
  call_clicks: number
  is_open?: boolean
  total_spots?: number
  is_free_parking?: boolean
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
}

export interface Event {
  id: string
  title: string
  description: string
  location_name: string
  date: string
  time?: string
  location_id?: string
  image?: string
}

export interface Attraction {
  id: string
  name: string
  description: string
  content_html?: string
  short_description?: string
  latitude: number
  longitude: number
  category: string
  images?: string[]
  website?: string
  working_hours?: string
  admission_price?: string
  phone?: string
}

export interface BusinessAccount {
  id: string
  email: string
  name: string
  location_id: string
  location_name: string
  created_at: string
}

export interface Notification {
  id: string
  title: string
  body: string
  total_devices: number
  successful: number
  failed: number
  created_at: string
}

export interface Review {
  id: string
  location_id: string
  author_name: string
  stars: number
  comment?: string
  created_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface AppSettings {
  id: string
  paypal_link: string
  contact_email: string
}
