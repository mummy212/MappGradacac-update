import { useState, useEffect } from 'react';
import { api } from '../api';
import { NewsItem } from '../types';
import NewsCard from '../components/NewsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const ALL_CATS = ['Kultura','Sport','Turizam','Vijesti','Ostalo'];

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');

  useEffect(() => {
    api.news().then(d => { setNews(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = cat ? news.filter(n => n.category === cat) : news;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="py-10">
      <div className="container-city">
        <div className="mb-8">
          <h1 className="section-title">📰 Gradske Vijesti</h1>
          <p className="section-sub">Najnovije iz Gradačca</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setCat('')} className={`px-4 py-2 rounded-full text-sm font-600 transition-colors ${ cat === '' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}>Sve</button>
          {ALL_CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-full text-sm font-600 transition-colors ${ cat === c ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200' }`}>{c}</button>
          ))}
        </div>

        {filtered.length === 0
          ? <EmptyState icon="📰" title="Nema vijesti" sub="Pratite ovu sekciju za novosti iz grada" />
          : (
            <>
              {filtered.slice(0, 1).map(item => <NewsCard key={item.id} item={item} big />)}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                {filtered.slice(1).map(item => <NewsCard key={item.id} item={item} />)}
              </div>
            </>
          )
        }
      </div>
    </div>
  );
}
