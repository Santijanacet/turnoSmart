import React from 'react';

type Status = 'PUBLISHED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | 'CANCELLED' | 'COMPLETED' | string;

export function StatusBadge({ status }: { status: Status }) {
  let bgColor = 'bg-gray-50';
  let textColor = 'text-gray-700';
  let borderColor = 'border-gray-200';
  let label = status;

  switch (status.toUpperCase()) {
    case 'PUBLISHED':
    case 'APPROVED':
    case 'COMPLETED':
    case 'ACTIVO':
      bgColor = 'bg-green-50';
      textColor = 'text-green-700';
      borderColor = 'border-green-200';
      label = status.toUpperCase() === 'PUBLISHED' ? 'Publicado' : status.toUpperCase() === 'APPROVED' ? 'Aprobado' : status.toUpperCase() === 'ACTIVO' ? 'Activo' : 'Completado';
      break;
    case 'REJECTED':
    case 'CANCELLED':
    case 'SUSPENDIDO':
      bgColor = 'bg-red-50';
      textColor = 'text-red-700';
      borderColor = 'border-red-200';
      label = status.toUpperCase() === 'REJECTED' ? 'Rechazado' : status.toUpperCase() === 'SUSPENDIDO' ? 'Suspendido' : 'Cancelado';
      break;
    case 'PENDING':
    case 'DRAFT':
      bgColor = 'bg-amber-50';
      textColor = 'text-amber-700';
      borderColor = 'border-amber-200';
      label = status.toUpperCase() === 'PENDING' ? 'Pendiente' : 'Borrador';
      break;
    default:
      bgColor = 'bg-blue-50';
      textColor = 'text-blue-700';
      borderColor = 'border-blue-200';
      label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  return (
    <span className={`px-2.5 py-1 text-xs font-medium border rounded-full ${bgColor} ${textColor} ${borderColor}`}>
      {label}
    </span>
  );
}
