import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, CalendarDays, Newspaper, Phone } from 'lucide-react';

const ITEMS = [
  { to: '/',              label: 'Početna',   Icon: Home,        end: true  },
  { to: '/lokacije',      label: 'Lokacije',  Icon: MapPin,      end: false },
  { to: '/dogadjaji',     label: 'Događaji',  Icon: CalendarDays,end: false },
  { to: '/vijesti',       label: 'Vijesti',   Icon: Newspaper,   end: false },
  { to: '/hitni-brojevi', label: 'Hitni br.', Icon: Phone,       end: false },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-pb">
      <div className="flex items-stretch">
        {ITEMS.map(({ to, label, Icon, end }) => {
          const active = end ? pathname === to : pathname.startsWith(to);
          return (
            <Link key={to} to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors
                ${active ? 'text-primary-600' : 'text-gray-400 active:text-gray-600'}`}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className={`text-[10px] font-medium leading-none ${active ? 'font-semibold' : ''}`}>{label}</span>
              {active && <span className="absolute bottom-0 w-6 h-0.5 bg-primary-600 rounded-t-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
