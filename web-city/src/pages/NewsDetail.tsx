import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Tag, User, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, getImgSrc, formatDate, timeAgo } from '../api';
import { NewsItem } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import SEOHead from '../components/SEOHead';

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.newsItem(id),
      api.news(),
    ]).then(([article, all]) => {
      setItem(article);
      const rel = Array.isArray(all)
        ? all.filter((n: NewsItem) => n.id !== id && n.category === article.category).slice(0, 4)
        : [];
      setRelated(rel);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const share = () => {
    if (navigator.share && item) {
      navigator.share({ title: item.title, url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Link kopiran!');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!item) return (
    <div className="container-city py-20 text-center">
      <h2 className="section-title text-gray-400">Vijest nije pronađena</h2>
      <Link to="/vijesti" className="btn-primary mt-6">Nazad na vijesti</Link>
    </div>
  );

  const n = item as any;
  const imgs: string[] = [...(n.images || []), ...(n.image && !(n.images?.length) ? [n.image] : [])]
    .map(getImgSrc).filter(Boolean);
  const isHtml = n.content && n.content.trim().startsWith('<');
  const plainDesc = n.short_description || (isHtml
    ? (n.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 160)
    : (n.content || '').substring(0, 160));

  return (
    <div>
      <SEOHead
        title={item.title}
        description={plainDesc}
        canonical={`/vijesti/${item.id}`}
        ogImage={imgs[0] || undefined}
        ogType="article"
        author={n.author}
        publishedAt={item.created_at}
        keywords={`${item.title}, vijesti, Gradačac, ${item.category}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: item.title,
          description: plainDesc,
          image: imgs,
          datePublished: item.created_at,
          author: n.author ? { '@type': 'Person', name: n.author } : undefined,
          publisher: { '@type': 'Organization', name: 'Gradačac Mapa', url: 'https://gradacac-mapa.ba' },
          mainEntityOfPage: { '@type': 'WebPage' },
        }}
      />
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50 py-3">
        <div className="container-city flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary-600">Početna</Link><span>/</span>
          <Link to="/vijesti" className="hover:text-primary-600">Vijesti</Link><span>/</span>
          <span className="text-gray-900 font-500 line-clamp-1">{item.title}</span>
        </div>
      </div>

      <div className="container-city py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ===== LEFT: Main Content ===== */}
          <div className="lg:col-span-2">

            {/* Category + meta */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="badge bg-primary-100 text-primary-700 text-xs">
                <Tag size={10} className="mr-1" />{item.category}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={11} />{formatDate(item.created_at)}
              </span>
              {n.author && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <User size={11} />{n.author}
                </span>
              )}
            </div>

            <h1 className="font-heading font-700 text-gray-900 text-3xl mb-4 leading-tight">{item.title}</h1>

            {/* Short description / lead */}
            {n.short_description && (
              <p className="text-lg text-gray-600 leading-relaxed mb-6 border-l-4 border-primary-300 pl-4">
                {n.short_description}
              </p>
            )}

            {/* Main image or gallery */}
            {imgs.length > 0 && (
              <div className="mb-8">
                <div className="rounded-2xl overflow-hidden bg-gray-100 relative" style={{ height: '360px' }}>
                  <img src={imgs[activeImg]} alt={item.title}
                    className="w-full h-full object-cover transition-opacity duration-300" />
                  {imgs.length > 1 && (
                    <>
                      <button onClick={() => setActiveImg(i => (i - 1 + imgs.length) % imgs.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2">
                        <ChevronLeft size={20} />
                      </button>
                      <button onClick={() => setActiveImg(i => (i + 1) % imgs.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2">
                        <ChevronRight size={20} />
                      </button>
                      <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                        {activeImg + 1}/{imgs.length}
                      </span>
                    </>
                  )}
                </div>
                {imgs.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {imgs.map((img, idx) => (
                      <button key={idx} onClick={() => setActiveImg(idx)}
                        className={`flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                          idx === activeImg ? 'border-primary-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Article content */}
            {isHtml ? (
              <div
                className="prose prose-base max-w-none text-gray-700 leading-relaxed
                  [&_h2]:font-heading [&_h2]:font-700 [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-gray-900
                  [&_h3]:font-heading [&_h3]:font-600 [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-gray-800
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                  [&_a]:text-primary-600 [&_a]:underline
                  [&_strong]:font-700 [&_strong]:text-gray-900
                  [&_p]:mb-4"
                dangerouslySetInnerHTML={{ __html: n.content }}
              />
            ) : (
              <div className="text-gray-600 leading-relaxed space-y-3">
                {(n.content || '').split('\n').map((p: string, i: number) =>
                  p.trim() ? <p key={i}>{p}</p> : null
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-10 flex gap-3">
              <button onClick={share} className="btn-outline flex items-center gap-2">
                <Share2 size={16} /> Podijeli
              </button>
              <Link to="/vijesti" className="btn-outline flex items-center gap-2">
                <ArrowLeft size={16} /> Sve vijesti
              </Link>
            </div>
          </div>

          {/* ===== RIGHT: Sidebar ===== */}
          <div className="space-y-6">

            {/* Meta info card */}
            <div className="card p-5">
              <h3 className="font-heading font-600 text-gray-900 mb-3 text-sm">O vijesti</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Kategorija</span>
                  <span className="font-medium text-gray-700">{item.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Objavljeno</span>
                  <span className="font-medium text-gray-700">{formatDate(item.created_at)}</span>
                </div>
                {n.author && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Autor</span>
                    <span className="font-medium text-gray-700">{n.author}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Objavljeno</span>
                  <span className="text-xs text-gray-400 italic">{timeAgo(item.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Related articles */}
            {related.length > 0 && (
              <div className="card p-5">
                <h3 className="font-heading font-600 text-base mb-4">Slične vijesti</h3>
                <div className="space-y-4">
                  {related.map(r => {
                    const rn = r as any;
                    const rImg = rn.images?.[0] ? getImgSrc(rn.images[0]) : (r.image ? getImgSrc(r.image) : '');
                    return (
                      <Link key={r.id} to={`/vijesti/${r.id}`} className="flex gap-3 group">
                        {rImg ? (
                          <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={rImg} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <div className="font-600 text-sm text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2">{r.title}</div>
                          <div className="text-xs text-gray-400 mt-1">{timeAgo(r.created_at)}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
