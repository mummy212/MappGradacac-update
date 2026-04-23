import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Zap, TrendingUp, Clock } from 'lucide-react';
import { api, getCatMeta, formatDateShort, getImgSrc } from '../api';
import { Location, CityEvent, NewsItem, Attraction, Offer } from '../types';
import LocationCard from '../components/LocationCard';
import EventCard from '../components/EventCard';
import NewsCard from '../components/NewsCard';
import DownloadBanner from '../components/DownloadBanner';
import LoadingSpinner from '../components/LoadingSpinner';

const CATS = [
  { cat: 'restaurant',   icon: '🍽️', label: 'Restorani',    color: 'bg-red-50   text-red-600   border-red-100' },
  { cat: 'cafe',         icon: '☕',  label: 'Kafići',      color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { cat: 'market',       icon: '🛒', label: 'Marketi',     color: 'bg-green-50 text-green-600 border-green-100' },
  { cat: 'pharmacy',     icon: '💊', label: 'Apoteke',     color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { cat: 'prenociste',   icon: '🏨', label: 'Smještaj',    color: 'bg-blue-50  text-blue-600  border-blue-100' },
  { cat: 'auto_service', icon: '🔧', label: 'Servisi',     color: 'bg-gray-50  text-gray-600  border-gray-200' },
  { cat: 'gas_station',  icon: '⛽', label: 'Benzinske',  color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  { cat: 'parking',      icon: '🅿️', label: 'Parkinzi',   color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
];

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [locs, setLocs] = useState<Location[]>([]);
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.locations(),
      api.events(),
      api.news(),
      api.attractions(),
      api.offers(),
    ]).then(([l, e, n, a, o]) => {
      setLocs(Array.isArray(l) ? l : []);
      setEvents(Array.isArray(e) ? e : []);
      setNews(Array.isArray(n) ? n : []);
      setAttractions(Array.isArray(a) ? a : []);
      setOffers(Array.isArray(o) ? o : []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/lokacije?q=${encodeURIComponent(search)}`);
  };

  const featured = locs.filter(l => l.images && l.images.length > 0).slice(0, 4);
  const upcomingEvents = events.slice(0, 3);
  const latestNews = news.slice(0, 3);
  const activeOffers = offers.filter(o => (o.discount_percent || 0) > 0).slice(0, 3);

  if (loading) return <LoadingSpinner text="Učitavam Gradačac..." />;

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="hero-gradient relative overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="container-city relative z-10 py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center">
            {/* Location pill */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-full px-5 py-2 text-sm font-600 mb-6 border border-white/30">
              <MapPin size={15} className="animate-bounce" />
              Bosna i Hercegovina — Tuzlanski kanton
            </div>

            <h1 className="font-heading font-800 text-white text-4xl md:text-6xl leading-tight mb-4">
              Otkrij <span className="text-yellow-300">Gradačac</span>
            </h1>
            <p className="text-primary-100 text-lg md:text-xl mb-10 leading-relaxed">
              Restorani, eventi, znamenitosti, hitni brojevi<br className="hidden md:block" /> i sve korisne informacije na jednom mjestu.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto mb-10">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Pretraži restorane, hotele, servise..."
                  className="w-full pl-11 pr-4 py-4 rounded-xl text-gray-900 bg-white shadow-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <button type="submit" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-6 py-4 rounded-xl font-heading font-700 transition-colors shadow-xl">
                Traži
              </button>
            </form>

            {/* Stats */}
            <div className="flex justify-center gap-8 text-white">
              {[
                { num: locs.length,        label: 'Lokacija' },
                { num: events.length,      label: 'Događaja' },
                { num: attractions.length, label: 'Znamenitosti' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="font-heading font-700 text-2xl md:text-3xl">{s.num}</div>
                  <div className="text-primary-200 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ===== CATEGORIES ===== */}
      <section className="py-14">
        <div className="container-city">
          <div className="text-center mb-8">
            <h2 className="section-title">Istraži po kategoriji</h2>
            <p className="section-sub">Pronađi tačno ono što ti treba</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {CATS.map(c => (
              <Link key={c.cat} to={`/lokacije?kategorija=${c.cat}`}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-hover ${c.color}`}>
                <span className="text-3xl">{c.icon}</span>
                <span className="font-heading font-600 text-xs text-center leading-tight">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED LOCATIONS ===== */}
      {featured.length > 0 && (
        <section className="py-14 bg-gray-50">
          <div className="container-city">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="section-title">Istaknute lokacije</h2>
                <p className="section-sub">Najpopularniji lokaliteti u Gradačcu</p>
              </div>
              <Link to="/lokacije" className="flex items-center gap-1 text-primary-600 font-600 text-sm hover:underline">
                Sve lokacije <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map(loc => <LocationCard key={loc.id} loc={loc} />)}
            </div>
          </div>
        </section>
      )}

      {/* ===== OFFERS STRIP ===== */}
      {activeOffers.length > 0 && (
        <section className="py-12">
          <div className="container-city">
            <div className="flex items-center gap-2 mb-6">
              <Zap size={20} className="text-amber-500" />
              <h2 className="font-heading font-700 text-xl">Aktivne ponude i popusti</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeOffers.map(offer => (
                <Link key={offer.id} to={`/lokacije/${offer.location_id}`}
                  className="card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
                  <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-heading font-800 text-amber-600">-{offer.discount_percent}%</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-heading font-600 text-sm text-gray-900 line-clamp-1">{offer.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{offer.location_name}</div>
                    {offer.expires_at && (
                      <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Clock size={10} /> Ističe: {new Date(offer.expires_at).toLocaleDateString('bs-BA')}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== EVENTS ===== */}
      {upcomingEvents.length > 0 && (
        <section className="py-14 bg-gray-50">
          <div className="container-city">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="section-title">🎭 Nadolazeći Događaji</h2>
                <p className="section-sub">Ne propusti ništa u Gradačcu</p>
              </div>
              <Link to="/dogadjaji" className="flex items-center gap-1 text-primary-600 font-600 text-sm hover:underline">
                Svi događaji <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {upcomingEvents.map(ev => <EventCard key={ev.id} ev={ev} featured />)}
            </div>
          </div>
        </section>
      )}

      {/* ===== NEWS ===== */}
      {latestNews.length > 0 && (
        <section className="py-14">
          <div className="container-city">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="section-title">📰 Gradske Vijesti</h2>
                <p className="section-sub">Najnovije iz Gradačca</p>
              </div>
              <Link to="/vijesti" className="flex items-center gap-1 text-primary-600 font-600 text-sm hover:underline">
                Sve vijesti <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {latestNews.map(item => <NewsCard key={item.id} item={item} />)}
            </div>
          </div>
        </section>
      )}

      {/* ===== ATTRACTIONS TEASER ===== */}
      {attractions.length > 0 && (
        <section className="py-14 bg-gray-50">
          <div className="container-city">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="section-title">🏛️ Znamenitosti</h2>
                <p className="section-sub">Historija i kultura Gradačca</p>
              </div>
              <Link to="/znamenitosti" className="flex items-center gap-1 text-primary-600 font-600 text-sm hover:underline">
                Sve znamenitosti <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {attractions.slice(0, 3).map(a => (
                <Link key={a.id} to={`/znamenitosti/${a.id}`}
                  className="card group p-6 flex items-start gap-4 hover:-translate-y-1 transition-transform">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🏛️</span>
                  </div>
                  <div>
                    <h3 className="font-heading font-600 text-gray-900 group-hover:text-primary-600 transition-colors">{a.name}</h3>
                    {a.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.description}</p>}
                    {a.category && <span className="badge bg-primary-50 text-primary-700 mt-2 text-xs">{a.category}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== MAP ===== */}
      <section className="py-14">
        <div className="container-city">
          <div className="text-center mb-8">
            <h2 className="section-title">🗺️ Mapa Gradačca</h2>
            <p className="section-sub">Interaktivna karta s localitetima</p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-card border border-gray-100">
            <iframe
              title="Mapa Gradačca"
              src="https://www.openstreetmap.org/export/embed.html?bbox=18.40%2C44.84%2C18.48%2C44.90&amp;layer=mapnik&amp;marker=44.8655%2C18.4315"
              className="w-full"
              style={{ height: '400px', border: 0 }}
              loading="lazy"
            />
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Karta: <a href="https://www.openstreetmap.org" className="underline" target="_blank" rel="noopener">OpenStreetMap</a> kontributori
          </p>
        </div>
      </section>

      {/* ===== DOWNLOAD BANNER ===== */}
      <DownloadBanner />
    </div>
  );
}
