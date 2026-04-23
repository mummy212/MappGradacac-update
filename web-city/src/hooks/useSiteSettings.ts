import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_BASE || ''

export interface SiteSettings {
  primary_color: string
  accent_color: string
  site_title: string
  site_subtitle: string
  hero_title: string
  hero_subtitle: string
  show_offers_section: string
  show_events_section: string
  show_news_section: string
  show_attractions_section: string
  cards_per_row: string
  footer_text: string
  footer_phone: string
  footer_email: string
  facebook_url: string
  instagram_url: string
  youtube_url: string
  tiktok_url: string
  meta_title: string
  meta_description: string
  og_image: string
}

const DEFAULTS: SiteSettings = {
  primary_color: '#7C3AED',
  accent_color: '#F59E0B',
  site_title: 'Gradačac Mapa',
  site_subtitle: 'Digitalni vodič kroz grad',
  hero_title: 'Otkrij Gradačac',
  hero_subtitle: 'Restorani, eventi, znamenitosti, hitni brojevi\ni sve korisne informacije na jednom mjestu.',
  show_offers_section: 'true',
  show_events_section: 'true',
  show_news_section: 'true',
  show_attractions_section: 'true',
  cards_per_row: '4',
  footer_text: 'Sve što trebate znati o Gradačacu na jednom mjestu.',
  footer_phone: '112',
  footer_email: 'info@gradacac-mapa.ba',
  facebook_url: '',
  instagram_url: '',
  youtube_url: '',
  tiktok_url: '',
  meta_title: 'Gradačac Mapa - Digitalni Vodič',
  meta_description: 'Pronađite restorane, markete, servise, znamenitosti i sve informacije o Gradačacu na jednom mjestu.',
  og_image: '',
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE}/api/site-settings`)
      .then(r => r.json())
      .then(data => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Apply CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', settings.primary_color)
    root.style.setProperty('--color-accent', settings.accent_color)
    // Update meta tags
    document.title = settings.meta_title || settings.site_title
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', settings.meta_description)
  }, [settings])

  return { settings, loading }
}
