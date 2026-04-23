import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Grid3X3, List } from 'lucide-react';
import { api, getCatMeta } from '../api';
import { Location } from '../types';
import LocationCard from '../components/LocationCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const CATS_FILTER = [
  { value: '',            label: 'Sve kategorije' },
  { value: 'restaurant',  label: '🍽️ Restorani' },
  { value: 'cafe',        label: '☕ Kafići' },
  { value: 'market',      label: '🛒 Marketi' },
  { value: 'pharmacy',    label: '💊 Apoteke' },
  { value: 'prenociste',  label: '🏨 Smještaj' },
  { value: 'auto_service',label: '🔧 Auto servisi' },
  { value: 'gas_station', label: '⛽ Benzinske' },
  { value: 'parking',     label: '🅿️ Parkinzi' },
];

export default function Locations() {
  const [params, setParams] = useSearchParams();
  const [locs, setLocs] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [search, setSearch] = useState(params.get('q') || '');
  const [cat, setCat] = useState(params.get('kategorija') || '');
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    api.locations().then(d => { setLocs(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return locs.filter(l => {
      if (cat && l.category !== cat) return false;
      if (openOnly && l.is_open === false) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          (l.description || '').toLowerCase().includes(q) ||
          (l.address || '').toLowerCase().includes(q) ||
          (l.service_tags || []).some((t: string) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [locs, cat, search, openOnly]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="py-10">
      <div className="container-city">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="section-title">📍 Sve lokacije</h1>
          <p className="section-sub">{filtered.length} lokacija pronađeno</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Pretraži lokacije..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              />
            </div>

            {/* Category select */}
            <select
              value={cat} onChange={e => setCat(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              {CATS_FILTER.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>

            {/* Open toggle */}
            <label className="flex items-center gap-2 cursor-pointer px-4 py-3 rounded-xl border border-gray-200 text-sm">
              <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} className="accent-primary-600" />
              Samo otvoreno
            </label>

            {/* View toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-colors ${ view==='grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700' }`}><Grid3X3 size={18} /></button>
              <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${ view==='list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700' }`}><List size={18} /></button>
            </div>
          </div>

          {/* Active filters */}
          {(cat || search || openOnly) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {cat && <span className="badge bg-primary-100 text-primary-700">{CATS_FILTER.find(c=>c.value===cat)?.label} <button onClick={()=>setCat('')} className="ml-1"><X size={10}/></button></span>}
              {search && <span className="badge bg-primary-100 text-primary-700">"{search}" <button onClick={()=>setSearch('')} className="ml-1"><X size={10}/></button></span>}
              {openOnly && <span className="badge bg-green-100 text-green-700">Samo otvoreno <button onClick={()=>setOpenOnly(false)} className="ml-1"><X size={10}/></button></span>}
            </div>
          )}
        </div>

        {/* Grid/List */}
        {filtered.length === 0
          ? <EmptyState icon="📍" title="Nema lokacija" sub="Pokušaj sa drugim filterima ili pretragom" />
          : view === 'grid'
            ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(loc => <LocationCard key={loc.id} loc={loc} />)}
              </div>
            : <div className="flex flex-col gap-3">
                {filtered.map(loc => {
                  const meta = getCatMeta(loc.category);
                  return (
                    <Link key={loc.id} to={`/lokacije/${loc.id}`}
                      className="card flex items-center gap-4 p-4 hover:-translate-y-0.5 transition-transform">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ backgroundColor: meta.bg }}>{meta.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-600 text-gray-900 line-clamp-1">{loc.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{loc.address || meta.label}</div>
                      </div>
                      <span className={`badge text-xs ${ loc.is_open !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600' }`}>
                        {loc.is_open !== false ? 'Otvoreno' : 'Zatvoreno'}
                      </span>
                    </Link>
                  );
                })}
              </div>
        }
      </div>
    </div>
  );
}
