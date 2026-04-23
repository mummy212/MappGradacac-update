import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Tag } from 'lucide-react';
import { api, getImgSrc } from '../api';
import { Attraction } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const CAT_COLORS: Record<string, string> = {
  Historija: '#8B5CF6', Priroda: '#10B981', Kultura: '#3B82F6',
  Religija: '#F59E0B', Sport: '#EF4444', Gastronomija: '#F97316', Ostalo: '#6B7280'
};

export default function Attractions() {
  const [items, setItems] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.attractions().then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))] as string[];
  const filtered = filter ? items.filter(i => i.category === filter) : items;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="py-10">
      <div className="container-city">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title">🏛️ Znamenitosti</h1>
          <p className="section-sub">Historija, kultura i turizam Gradačca</p>
        </div>

        {/* Category filter tabs */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setFilter('')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === '' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sve
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setFilter(c === filter ? '' : c)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === c ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={filter === c ? { backgroundColor: CAT_COLORS[c] || '#6B7280' } : {}}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0
          ? <EmptyState icon="🏛️" title="Nema znamenitosti" sub="Uskoro će biti dodano" />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(a => {
                const img = getImgSrc(a.images?.[0]);
                const col = CAT_COLORS[a.category || ''] || '#6B7280';
                const desc = a.short_description || a.description || '';
                return (
                  <Link key={a.id} to={`/znamenitosti/${a.id}`}
                    className="card group hover:-translate-y-1 transition-transform overflow-hidden">
                    {/* Image */}
                    <div className="h-52 bg-primary-50 flex items-center justify-center overflow-hidden relative">
                      {img
                        ? <img src={img} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <span className="text-7xl">🏛️</span>
                      }
                      {/* Category badge */}
                      <span
                        className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur-sm"
                        style={{ backgroundColor: col + 'dd', color: '#fff' }}
                      >
                        {a.category}
                      </span>
                      {/* Multi-image indicator */}
                      {(a.images?.length || 0) > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                          📷 {a.images!.length}
                        </span>
                      )}
                    </div>
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-heading font-600 text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {a.name}
                      </h3>
                      {desc && <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">{desc}</p>}
                      {/* Extra info */}
                      <div className="flex items-center gap-3 mt-3">
                        {a.admission_price && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Tag size={11} /> {a.admission_price}
                          </span>
                        )}
                        {a.working_hours && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={11} /> {a.working_hours.split(',')[0].split('\n')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}
