import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Star, Clock, Navigation, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { api, getImgSrc, getCatMeta, formatDate } from '../api';
import { Location, Offer, Review } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const [loc, setLoc] = useState<Location & { reviews?: Review[]; offers?: Offer[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.location(id).then(d => { setLoc(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!loc) return (
    <div className="container-city py-20 text-center">
      <h2 className="section-title text-gray-400">Lokacija nije pronađena</h2>
      <Link to="/lokacije" className="btn-primary mt-6">Nazad na lokacije</Link>
    </div>
  );

  const meta = getCatMeta(loc.category);
  const images = (loc.images || []).map(getImgSrc).filter(Boolean);
  const reviews: Review[] = (loc as any).reviews || [];
  const offers: Offer[] = (loc as any).offers || [];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50 py-3">
        <div className="container-city flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary-600">Početna</Link>
          <span>/</span>
          <Link to="/lokacije" className="hover:text-primary-600">Lokacije</Link>
          <span>/</span>
          <span className="text-gray-900 font-500">{loc.name}</span>
        </div>
      </div>

      <div className="container-city py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left - main content */}
          <div className="lg:col-span-2">
            {/* Image gallery */}
            {images.length > 0 ? (
              <div className="relative rounded-2xl overflow-hidden h-72 md:h-96 bg-gray-100 mb-8">
                <img src={images[imgIdx]} alt={loc.name} className="w-full h-full object-cover" />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button key={i} onClick={() => setImgIdx(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${ i === imgIdx ? 'bg-white' : 'bg-white/50' }`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-2xl h-52 flex items-center justify-center mb-8" style={{ backgroundColor: meta.bg }}>
                <span className="text-8xl">{meta.icon}</span>
              </div>
            )}

            {/* Title + Rating */}
            <div className="flex flex-wrap items-start gap-3 mb-4">
              <span className="badge text-white" style={{ backgroundColor: meta.color }}>{meta.icon} {meta.label}</span>
              <span className={`badge ${ loc.is_open !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600' }`}>
                {loc.is_open !== false ? '✔ Otvoreno' : '✕ Zatvoreno'}
              </span>
            </div>
            <h1 className="font-heading font-700 text-gray-900 text-3xl mb-2">{loc.name}</h1>
            {loc.avg_rating ? (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={18} className={s <= Math.round(loc.avg_rating!) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                </div>
                <span className="font-600 text-gray-800">{loc.avg_rating.toFixed(1)}</span>
                {loc.review_count && <span className="text-gray-400 text-sm">({loc.review_count} recenzija)</span>}
              </div>
            ) : null}
            {loc.description && (
              <p className="text-gray-600 leading-relaxed mb-6 text-base">{loc.description}</p>
            )}

            {/* Offers */}
            {offers.length > 0 && (
              <div className="mb-8">
                <h2 className="font-heading font-600 text-lg mb-3 flex items-center gap-2">
                  🎯 Aktivne ponude
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {offers.map(o => (
                    <div key={o.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="font-heading font-600 text-amber-900 text-sm">{o.title}</div>
                      {o.description && <div className="text-xs text-amber-700 mt-1">{o.description}</div>}
                      {o.discount_percent && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-amber-400 text-white text-xs font-700 px-2.5 py-1 rounded-full">
                          -{o.discount_percent}% popust
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="font-heading font-600 text-lg mb-4 flex items-center gap-2">
                <MessageCircle size={20} className="text-primary-600" /> Recenzije korisnika
              </h2>
              {reviews.length === 0
                ? <p className="text-gray-400 text-sm">Nema recenzija za ovu lokaciju.</p>
                : reviews.map((r, i) => (
                    <div key={i} className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} size={14} className={s<=r.stars?'text-amber-400 fill-amber-400':'text-gray-200 fill-gray-200'} />)}</div>
                        {r.author_name && <span className="font-600 text-sm text-gray-700">{r.author_name}</span>}
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(r.created_at)}</span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Contact card */}
            <div className="card p-6 space-y-4">
              <h3 className="font-heading font-600 text-base">Kontakt i info</h3>
              {loc.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin size={16} className="text-primary-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{loc.address}</span>
                </div>
              )}
              {loc.phone && (
                <a href={`tel:${loc.phone}`} className="flex items-center gap-3 text-sm hover:text-primary-600 transition-colors">
                  <Phone size={16} className="text-primary-600 flex-shrink-0" />
                  <span className="font-medium">{loc.phone}</span>
                </a>
              )}
              {loc.price_level !== undefined && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-lg">💰</span>
                  <span className="text-gray-600">{'KM'.repeat(loc.price_level || 1)}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                {loc.phone && (
                  <a href={`tel:${loc.phone}`}
                    className="btn-primary w-full justify-center text-sm py-3">
                    <Phone size={16} /> Pozovi
                  </a>
                )}
                {loc.latitude && loc.longitude && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                    target="_blank" rel="noopener"
                    className="btn-outline w-full justify-center text-sm py-3">
                    <Navigation size={16} /> Navigiraj
                  </a>
                )}
              </div>
            </div>

            {/* Map mini */}
            {loc.latitude && loc.longitude && (
              <div className="card overflow-hidden">
                <iframe
                  title={`Mapa - ${loc.name}`}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.longitude-0.01}%2C${loc.latitude-0.01}%2C${loc.longitude+0.01}%2C${loc.latitude+0.01}&layer=mapnik&marker=${loc.latitude}%2C${loc.longitude}`}
                  className="w-full"
                  style={{ height: '220px', border: 0 }}
                  loading="lazy"
                />
              </div>
            )}

            {/* Tags */}
            {loc.service_tags && loc.service_tags.length > 0 && (
              <div className="card p-5">
                <h4 className="font-heading font-600 text-sm mb-3">Tagovi</h4>
                <div className="flex flex-wrap gap-2">
                  {loc.service_tags.map(tag => (
                    <Link key={tag} to={`/lokacije?q=${tag}`}
                      className="badge bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors text-xs">{tag}</Link>
                  ))}
                </div>
              </div>
            )}

            <Link to="/lokacije" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors">
              <ArrowLeft size={16} /> Nazad na sve lokacije
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
