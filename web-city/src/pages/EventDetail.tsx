import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowLeft, Share2 } from 'lucide-react';
import { api, getImgSrc } from '../api';
import { CityEvent } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

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

  useEffect(() => {
    if (!id) return;
    Promise.all([api.events(), api.events()])
      .then(([all]) => {
        const found = Array.isArray(all) ? all.find((e: CityEvent) => e.id === id) : null;
        setEvent(found || null);
        const others = Array.isArray(all)
          ? all.filter((e: CityEvent) => e.id !== id && new Date(e.date) >= new Date()).slice(0, 3)
          : [];
        setOtherEvents(others);
      })
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

  const imgSrc = getImgSrc(event.image);
  const isPast = new Date(event.date) < new Date();

  return (
    <div>
      {/* Hero image or gradient header */}
      {imgSrc ? (
        <div className="relative h-72 md:h-96 overflow-hidden">
          <img src={imgSrc} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 container-city pb-8">
            <Link to="/dogadjaji" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft size={16} /> Svi događaji
            </Link>
            <h1 className="font-heading font-800 text-white text-3xl md:text-4xl leading-tight">{event.title}</h1>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 py-16">
          <div className="container-city">
            <Link to="/dogadjaji" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft size={16} /> Svi događaji
            </Link>
            <h1 className="font-heading font-800 text-white text-3xl md:text-4xl leading-tight">{event.title}</h1>
          </div>
        </div>
      )}

      <div className="container-city py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main content */}
          <div className="lg:col-span-2">
            {imgSrc && (
              <Link to="/dogadjaji" className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 text-sm mb-6 transition-colors">
                <ArrowLeft size={16} /> Svi događaji
              </Link>
            )}

            {isPast && (
              <div className="mb-6 px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-500 border border-gray-200">
                ⏰ Ovaj događaj se već održao.
              </div>
            )}

            {event.description && (
              <div className="prose prose-gray max-w-none text-gray-700 text-base leading-relaxed">
                {event.description.split('\n').map((para, i) => (
                  para.trim() ? <p key={i}>{para}</p> : <br key={i} />
                ))}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button onClick={share}
                className="btn-outline flex items-center gap-2 px-4 py-2">
                <Share2 size={16} /> Podijeli
              </button>
              <Link to="/dogadjaji" className="btn-outline flex items-center gap-2 px-4 py-2">
                <ArrowLeft size={16} /> Natrag
              </Link>
            </div>
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
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
                      <p className="text-xs text-gray-400 mb-0.5">Vrijeme</p>
                      <p className="font-600 text-gray-800 text-sm">{event.time}</p>
                    </div>
                  </div>
                )}

                {(event.location_name || event.location) && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin size={16} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Lokacija</p>
                      <p className="font-600 text-gray-800 text-sm">{event.location_name || event.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar add hint */}
            <div className="card p-4 bg-primary-50 border-primary-100">
              <p className="text-xs text-primary-700 font-medium text-center">
                📅 {isPast ? 'Ovaj događaj je već prošao.' : 'Ne propusti ovaj događaj!'}
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
                const eImg = getImgSrc(e.image);
                return (
                  <Link key={e.id} to={`/dogadjaji/${e.id}`}
                    className="card group flex flex-col overflow-hidden hover:-translate-y-1 transition-transform">
                    {eImg && (
                      <div className="h-32 overflow-hidden">
                        <img src={eImg} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
