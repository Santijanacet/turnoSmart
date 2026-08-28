import React from 'react';
import { Clock } from 'lucide-react';

export function RelativeTime({ dateString }: { dateString: string }) {
  const getRelativeTime = (date: string) => {
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const parsed = new Date(date);
    const diff = parsed.getTime() - new Date().getTime();
    const diffDays = Math.round(diff / (1000 * 60 * 60 * 24));
    const diffHours = Math.round(diff / (1000 * 60 * 60));
    
    if (Math.abs(diffDays) > 0) return rtf.format(diffDays, 'day');
    return rtf.format(diffHours, 'hour');
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <Clock size={12} />
      {getRelativeTime(dateString)}
    </span>
  );
}
