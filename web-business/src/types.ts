export interface User {
  id: string; email: string; name: string; role: string; location_id?: string
}

export interface Location {
  id: string; name: string; category: string; address: string
  latitude: number; longitude: number; phone?: string; description?: string
  working_hours?: string; is_premium: boolean; images: string[]
  service_tags: string[]; price_level: number
  avg_rating: number; review_count: number; views: number
  nav_clicks: number; call_clicks: number
  total_spots?: number; is_free_parking?: boolean
}

export interface Offer {
  id: string; location_id: string; title: string; description: string
  discount_percent?: number; expires_at?: string; is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string; location_id: string; name: string; price: number
  description?: string; category: string; image?: string; created_at: string
}

export interface Review {
  id: string; location_id: string; author_name: string
  stars: number; comment?: string; created_at: string
}

export interface BusinessStats {
  daily: { date: string; views: number }[]
  totals: { views: number; nav_clicks: number; call_clicks: number }
}
