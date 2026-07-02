'use client';

import { useMemo, useState } from 'react';
import { useAdminTable } from './useAdminTable';
import { AdminList, type ColumnConfig } from './AdminList';
import { AdminModalForm } from './AdminModalForm';
import type { FieldConfig } from './fields';

export function AdminCrudPage<T extends { id: number }>({
  title,
  singularLabel,
  table,
  orderBy,
  ascending = true,
  columns,
  fields,
  emptyDraft,
  activeKey,
  sortable = true,
  softDelete = false,
  searchKeys,
}: {
  title: string;
  singularLabel: string;
  table: string;
  orderBy: keyof T & string;
  ascending?: boolean;
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  emptyDraft: Record<string, unknown>;
  activeKey?: keyof T;
  // Set false for tables with no sort_order column (e.g. mod_directors) —
  // reordering there would mean swapping some other column, which isn't safe.
  sortable?: boolean;
  // True for tables with a deleted_at column — routes delete through the
  // Trash instead of removing the row immediately.
  softDelete?: boolean;
  // Fields to match against the search box, e.g. ['title', 'category'].
  // Omit to hide the search box entirely.
  searchKeys?: (keyof T)[];
}) {
  const { items, loading, error, insert, update, remove, move } = useAdminTable<T>(
    table,
    orderBy,
    ascending,
    softDelete
  );
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [query, setQuery] = useState('');

  const visibleItems = useMemo(() => {
    if (!searchKeys || !query.trim()) return items;
    const needle = query.trim().toLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => String(item[key] ?? '').toLowerCase().includes(needle))
    );
  }, [items, searchKeys, query]);

  async function handleDelete(item: T) {
    const verb = softDelete ? 'Move' : 'Delete';
    const suffix = softDelete ? 'to Trash?' : 'This cannot be undone.';
    if (!window.confirm(`${verb} this ${singularLabel.toLowerCase()} ${suffix}`)) return;
    await remove(item.id);
  }

  async function handleToggleActive(item: T) {
    if (!activeKey) return;
    await update(item.id, { [activeKey]: !item[activeKey] } as Partial<T>);
  }

  async function handleSubmit(draft: Record<string, unknown>) {
    if (editing === 'new') {
      const message = await insert(draft as Partial<T>);
      if (!message) setEditing(null);
      return message;
    }
    if (editing) {
      const message = await update(editing.id, draft as Partial<T>);
      if (!message) setEditing(null);
      return message;
    }
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl text-brand-ink">{title}</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green"
        >
          + New {singularLabel}
        </button>
      </div>

      {searchKeys && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}…`}
          className="mb-4 w-full max-w-sm rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
      )}

      {error && (
        <p role="alert" className="mb-4 rounded border border-brand-red/20 bg-red-50 px-3 py-2 text-sm text-brand-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-brand-ink-3">Loading…</p>
      ) : (
        <AdminList
          items={visibleItems}
          columns={columns}
          sortKey={sortable ? orderBy : undefined}
          activeKey={activeKey}
          onMove={sortable ? move : undefined}
          onToggleActive={activeKey ? handleToggleActive : undefined}
          onEdit={setEditing}
          onDelete={handleDelete}
          deleteLabel={softDelete ? 'Trash' : 'Delete'}
          emptyMessage={query.trim() ? 'No items match your search.' : 'No items yet.'}
        />
      )}

      {editing && (
        <AdminModalForm
          title={editing === 'new' ? `New ${singularLabel}` : `Edit ${singularLabel}`}
          fields={fields}
          initial={editing === 'new' ? emptyDraft : (editing as unknown as Record<string, unknown>)}
          onCancel={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
