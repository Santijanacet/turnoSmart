import React from 'react';

export function Avatar({ firstName, lastName }: { firstName?: string; lastName?: string }) {
  const fInitial = firstName?.charAt(0)?.toUpperCase() || '';
  const lInitial = lastName?.charAt(0)?.toUpperCase() || '';
  const initials = (fInitial + lInitial) || 'U';

  return (
    <div className="bg-indigo-50 text-indigo-700 rounded-full w-9 h-9 flex items-center justify-center text-xs font-medium border border-indigo-100 flex-shrink-0">
      {initials}
    </div>
  );
}
