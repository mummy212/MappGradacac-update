import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft, Share2, ChevronLeft, ChevronRight, Tag, Users, Globe, Ticket } from 'lucide-react';
import { api, getImgSrc } from '../api';
import { CityEvent } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import SEOHead from '../components/SEOHead';

function formatFullDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const days = ['Nedjelja','Ponedjeljak','Utorak','Srijeda','Četvrtak','Petak','Subota'];
    const months = ['januar','februar','mart','april','maj','juni','juli','august','septembar','oktobar','novembar','decembar'];
    return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}.`;
  } catch { return dateStr; }
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<CityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [otherEvents, setOtherEvents] = useState<CityEvent[]>([]);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.event(id), api.events()])
      .then(([ev, all]) => {
        setEvent(ev);
        const others = Array.isArray(all)
          ? all.filter((e: CityEvent) => e.id !== id).slice(0, 3)
          : [];
        setOtherEvents(others);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const share = () => {
    if (navigator.share && event) {
      navigator.share({ title: event.title, url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Link kopiran!');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!event) return (
    <div className="container-city py-20 text-center">
      <p className="text-gray-400 text-xl">Događaj nije pronađen.</p>
      <Link to="/dogadjaji" className="btn-primary mt-4 inline-flex">← Svi događaji</Link>
    </div>
  );

  const ev = event as any;
  // Build images array: prefer images[], fallback to single image
  const imgs: string[] = [...(ev.images || []), ...(ev.image && !(ev.images?.length) ? [ev.image] : [])]
    .map(getImgSrc).filter(Boolean);
  const isPast = new Date(event.date) < new Date();
  const hasContent = ev.content_html && ev.content_html.trim().length > 10;
  const locationLabel = event.location_name || event.location;
  const eventDesc = ev.short_description || event.description || `Događaj u Gradačcu: ${event.title}`;

  return (
    <div>
      <SEOHead
        title={event.title}
        description={eventDesc}
        canonical={`/dogadjaji/${event.id}`}
        ogImage={imgs[0] || undefined}
        ogType="event"
        breadcrumbs={[{ name: 'Događaji', url: '/dogadjaji' }, { name: event.title, url: `/dogadjaji/${event.id}` }]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.title,
          description: eventDesc,
          startDate: event.date + (event.time ? 'T' + event.time : ''),
          location: { '@type': 'Place', name: locationLabel || 'Gradačac', address: { '@type': 'PostalAddress', addressLocality: 'Gradačac', addressCountry: 'BA' } },
          image: imgs,
          organizer: ev.organizer ? { '@type': 'Organization', name: ev.organizer } : undefined,
          offers: ev.ticket_price ? { '@type': 'Offer', name: ev.ticket_price, url: ev.ticket_url || undefined } : undefined,
          eventStatus: isPast ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
        }}
      />

      {/* Hero - big image or gradient */}
      {imgs.length > 0 ? (
        <div className="relative h-72 md:h-[420px] overflow-hidden">
          <img src={imgs[activeImg]} alt={event.title} className="w-full h-full object-cover transition-opacity duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          {/* Nav arrows on hero */}
          {imgs.length > 1 && (
            <>
              <button onClick={() => setActiveImg(i => (i - 1 + imgs.length) % imgs.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
                <ChevronLeft size={22} />
              </button>
              <button onClick={() => setActiveImg(i => (i + 1) % imgs.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
                <ChevronRight size={22} />
              </button>
              <span className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">{activeImg + 1}/{imgs.length}</span>
            </>
          )}
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 container-city pb-8 pt-4">
            <Link to="/dogadjaji" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-3 transition-colors">
              <ArrowLeft size={16} /> Svi događaji
            </Link>
            <h1 className="font-heading font-800 text-white text-3xl md:text-4xl leading-tight">{event.title}</h1>
            {ev.short_description && (
              <p className="text-white/80 mt-2 text-base max-w-2xl">{ev.short_description}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 py-14">
          <div className="container-city">
            <Link to="/dogadjaji" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-3 transition-colors">
              <ArrowLeft size={16} /> Svi događaji
            </Link>
            <h1 className="font-heading font-800 text-white text-3xl md:text-4xl leading-tight">{event.title}</h1>
            {ev.short_description && <p className="text-white/80 mt-2 text-base">{ev.short_description}</p>}
          </div>
        </div>
      )}

      <div className="container-city py-10">
        {/* Thumbnail strip for multiple images */}
        {imgs.length > 1 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {imgs.map((img, idx) => (
              <button key={idx} onClick={() => setActiveImg(idx)}
                className={`flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                  idx === activeImg ? 'border-primary-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ===== LEFT: Main content ===== */}
          <div className="lg:col-span-2">
            {/* Back link (no image case) */}
            {imgs.length === 0 && (
              <Link to="/dogadjaji" className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 text-sm mb-6 transition-colors">
                <ArrowLeft size={16} /> Svi događaji
              </Link>
            )}

            {isPast && (
              <div className="mb-6 px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-500 border border-gray-200">
                ⏰ Ovaj događaj se već održao.
              </div>
            )}

            {/* Rich HTML content */}
            {hasContent ? (
              <div
                className="prose prose-base max-w-none text-gray-700 leading-relaxed
                  [&_h2]:font-heading [&_h2]:font-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-gray-900
                  [&_h3]:font-heading [&_h3]:font-600 [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-gray-800
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                  [&_a]:text-primary-600 [&_a]:underline
                  [&_strong]:font-700 [&_strong]:text-gray-900
                  [&_p]:mb-4"
                dangerouslySetInnerHTML={{ __html: ev.content_html }}
              />
            ) : event.description ? (
              <div className="text-gray-600 leading-relaxed space-y-3">
                {event.description.split('\n').map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="mt-10 flex flex-wrap gap-3">
              {ev.ticket_url && (
                <a href={ev.ticket_url} target="_blank" rel="noopener"
                  className="btn-primary flex items-center gap-2">
                  <Ticket size={16} /> Kupi kartu
                </a>
              )}
              <button onClick={share} className="btn-outline flex items-center gap-2">
                <Share2 size={16} /> Podijeli
              </button>
              <Link to="/dogadjaji" className="btn-outline flex items-center gap-2">
                <ArrowLeft size={16} /> Natrag
              </Link>
            </div>
          </div>

          {/* ===== RIGHT: Sidebar ===== */}
          <div className="space-y-5">

            {/* Date/time/location card */}
            <div className="card p-5">
              <h3 className="font-heading font-700 text-gray-900 mb-4">Detalji događaja</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar size={16} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Datum</p>
                    <p className="font-600 text-gray-800 text-sm capitalize">{formatFullDate(event.date)}</p>
                  </div>
                </div>
                {event.time && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Početak</p>
                      <p className="font-600 text-gray-800 text-sm">{event.time}</p>
                    </div>
                  </div>
                )}
                {locationLabel && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin size={16} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Lokacija</p>
                      <p className="font-600 text-gray-800 text-sm">{locationLabel}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Extra info card */}
            {(ev.ticket_price || ev.organizer || ev.website) && (
              <div className="card p-5 space-y-3">
                {ev.ticket_price && (
                  <div className="flex items-start gap-3">
                    <Tag size={15} className="text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Ulaz / Karta</p>
                      <p className="text-sm text-gray-800 font-medium">{ev.ticket_price}</p>
                    </div>
                  </div>
                )}
                {ev.organizer && (
                  <div className="flex items-start gap-3">
                    <Users size={15} className="text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Organizator</p>
                      <p className="text-sm text-gray-800">{ev.organizer}</p>
                    </div>
                  </div>
                )}
                {ev.website && (
                  <div className="flex items-start gap-3">
                    <Globe size={15} className="text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Web stranica</p>
                      <a href={ev.website} target="_blank" rel="noopener"
                        className="text-sm text-primary-600 hover:underline break-all">
                        {ev.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Not-to-miss card */}
            <div className={`card p-4 ${isPast ? 'bg-gray-50' : 'bg-primary-50 border-primary-100'}`}>
              <p className={`text-xs font-medium text-center ${isPast ? 'text-gray-400' : 'text-primary-700'}`}>
                {isPast ? '⏰ Ovaj događaj je već prošao.' : '📅 Ne propusti ovaj događaj!'}
              </p>
            </div>
          </div>
        </div>

        {/* Other upcoming events */}
        {otherEvents.length > 0 && (
          <div className="mt-16">
            <h2 className="font-heading font-700 text-xl text-gray-900 mb-6">Ostali nadolazeći događaji</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {otherEvents.map(e => {
                const eEv = e as any;
                const eImgs: string[] = eEv.images || [];
                const eImg = eImgs[0] ? getImgSrc(eImgs[0]) : (e.image ? getImgSrc(e.image) : '');
                return (
                  <Link key={e.id} to={`/dogadjaji/${e.id}`}
                    className="card group flex flex-col overflow-hidden hover:-translate-y-1 transition-transform">
                    {eImg ? (
                      <div className="h-36 overflow-hidden">
                        <img src={eImg} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="h-20 bg-primary-50 flex items-center justify-center">
                        <Calendar size={28} className="text-primary-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-xs text-primary-600 font-600 mb-1">
                        {new Date(e.date).toLocaleDateString('bs-BA', { day: 'numeric', month: 'long' })}
                      </p>
                      <h3 className="font-heading font-600 text-gray-900 text-sm line-clamp-2 group-hover:text-primary-600 transition-colors">{e.title}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
