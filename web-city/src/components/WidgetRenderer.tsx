import { Link } from 'react-router-dom'
import type { Widget } from '../hooks/useWidgets'
import LocationCard from './LocationCard'
import { useEffect, useState } from 'react'

const BASE = import.meta.env.VITE_API_BASE || ''

interface Props {
  widget: Widget
}

function BannerWidget({ widget }: Props) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden relative flex items-center px-8 py-10 my-4"
      style={{ backgroundColor: widget.bg_color || '#7C3AED', color: widget.text_color || '#fff', minHeight: '180px' }}
    >
      {widget.image && (
        <img src={widget.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
      )}
      <div className="relative z-10">
        {widget.title && <h2 className="text-3xl font-bold font-heading mb-2">{widget.title}</h2>}
        {widget.subtitle && <p className="text-lg opacity-90 mb-4">{widget.subtitle}</p>}
        {widget.button_text && widget.button_url && (
          <Link to={widget.button_url}
            className="inline-block bg-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
            style={{ color: widget.bg_color || '#7C3AED' }}>
            {widget.button_text}
          </Link>
        )}
      </div>
    </div>
  )
}

function TextBlockWidget({ widget }: Props) {
  return (
    <div className="card p-8 my-4" style={{ backgroundColor: widget.bg_color || undefined }}>
      {widget.title && <h2 className="text-2xl font-bold font-heading mb-3" style={{ color: widget.text_color || undefined }}>{widget.title}</h2>}
      {widget.subtitle && <p className="text-gray-600 mb-4">{widget.subtitle}</p>}
      {widget.content && (
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: widget.content }}
        />
      )}
      {widget.button_text && widget.button_url && (
        <Link to={widget.button_url} className="btn-primary inline-flex mt-4">{widget.button_text}</Link>
      )}
    </div>
  )
}

function PromoCardWidget({ widget }: Props) {
  return (
    <div
      className="rounded-2xl p-6 my-4 text-center"
      style={{ backgroundColor: widget.bg_color || '#F59E0B', color: widget.text_color || '#fff' }}
    >
      {widget.title && <h3 className="text-xl font-bold mb-1">{widget.title}</h3>}
      {widget.subtitle && <p className="opacity-90 text-sm mb-3">{widget.subtitle}</p>}
      {widget.content && <p className="opacity-80 text-sm mb-4">{widget.content}</p>}
      {widget.button_text && widget.button_url && (
        <a href={widget.button_url}
          className="inline-block bg-white px-5 py-2 rounded-xl font-semibold text-sm"
          style={{ color: widget.bg_color || '#F59E0B' }}>
          {widget.button_text}
        </a>
      )}
    </div>
  )
}

function FeaturedLocationsWidget({ widget }: Props) {
  const [locs, setLocs] = useState<any[]>([])

  useEffect(() => {
    if (!widget.location_ids?.length) return
    fetch(`${BASE}/api/locations`)
      .then(r => r.json())
      .then(all => setLocs(all.filter((l: any) => widget.location_ids?.includes(l.id))))
      .catch(() => {})
  }, [widget.location_ids])

  if (!locs.length) return null

  return (
    <div className="my-6">
      {widget.title && <h2 className="text-2xl font-bold font-heading mb-4">{widget.title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {locs.map(l => <LocationCard key={l.id} loc={l} />)}
      </div>
    </div>
  )
}

function HtmlWidget({ widget }: Props) {
  if (!widget.content) return null
  return (
    <div
      className="my-4"
      dangerouslySetInnerHTML={{ __html: widget.content }}
    />
  )
}

export default function WidgetRenderer({ widget }: Props) {
  switch (widget.widget_type) {
    case 'banner': return <BannerWidget widget={widget} />
    case 'text_block': return <TextBlockWidget widget={widget} />
    case 'promo_card': return <PromoCardWidget widget={widget} />
    case 'featured_locations': return <FeaturedLocationsWidget widget={widget} />
    case 'html_block': return <HtmlWidget widget={widget} />
    default: return null
  }
}
