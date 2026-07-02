'use client';

import { useState } from 'react';
import { useAdminTable } from './useAdminTable';
import { AdminList, type ColumnConfig } from './AdminList';
import { AdminModalForm } from './AdminModalForm';
import type { FieldConfig } from './fields';

export function AdminCrudPage<T extends { id: number }>({
  title,
  singularLabel,
  table,
  orderBy,
  columns,
  fields,
  emptyDraft,
  activeKey,
  sortable = true,
}: {
  title: string;
  singularLabel: string;
  table: string;
  orderBy: keyof T & string;
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  emptyDraft: Record<string, unknown>;
  activeKey?: keyof T;
  // Set false for tables with no sort_order column (e.g. mod_directors) —
  // reordering there would mean swapping some other column, which isn't safe.
  sortable?: boolean;
}) {
  const { items, loading, error, insert, update, remove, move } = useAdminTable<T>(table, orderBy);
  const [editing, setEditing] = useState<T | 'new' | null>(null);

  async function handleDelete(item: T) {
    if (!window.confirm(`Delete this ${singularLabel.toLowerCase()}? This cannot be undone.`)) return;
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-xl text-brand-ink">{title}</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green"
        >
          + New {singularLabel}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded border border-brand-red/20 bg-red-50 px-3 py-2 text-sm text-brand-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-brand-ink-3">Loading…</p>
      ) : (
        <AdminList
          items={items}
          columns={columns}
          sortKey={sortable ? orderBy : undefined}
          activeKey={activeKey}
          onMove={sortable ? move : undefined}
          onToggleActive={activeKey ? handleToggleActive : undefined}
          onEdit={setEditing}
          onDelete={handleDelete}
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
