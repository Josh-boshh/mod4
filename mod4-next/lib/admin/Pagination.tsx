'use client';

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm text-brand-ink-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded border border-brand-line px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span>
        Page {page} of {pageCount}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        className="rounded border border-brand-line px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
