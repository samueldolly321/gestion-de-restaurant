import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Hook de pagination générique. Découpe une liste en pages de `pageSize` (20 par défaut)
// et se remet à la page 1 automatiquement quand le nombre d'éléments change (ex. filtre/recherche).
export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [total]);

  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    pageItems,
    page: current,
    setPage,
    totalPages,
    total,
    pageSize,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
  };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
}

// Barre de pagination (n'apparaît que s'il y a plus d'une page).
export function Pagination({ page, totalPages, total, rangeStart, rangeEnd, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 mt-4 px-1">
      <span className="text-[11px] text-slate-400 font-medium">
        Affichage <span className="font-bold text-slate-600">{rangeStart}–{rangeEnd}</span> sur <span className="font-bold text-slate-600">{total}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Précédent
        </button>
        <span className="text-[11px] font-bold text-slate-500 px-2 tabular-nums">Page {page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Suivant <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
