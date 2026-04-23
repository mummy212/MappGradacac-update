import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Tag } from 'lucide-react';
import { api, getImgSrc, formatDate, timeAgo } from '../api';
import { NewsItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.news().then(d => { setNews(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;
  const item = news.find(n => n.id === id);
  const related = news.filter(n => n.id !== id && n.category === item?.category).slice(0, 3);

  if (!item) return (
    <div className="container-city py-20 text-center">
      <h2 className="section-title text-gray-400">Vijest nije pronađena</h2>
      <Link to="/vijesti" className="btn-primary mt-6">Nazad na vijesti</Link>
    </div>
  );

  const img = getImgSrc(item.image);

  return (
    <div>
      <div className="border-b border-gray-100 bg-gray-50 py-3">
        <div className="container-city flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary-600">Početna</Link>
          <span>/</span>
          <Link to="/vijesti" className="hover:text-primary-600">Vijesti</Link>
          <span>/</span>
          <span className="text-gray-900 font-500 line-clamp-1">{item.title}</span>
        </div>
      </div>

      <div className="container-city py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            {img && (
              <div className="rounded-2xl overflow-hidden h-64 md:h-80 bg-gray-100 mb-8">
                <img src={img} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <span className="badge bg-primary-100 text-primary-700 text-xs">
                <Tag size={10} className="mr-1" />{item.category}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={11} />{formatDate(item.created_at)}
              </span>
            </div>

            <h1 className="font-heading font-700 text-gray-900 text-3xl mb-6 leading-tight">{item.title}</h1>
            <div className="prose prose-gray max-w-none">
              {item.content.split('\n').map((p, i) => (
                p.trim() ? <p key={i} className="text-gray-600 leading-relaxed mb-4">{p}</p> : null
              ))}
            </div>

            <Link to="/vijesti" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mt-8">
              <ArrowLeft size={16} /> Sve vijesti
            </Link>
          </div>

          <div>
            {related.length > 0 && (
              <div className="card p-5">
                <h3 className="font-heading font-600 text-base mb-4">Slične vijesti</h3>
                <div className="space-y-4">
                  {related.map(r => (
                    <Link key={r.id} to={`/vijesti/${r.id}`} className="block group">
                      <div className="font-600 text-sm text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2">{r.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{timeAgo(r.created_at)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
