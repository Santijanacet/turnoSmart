import React from 'react';

export function DepartmentBadge({ name }: { name?: string | null }) {
  if (!name) return <span className="text-gray-400 text-sm">Sin asignar</span>;

  const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  return (
    <span className="bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
      {normalized}
    </span>
  );
}
