import { LucideIcon } from 'lucide-react';

interface Props {
  icon?: string;
  title: string;
  sub?: string;
}

export default function EmptyState({ icon = '📍', title, sub }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="font-heading font-600 text-gray-700 text-lg">{title}</h3>
      {sub && <p className="text-gray-400 text-sm mt-2 max-w-xs">{sub}</p>}
    </div>
  );
}
