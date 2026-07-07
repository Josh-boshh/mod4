'use client';

export function BulkActionBar({
  count,
  onMarkHandled,
  onMarkNew,
  onDelete,
  onClear,
}: {
  count: number;
  onMarkHandled: () => void;
  onMarkNew: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded border border-brand-line bg-brand-paper-3 px-4 py-2.5 text-sm">
      <span className="font-medium text-brand-ink">{count} selected</span>
      <button onClick={onMarkHandled} className="font-medium text-brand-green-2 hover:underline">
        Mark Handled
      </button>
      <button onClick={onMarkNew} className="font-medium text-brand-ink-2 hover:underline">
        Mark New
      </button>
      <button onClick={onDelete} className="font-medium text-brand-red hover:underline">
        Delete
      </button>
      <button onClick={onClear} className="ml-auto text-brand-ink-3 hover:underline">
        Clear selection
      </button>
    </div>
  );
}
