import axios from 'axios';

const BASE = '/api';

export const api = {
  locations: () => axios.get(`${BASE}/locations`).then(r => r.data),
  location: (id: string) => axios.get(`${BASE}/locations/${id}`).then(r => r.data),
  categories: () => axios.get(`${BASE}/categories`).then(r => r.data),
  events: () => axios.get(`${BASE}/events`).then(r => r.data),
  news: () => axios.get(`${BASE}/news`).then(r => r.data),
  offers: () => axios.get(`${BASE}/offers`).then(r => r.data),
  attractions: () => axios.get(`${BASE}/tourism/attractions`).then(r => r.data),
  attraction: (id: string) => axios.get(`${BASE}/tourism/attractions/${id}`).then(r => r.data),
  emergency: () => axios.get(`${BASE}/emergency-contacts`).then(r => r.data),
  settings: () => axios.get(`${BASE}/settings`).then(r => r.data),
};

export const getImgSrc = (img?: string): string => {
  if (!img) return '';
  if (img.startsWith('data:') || img.startsWith('http')) return img;
  return `data:image/jpeg;base64,${img}`;
};

export const CAT_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  restaurant:   { icon: '🍽️', color: '#EF4444', bg: '#FEE2E2', label: 'Restorani' },
  cafe:         { icon: '☕', color: '#F59E0B', bg: '#FEF3C7', label: 'Kafići' },
  market:       { icon: '🛒', color: '#10B981', bg: '#D1FAE5', label: 'Marketi' },
  pharmacy:     { icon: '💊', color: '#10B981', bg: '#DCFCE7', label: 'Apoteke' },
  gas_station:  { icon: '⛽', color: '#F59E0B', bg: '#FEF9C3', label: 'Benzinske' },
  auto_service: { icon: '🔧', color: '#6B7280', bg: '#F3F4F6', label: 'Auto servisi' },
  prenociste:   { icon: '🏨', color: '#3B82F6', bg: '#DBEAFE', label: 'Smještaj' },
  parking:      { icon: '🅿️', color: '#4A90D9', bg: '#EFF6FF', label: 'Parkinzi' },
  attraction:   { icon: '🏛️', color: '#7C3AED', bg: '#EDE9FE', label: 'Znamenitosti' },
  default:      { icon: '📍', color: '#7C3AED', bg: '#EDE9FE', label: 'Ostalo' },
};

export const getCatMeta = (cat?: string) => CAT_META[cat || ''] || CAT_META.default;

export const formatDate = (dt: string, locale = 'bs-BA') => {
  try {
    return new Date(dt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dt; }
};

export const formatDateShort = (dt: string) => {
  try {
    const d = new Date(dt);
    const MONTHS = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
    return { day: d.getDate().toString().padStart(2,'0'), month: MONTHS[d.getMonth()] };
  } catch { return { day: '?', month: '?' }; }
};

export const timeAgo = (dt: string) => {
  const diff = Date.now() - new Date(dt).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Upravo';
  if (h < 24) return `Prije ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Prije ${d}d`;
  return formatDate(dt);
};
