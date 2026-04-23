export interface Location {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  category: string;
  images?: string[];
  rating?: number;
  rating_count?: number;
  is_open?: boolean;
  tags?: string[];
  price_level?: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface CityEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  location?: string;
  location_name?: string;
  image?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  image?: string;
}

export interface Attraction {
  id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  images?: string[];
}

export interface Emergency {
  id: string;
  name: string;
  phone: string;
  description?: string;
  category?: string;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  discount_percent?: number;
  location_id: string;
  location_name?: string;
  location_image?: string;
  expires_at?: string;
  type?: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  author?: string;
}
