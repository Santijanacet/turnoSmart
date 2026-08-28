import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';

export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  tint = "bg-indigo-50 text-indigo-600"
}: { 
  label: string; 
  value: string | number; 
  icon: LucideIcon; 
  trend?: string;
  tint?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tint}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium mb-1">
            {trend.toLowerCase() === 'live' ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Datos en vivo
              </span>
            ) : (
              <>
                {trend.startsWith('+') && <ArrowUpRight size={13} />}
                {trend}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
