import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getImgSrc } from '../api';
import { Attraction } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function Attractions() {
  const [items, setItems] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.attractions().then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="py-10">
      <div className="container-city">
        <div className="mb-8">
          <h1 className="section-title">🏛️ Znamenitosti</h1>
          <p className="section-sub">Historija, kultura i turizam Gradačca</p>
        </div>

        {items.length === 0
          ? <EmptyState icon="🏛️" title="Nema znamenitosti" sub="Uskoro će biti dodano" />
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(a => {
                const img = getImgSrc(a.images?.[0]);
                return (
                  <Link key={a.id} to={`/znamenitosti/${a.id}`}
                    className="card group hover:-translate-y-1 transition-transform overflow-hidden">
                    <div className="h-48 bg-primary-50 flex items-center justify-center overflow-hidden">
                      {img
                        ? <img src={img} alt={a.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <span className="text-6xl">🏛️</span>
                      }
                    </div>
                    <div className="p-5">
                      <h3 className="font-heading font-600 text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{a.name}</h3>
                      {a.description && <p className="text-sm text-gray-500 line-clamp-3">{a.description}</p>}
                      {a.category && <span className="badge bg-primary-50 text-primary-700 mt-3 text-xs">{a.category}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}
