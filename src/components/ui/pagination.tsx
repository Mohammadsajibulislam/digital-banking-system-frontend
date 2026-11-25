"use client";

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const buttonClass =
    "flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">Showing {start}-{end} of {total}</p>
      <div className="flex items-center gap-2">
        <button type="button" className={buttonClass} disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          <FiChevronLeft className="h-4 w-4" />Previous
        </button>
        <span className="px-2 text-sm text-slate-600">Page {page} of {totalPages}</span>
        <button type="button" className={buttonClass} disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next<FiChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
