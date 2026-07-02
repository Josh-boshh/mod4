'use client';

import type { ReactNode } from 'react';

export type ColumnConfig<T> = {
  label: string;
  render: (item: T) => ReactNode;
};

export function AdminList<T extends { id: number }>({
  items,
  columns,
  sortKey,
  activeKey,
  onMove,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  items: T[];
  columns: ColumnConfig<T>[];
  sortKey?: keyof T;
  activeKey?: keyof T;
  onMove?: (item: T, direction: 'up' | 'down') => void;
  onToggleActive?: (item: T) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-brand-ink-3">No items yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-brand-line bg-brand-paper">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-brand-line bg-brand-paper-3 text-xs uppercase tracking-wide text-brand-ink-3">
          <tr>
            {sortKey && <th className="px-4 py-3">Order</th>}
            {columns.map((c) => (
              <th key={c.label} className="px-4 py-3">
                {c.label}
              </th>
            ))}
            {activeKey && <th className="px-4 py-3">Active</th>}
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="border-b border-brand-line last:border-0 hover:bg-brand-paper-3/60">
              {sortKey && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onMove?.(item, 'up')}
                      disabled={index === 0}
                      className="rounded px-1 text-brand-ink-3 hover:bg-brand-paper-3 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => onMove?.(item, 'down')}
                      disabled={index === items.length - 1}
                      className="rounded px-1 text-brand-ink-3 hover:bg-brand-paper-3 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <span className="ml-1 text-xs text-brand-ink-4">{String(item[sortKey])}</span>
                  </div>
                </td>
              )}
              {columns.map((c) => (
                <td key={c.label} className="px-4 py-3 text-brand-ink-2">
                  {c.render(item)}
                </td>
              ))}
              {activeKey && (
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleActive?.(item)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      item[activeKey]
                        ? 'bg-brand-green-soft text-brand-green-2'
                        : 'bg-brand-paper-3 text-brand-ink-3'
                    }`}
                  >
                    {item[activeKey] ? 'Active' : 'Inactive'}
                  </button>
                </td>
              )}
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(item)}
                  className="mr-3 text-sm font-medium text-brand-ink-2 hover:text-brand-green-2 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="text-sm font-medium text-brand-red hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
