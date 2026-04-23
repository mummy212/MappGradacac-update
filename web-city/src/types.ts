export interface Location {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  category: string;
  images?: string[];
  avg_rating?: number;
  review_count?: number;
  is_open?: boolean;
  service_tags?: string[];
  price_level?: number;
  working_hours?: string;
  is_premium?: boolean;
  total_spots?: number;
  is_free_parking?: boolean;
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
  short_description?: string;
  content_html?: string;
  date: string;
  time?: string;
  location?: string;
  location_name?: string;
  image?: string;
  images?: string[];
  ticket_price?: string;
  organizer?: string;
  website?: string;
  ticket_url?: string;
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
  content_html?: string;
  short_description?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  images?: string[];
  website?: string;
  working_hours?: string;
  admission_price?: string;
  phone?: string;
}

export interface Emergency {
  id: string;
  section: string;
  section_emoji?: string;
  name: string;
  number: string;
  icon?: string;
  color?: string;
  bg?: string;
  note?: string;
  order?: number;
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
  stars: number;
  comment?: string;
  created_at: string;
  author_name?: string;
}
