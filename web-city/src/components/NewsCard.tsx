import { Link } from 'react-router-dom';
import { Clock, Tag } from 'lucide-react';
import { NewsItem } from '../types';
import { getImgSrc, timeAgo } from '../api';

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  'Kultura':  { bg: '#EDE9FE', text: '#7C3AED' },
  'Sport':    { bg: '#DCFCE7', text: '#16A34A' },
  'Turizam':  { bg: '#DBEAFE', text: '#2563EB' },
  'Vijesti':  { bg: '#FEF3C7', text: '#D97706' },
  'Ostalo':   { bg: '#F3F4F6', text: '#6B7280' },
};

export default function NewsCard({ item, big = false }: { item: NewsItem; big?: boolean }) {
  const n = item as any;
  const imgs: string[] = n.images || [];
  const img = imgs[0] ? getImgSrc(imgs[0]) : getImgSrc(item.image);
  const cat = CAT_COLORS[item.category] || CAT_COLORS['Ostalo'];
  const isHtml = item.content?.trim().startsWith('<');
  const plainText = n.short_description || (isHtml ? item.content.replace(/<[^>]*>/g, '').slice(0, 120) : item.content?.slice(0, 120));

  return (
    <Link to={`/vijesti/${item.id}`} className={`card group flex flex-col ${big ? 'md:flex-row' : ''} overflow-hidden hover:-translate-y-0.5 transition-transform`}>
      {img && (
        <div className={`bg-gray-100 overflow-hidden flex-shrink-0 relative ${
          big ? 'h-48 md:w-56 md:h-auto' : 'h-40'
        }`}>
          <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          {imgs.length > 1 && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              🖼 {imgs.length}
            </span>
          )}
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="badge text-xs" style={{ backgroundColor: cat.bg, color: cat.text }}>
            <Tag size={10} className="mr-1" />{item.category}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={11} />{timeAgo(item.created_at)}
          </span>
          {n.author && <span className="text-xs text-gray-400 ml-auto">✍️ {n.author}</span>}
        </div>
        <h3 className="font-heading font-600 text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors text-base">
          {item.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-3 flex-1">{plainText}</p>
        <span className="text-primary-600 text-sm font-600 mt-3 group-hover:underline">Pročitaj više →</span>
      </div>
    </Link>
  );
}
