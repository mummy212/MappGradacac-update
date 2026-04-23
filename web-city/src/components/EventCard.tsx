import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { CityEvent } from '../types';
import { formatDateShort, getImgSrc } from '../api';

export default function EventCard({ ev, featured = false }: { ev: CityEvent; featured?: boolean }) {
  const { day, month } = formatDateShort(ev.date);
  const isToday = new Date(ev.date).toDateString() === new Date().toDateString();
  const imgSrc = getImgSrc(ev.image);

  if (featured) {
    return (
      <Link to={`/dogadjaji/${ev.id}`} className="card group flex flex-col overflow-hidden hover:-translate-y-1 transition-transform">
        {/* Image or date header */}
        {imgSrc ? (
          <div className="relative h-44 overflow-hidden flex-shrink-0">
            <img
              src={imgSrc}
              alt={ev.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* Date badge over image */}
            <div className={`absolute top-3 left-3 flex flex-col items-center justify-center w-12 h-14 rounded-xl ${isToday ? 'bg-primary-600' : 'bg-gray-900/80 backdrop-blur-sm'}`}>
              <span className="text-white text-xl font-700 leading-none">{day}</span>
              <span className="text-white/80 text-xs font-500 uppercase tracking-wide mt-0.5">{month}</span>
              {isToday && <span className="text-xs text-yellow-300 mt-0.5 font-600">Danas</span>}
            </div>
          </div>
        ) : (
          <div className={`flex-shrink-0 flex flex-col items-center justify-center py-5 font-heading ${isToday ? 'bg-primary-600' : 'bg-gray-700'}`}>
            <span className="text-white text-2xl font-700 leading-none">{day}</span>
            <span className="text-primary-200 text-xs font-500 uppercase tracking-wide mt-1">{month}</span>
            {isToday && <span className="text-xs text-primary-200 mt-1">Danas</span>}
          </div>
        )}
        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-heading font-600 text-gray-900 text-base mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {ev.title}
          </h3>
          {ev.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{ev.description}</p>
          )}
          <div className="mt-auto flex flex-wrap gap-3 text-xs text-gray-400">
            {(ev.location_name || ev.location) && (
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {ev.location_name || ev.location}
              </span>
            )}
            {ev.time && (
              <span className="flex items-center gap-1">
                <Clock size={11} /> {ev.time}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Compact (non-featured) card
  return (
    <Link to={`/dogadjaji/${ev.id}`} className="card group flex flex-row overflow-hidden hover:shadow-hover transition-shadow">
      {/* Thumbnail or date box */}
      {imgSrc ? (
        <div className="flex-shrink-0 w-20 h-20 overflow-hidden">
          <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className={`flex-shrink-0 w-16 flex flex-col items-center justify-center font-heading ${isToday ? 'bg-primary-600' : 'bg-gray-700'}`}>
          <span className="text-white text-2xl font-700 leading-none">{day}</span>
          <span className="text-primary-200 text-xs font-500 uppercase tracking-wide mt-1">{month}</span>
        </div>
      )}
      {/* Content */}
      <div className="p-4 flex flex-col flex-1 min-w-0">
        <h3 className="font-heading font-600 text-gray-900 text-base mb-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
          {ev.title}
        </h3>
        {ev.description && (
          <p className="text-sm text-gray-500 line-clamp-1 mb-2">{ev.description}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Calendar size={11} /> {day}. {month}</span>
          {(ev.location_name || ev.location) && (
            <span className="flex items-center gap-1"><MapPin size={11} /> {ev.location_name || ev.location}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

