import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_BASE || ''

export interface Widget {
  id: string
  position: string
  widget_type: string
  title?: string
  subtitle?: string
  content?: string
  image?: string
  button_text?: string
  button_url?: string
  bg_color?: string
  text_color?: string
  location_ids?: string[]
  is_active: boolean
  order: number
}

export function useWidgets(position: string) {
  const [widgets, setWidgets] = useState<Widget[]>([])

  useEffect(() => {
    fetch(`${BASE}/api/cms/widgets?position=${position}`)
      .then(r => r.json())
      .then(data => setWidgets(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [position])

  return widgets
}
