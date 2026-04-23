import { useState, useEffect } from 'react';
import { api, formatDateShort } from '../api';
import { CityEvent } from '../types';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function Events() {
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.events().then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= now).sort((a,b) => +new Date(a.date) - +new Date(b.date));
  const past = events.filter(e => new Date(e.date) < now).sort((a,b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="py-10">
      <div className="container-city">
        <div className="mb-8">
          <h1 className="section-title">🎭 Događaji</h1>
          <p className="section-sub">Sve što se dešava u Gradačcu</p>
        </div>

        {events.length === 0
          ? <EmptyState icon="🎨" title="Nema događaja" sub="Pratite ovu sekciju za nadolazeće događaje" />
          : (
            <>
              {upcoming.length > 0 && (
                <div className="mb-12">
                  <h2 className="font-heading font-700 text-xl mb-5 text-gray-900">✨ Nadolazeći</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {upcoming.map(ev => <EventCard key={ev.id} ev={ev} featured />)}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h2 className="font-heading font-700 text-xl mb-5 text-gray-500">Prošli događaji</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
                  </div>
                </div>
              )}
            </>
          )
        }
      </div>
    </div>
  );
}
