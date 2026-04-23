import { Link } from 'react-router-dom';
import { Star, MapPin, Phone } from 'lucide-react';
import { Location } from '../types';
import { getImgSrc, getCatMeta } from '../api';

export default function LocationCard({ loc }: { loc: Location }) {
  const meta = getCatMeta(loc.category);
  const img = getImgSrc(loc.images?.[0]);

  return (
    <Link to={`/lokacije/${loc.id}`} className="card group flex flex-col hover:-translate-y-1 transition-transform">
      {/* Image */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {img ? (
          <img src={img} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
            <span className="text-5xl">{meta.icon}</span>
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="badge text-white text-xs" style={{ backgroundColor: meta.color }}>
            {meta.icon} {meta.label}
          </span>
        </div>
        {/* Open badge */}
        <div className="absolute top-3 right-3">
          <span className={`badge text-white text-xs ${
            loc.is_open !== false ? 'bg-emerald-500' : 'bg-red-400'
          }`}>
            {loc.is_open !== false ? 'Otvoreno' : 'Zatvoreno'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-heading font-600 text-gray-900 text-base mb-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
          {loc.name}
        </h3>
        {loc.address && (
          <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
            <MapPin size={12} className="flex-shrink-0" />
            <span className="line-clamp-1">{loc.address}</span>
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-50">
          {loc.avg_rating ? (
            <span className="flex items-center gap-1 text-sm">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-600 text-gray-800">{loc.avg_rating.toFixed(1)}</span>
              {loc.review_count && <span className="text-gray-400 text-xs">({loc.review_count})</span>}
            </span>
          ) : <span />}
          {loc.phone && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Phone size={11} /> {loc.phone}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
