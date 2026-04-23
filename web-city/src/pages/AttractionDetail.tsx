import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Navigation, Clock, Tag, Phone, Globe, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { api, getImgSrc } from '../api';
import { Attraction } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import SEOHead from '../components/SEOHead';

export default function AttractionDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.attraction(id)
      .then(d => { setItem(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!item) return (
    <div className="container-city py-20 text-center">
      <h2 className="section-title text-gray-400">Znamenitost nije pronađena</h2>
      <Link to="/znamenitosti" className="btn-primary mt-6">Nazad</Link>
    </div>
  );

  const imgs = (item.images || []).map(getImgSrc).filter(Boolean);
  const hasContent = item.content_html && item.content_html.trim().length > 10;
  const attrDesc = item.description || `Znamenitost ${item.name} u Gradačcu.`;

  return (
    <div>
      <SEOHead
        title={`${item.name} — Znamenitost Gradačca`}
        description={attrDesc}
        canonical={`/znamenitosti/${item.id}`}
        ogImage={imgs[0] || undefined}
        breadcrumbs={[{ name: 'Znamenitosti', url: '/znamenitosti' }, { name: item.name, url: `/znamenitosti/${item.id}` }]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'TouristAttraction',
          name: item.name,
          description: attrDesc,
          image: imgs,
          address: { '@type': 'PostalAddress', addressLocality: 'Gradačac', addressCountry: 'BA' },
          geo: item.latitude ? { '@type': 'GeoCoordinates', latitude: item.latitude, longitude: item.longitude } : undefined,
          touristType: item.category,
        }}
      />
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50 py-3">
        <div className="container-city flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary-600">Početna</Link><span>/</span>
          <Link to="/znamenitosti" className="hover:text-primary-600">Znamenitosti</Link><span>/</span>
          <span className="text-gray-900 font-500">{item.name}</span>
        </div>
      </div>

      <div className="container-city py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ===== LEFT: Main Content ===== */}
          <div className="lg:col-span-2">

            {/* Image Gallery */}
            {imgs.length > 0 ? (
              <div className="mb-8">
                {/* Main image */}
                <div className="rounded-2xl overflow-hidden bg-gray-100 relative" style={{ height: '420px' }}>
                  <img
                    src={imgs[activeImg]}
                    alt={item.name}
                    className="w-full h-full object-cover transition-opacity duration-300"
                  />
                  {/* Navigation arrows */}
                  {imgs.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImg(i => (i - 1 + imgs.length) % imgs.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={() => setActiveImg(i => (i + 1) % imgs.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                        {activeImg + 1} / {imgs.length}
                      </span>
                    </>
                  )}
                </div>
                {/* Thumbnails */}
                {imgs.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {imgs.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImg(idx)}
                        className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                          idx === activeImg ? 'border-primary-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl h-56 bg-primary-50 flex items-center justify-center mb-8">
                <span className="text-8xl">🏛️</span>
              </div>
            )}

            {/* Category & Title */}
            {item.category && (
              <span className="badge bg-primary-100 text-primary-700 mb-4">{item.category}</span>
            )}
            <h1 className="font-heading font-700 text-3xl text-gray-900 mb-3">{item.name}</h1>

            {/* Short description (lead text) */}
            {item.short_description && (
              <p className="text-lg text-gray-600 leading-relaxed mb-6 border-l-4 border-primary-300 pl-4">
                {item.short_description}
              </p>
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
                dangerouslySetInnerHTML={{ __html: item.content_html || '' }}
              />
            ) : item.description ? (
              <div className="text-gray-600 leading-relaxed space-y-3">
                {item.description.split('\n').map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
              </div>
            ) : null}

            <Link to="/znamenitosti" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mt-10">
              <ArrowLeft size={16} /> Sve znamenitosti
            </Link>
          </div>

          {/* ===== RIGHT: Sidebar ===== */}
          <div className="space-y-5">

            {/* Info card */}
            {(item.working_hours || item.admission_price || item.phone || item.website) && (
              <div className="card p-5 space-y-4">
                <h3 className="font-heading font-600 text-gray-900 text-base">Informacije</h3>
                {item.working_hours && (
                  <div className="flex items-start gap-3">
                    <Clock size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Radno Vrijeme</p>
                      <p className="text-sm text-gray-800">{item.working_hours}</p>
                    </div>
                  </div>
                )}
                {item.admission_price && (
                  <div className="flex items-start gap-3">
                    <Tag size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Ulaz</p>
                      <p className="text-sm text-gray-800">{item.admission_price}</p>
                    </div>
                  </div>
                )}
                {item.phone && (
                  <div className="flex items-start gap-3">
                    <Phone size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Telefon</p>
                      <a href={`tel:${item.phone}`} className="text-sm text-primary-600 hover:underline">{item.phone}</a>
                    </div>
                  </div>
                )}
                {item.website && (
                  <div className="flex items-start gap-3">
                    <Globe size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Web stranica</p>
                      <a href={item.website} target="_blank" rel="noopener" className="text-sm text-primary-600 hover:underline break-all">
                        {item.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            {item.latitude && item.longitude && (
              <>
                <div className="card overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                    <MapPin size={14} className="text-primary-500" />
                    <span className="text-xs font-semibold text-gray-600">Lokacija na mapi</span>
                  </div>
                  <iframe
                    title={item.name}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${item.longitude-0.015}%2C${item.latitude-0.015}%2C${item.longitude+0.015}%2C${item.latitude+0.015}&layer=mapnik&marker=${item.latitude}%2C${item.longitude}`}
                    className="w-full" style={{ height: '240px', border: 0 }} loading="lazy"
                  />
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
                  target="_blank" rel="noopener"
                  className="btn-outline w-full justify-center text-sm"
                >
                  <Navigation size={16} /> Navigiraj do lokacije
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
