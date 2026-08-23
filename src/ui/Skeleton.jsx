import React from 'react';

export function SkeletonLine({ className = '' }) {
  return <div className={`eco-skeleton animate-shimmer h-3 rounded ${className}`} />;
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`eco-card p-4 space-y-3 ${className}`}>
      <SkeletonLine className="w-1/2 h-2.5" />
      <SkeletonLine className="w-2/3 h-6" />
      <SkeletonLine className="w-1/3 h-2" />
    </div>
  );
}

export function SkeletonTableRow({ colunas = 4 }) {
  return (
    <tr className="border-t border-stone-100">
      {Array.from({ length: colunas }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <SkeletonLine className={i === 0 ? 'w-20' : 'w-full'} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonChart({ className = '' }) {
  return (
    <div className={`eco-card p-4 ${className}`}>
      <SkeletonLine className="w-1/3 h-3 mb-4" />
      <div className="eco-skeleton animate-shimmer h-48 w-full rounded-lg" />
    </div>
  );
}

// Estrutura completa parecida com o dashboard inicial, exibida enquanto os
// dados ainda estão vindo do banco (substitui o spinner solto).
export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 w-full">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 eco-stagger">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonCard className="h-24" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 eco-stagger">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>
    </div>
  );
}
