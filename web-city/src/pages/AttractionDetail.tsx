import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
import { api, getImgSrc } from '../api';
import { Attraction } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AttractionDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.attraction(id).then(d => { setItem(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!item) return (
    <div className="container-city py-20 text-center">
      <h2 className="section-title text-gray-400">Znamenitost nije pronađena</h2>
      <Link to="/znamenitosti" className="btn-primary mt-6">Nazad</Link>
    </div>
  );

  const imgs = (item.images || []).map(getImgSrc).filter(Boolean);

  return (
    <div>
      <div className="border-b border-gray-100 bg-gray-50 py-3">
        <div className="container-city flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary-600">Početna</Link><span>/</span>
          <Link to="/znamenitosti" className="hover:text-primary-600">Znamenitosti</Link><span>/</span>
          <span className="text-gray-900 font-500">{item.name}</span>
        </div>
      </div>
      <div className="container-city py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {imgs.length > 0
              ? <div className="rounded-2xl overflow-hidden h-72 md:h-96 bg-gray-100 mb-8">
                  <img src={imgs[0]} alt={item.name} className="w-full h-full object-cover" />
                </div>
              : <div className="rounded-2xl h-52 bg-primary-50 flex items-center justify-center mb-8">
                  <span className="text-8xl">🏛️</span>
                </div>
            }
            {item.category && <span className="badge bg-primary-100 text-primary-700 mb-4">{item.category}</span>}
            <h1 className="font-heading font-700 text-3xl text-gray-900 mb-4">{item.name}</h1>
            {item.description && (
              <div className="text-gray-600 leading-relaxed space-y-3">
                {item.description.split('\n').map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
              </div>
            )}
            <Link to="/znamenitosti" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mt-8">
              <ArrowLeft size={16} /> Sve znamenitosti
            </Link>
          </div>
          <div className="space-y-5">
            {item.latitude && item.longitude && (
              <>
                <div className="card overflow-hidden">
                  <iframe
                    title={item.name}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${item.longitude-0.015}%2C${item.latitude-0.015}%2C${item.longitude+0.015}%2C${item.latitude+0.015}&layer=mapnik&marker=${item.latitude}%2C${item.longitude}`}
                    className="w-full" style={{ height: '250px', border: 0 }} loading="lazy"
                  />
                </div>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
                  target="_blank" rel="noopener"
                  className="btn-outline w-full justify-center text-sm">
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
