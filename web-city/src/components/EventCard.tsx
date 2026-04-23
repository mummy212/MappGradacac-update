import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { CityEvent } from '../types';
import { formatDateShort } from '../api';

export default function EventCard({ ev, featured = false }: { ev: CityEvent; featured?: boolean }) {
  const { day, month } = formatDateShort(ev.date);
  const isToday = new Date(ev.date).toDateString() === new Date().toDateString();

  return (
    <div className={`card group flex ${featured ? 'flex-col' : 'flex-row'} overflow-hidden`}>
      {/* Date box */}
      <div className={`flex-shrink-0 flex flex-col items-center justify-center font-heading ${
        featured
          ? 'py-5 bg-primary-600'
          : 'w-16 bg-primary-600'
      } ${isToday ? 'bg-primary-600' : 'bg-gray-700'}`}>
        <span className="text-white text-2xl font-700 leading-none">{day}</span>
        <span className="text-primary-200 text-xs font-500 uppercase tracking-wide mt-1">{month}</span>
        {isToday && <span className="text-xs text-primary-200 mt-1">Danas</span>}
      </div>

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
    </div>
  );
}
