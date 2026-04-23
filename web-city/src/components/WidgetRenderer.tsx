import { Link } from 'react-router-dom'
import type { Widget } from '../hooks/useWidgets'
import LocationCard from './LocationCard'
import { getImgSrc } from '../api'
import { useEffect, useState } from 'react'

interface Props {
  widget: Widget
}

function BannerWidget({ widget }: Props) {
  const imgSrc = widget.image ? getImgSrc(widget.image) : ''
  const hasImg = !!imgSrc

  const BtnEl = widget.button_text && widget.button_url ? (
    widget.button_url.startsWith('http')
      ? <a href={widget.button_url} target="_blank" rel="noopener"
          className="inline-block bg-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ color: widget.bg_color || '#7C3AED' }}>
          {widget.button_text}
        </a>
      : <Link to={widget.button_url}
          className="inline-block bg-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ color: widget.bg_color || '#7C3AED' }}>
          {widget.button_text}
        </Link>
  ) : null

  return (
    <div
      className="w-full rounded-2xl overflow-hidden relative flex items-center px-8 py-12 my-4"
      style={{
        backgroundColor: widget.bg_color || '#7C3AED',
        color: widget.text_color || '#fff',
        minHeight: '200px',
        backgroundImage: hasImg ? `url(${imgSrc})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {hasImg && (
        <div className="absolute inset-0" style={{ backgroundColor: widget.bg_color || '#000000', opacity: 0.55 }} />
      )}
      <div className="relative z-10 max-w-2xl">
        {widget.title && (
          <h2 className="text-3xl font-bold font-heading mb-2" style={{ color: widget.text_color || '#fff' }}>
            {widget.title}
          </h2>
        )}
        {widget.subtitle && (
          <p className="text-lg opacity-90 mb-4" style={{ color: widget.text_color || '#fff' }}>
            {widget.subtitle}
          </p>
        )}
        {BtnEl}
      </div>
    </div>
  )
}

function TextBlockWidget({ widget }: Props) {
  const BtnEl = widget.button_text && widget.button_url ? (
    widget.button_url.startsWith('http')
      ? <a href={widget.button_url} target="_blank" rel="noopener"
          className="btn-primary inline-flex mt-4">{widget.button_text}</a>
      : <Link to={widget.button_url} className="btn-primary inline-flex mt-4">{widget.button_text}</Link>
  ) : null

  return (
    <div className="card p-8 my-4" style={{ backgroundColor: widget.bg_color || undefined }}>
      {widget.title && (
        <h2 className="text-2xl font-bold font-heading mb-3" style={{ color: widget.text_color || undefined }}>
          {widget.title}
        </h2>
      )}
      {widget.subtitle && <p className="text-gray-600 mb-4">{widget.subtitle}</p>}
      {widget.content && (
        <div className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: widget.content }} />
      )}
      {BtnEl}
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
        widget.button_url.startsWith('http')
          ? <a href={widget.button_url} target="_blank" rel="noopener"
              className="inline-block bg-white px-5 py-2 rounded-xl font-semibold text-sm"
              style={{ color: widget.bg_color || '#F59E0B' }}>
              {widget.button_text}
            </a>
          : <Link to={widget.button_url}
              className="inline-block bg-white px-5 py-2 rounded-xl font-semibold text-sm"
              style={{ color: widget.bg_color || '#F59E0B' }}>
              {widget.button_text}
            </Link>
      )}
    </div>
  )
}

function FeaturedLocationsWidget({ widget }: Props) {
  const [locs, setLocs] = useState<any[]>([])

  useEffect(() => {
    if (!widget.location_ids?.length) return
    fetch('/api/locations')
      .then(r => r.json())
      .then(all => setLocs(all.filter((l: any) => widget.location_ids?.includes(l.id))))
      .catch(() => {})
  }, [widget.location_ids])

  if (!locs.length) return null

  return (
    <div className="my-6">
      {widget.title && <h2 className="text-2xl font-bold font-heading mb-2">{widget.title}</h2>}
      {widget.subtitle && <p className="text-gray-600 mb-4">{widget.subtitle}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {locs.map(l => <LocationCard key={l.id} loc={l} />)}
      </div>
    </div>
  )
}

function FeaturedEventsWidget({ widget }: Props) {
  const [evts, setEvts] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(all => {
        const filtered = widget.event_ids?.length
          ? all.filter((e: any) => widget.event_ids?.includes(e.id))
          : all
        setEvts(filtered.slice(0, 3))
      })
      .catch(() => {})
  }, [widget.event_ids])

  if (!evts.length) return null

  return (
    <div className="my-6">
      {widget.title && <h2 className="text-2xl font-bold font-heading mb-2">{widget.title}</h2>}
      {widget.subtitle && <p className="text-gray-600 mb-4">{widget.subtitle}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {evts.map(ev => (
          <Link key={ev.id} to={`/dogadjaji/${ev.id}`}
            className="card p-4 hover:-translate-y-1 transition-transform flex flex-col gap-3">
            {ev.image && (
              <img src={getImgSrc(ev.image)} alt={ev.title || ''}
                className="w-full h-36 object-cover rounded-xl" />
            )}
            <div>
              <div className="font-heading font-600 text-gray-900">{ev.title || ev.name}</div>
              {ev.date && (
                <div className="text-xs text-primary-600 mt-1">
                  📅 {new Date(ev.date).toLocaleDateString('bs-BA')}
                </div>
              )}
              {ev.location && <div className="text-xs text-gray-400 mt-0.5">📍 {ev.location}</div>}
            </div>
          </Link>
        ))}
      </div>
      {widget.button_text && widget.button_url && (
        <div className="mt-4 text-center">
          <Link to={widget.button_url} className="btn-primary inline-flex">{widget.button_text}</Link>
        </div>
      )}
    </div>
  )
}

function StatsBarWidget({ widget }: Props) {
  let items: { icon: string; value: string; label: string }[] = []
  try {
    if (widget.content) items = JSON.parse(widget.content)
  } catch { items = [] }

  if (!items.length) return null

  return (
    <div
      className="rounded-2xl px-8 py-8 my-4"
      style={{ backgroundColor: widget.bg_color || '#F1F5F9' }}
    >
      {widget.title && (
        <h3 className="text-center font-heading font-700 text-xl mb-6"
          style={{ color: widget.text_color || '#1E293B' }}>{widget.title}</h3>
      )}
      <div className="flex flex-wrap justify-center gap-10">
        {items.map((item, idx) => (
          <div key={idx} className="text-center">
            <div className="text-4xl mb-2">{item.icon}</div>
            <div className="font-heading font-800 text-3xl"
              style={{ color: widget.text_color || '#7C3AED' }}>{item.value}</div>
            <div className="text-sm mt-1 opacity-70"
              style={{ color: widget.text_color || '#64748B' }}>{item.label}</div>
          </div>
        ))}
      </div>
      {widget.subtitle && (
        <p className="text-center text-sm mt-4 opacity-60"
          style={{ color: widget.text_color || '#64748B' }}>{widget.subtitle}</p>
      )}
    </div>
  )
}

function HtmlWidget({ widget }: Props) {
  if (!widget.content) return null
  return (
    <div className="my-4" dangerouslySetInnerHTML={{ __html: widget.content }} />
  )
}

export default function WidgetRenderer({ widget }: Props) {
  switch (widget.widget_type) {
    case 'banner':             return <BannerWidget widget={widget} />
    case 'text_block':         return <TextBlockWidget widget={widget} />
    case 'promo_card':         return <PromoCardWidget widget={widget} />
    case 'featured_locations': return <FeaturedLocationsWidget widget={widget} />
    case 'featured_events':    return <FeaturedEventsWidget widget={widget} />
    case 'stats_bar':          return <StatsBarWidget widget={widget} />
    case 'html_block':         return <HtmlWidget widget={widget} />
    default:                   return null
  }
}
