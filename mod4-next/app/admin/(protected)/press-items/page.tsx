'use client';

import { useState } from 'react';
import { useAdminTable } from '@/lib/admin/useAdminTable';
import { AdminList, type ColumnConfig } from '@/lib/admin/AdminList';
import { PressItemForm } from './PressItemForm';
import { EMPTY_DRAFT, type PressItem, type PressItemDraft } from './types';

const columns: ColumnConfig<PressItem>[] = [
  { label: 'Title', render: (item) => <span className="font-medium text-brand-ink">{item.title}</span> },
  { label: 'Category', render: (item) => item.category },
  { label: 'Published', render: (item) => item.published_at },
];

export default function PressItemsPage() {
  const { items, loading, error, insert, update, remove, move } = useAdminTable<PressItem>(
    'mod_press_items',
    'sort_order'
  );
  const [editing, setEditing] = useState<PressItem | 'new' | null>(null);

  async function handleDelete(item: PressItem) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    await remove(item.id);
  }

  async function handleToggleActive(item: PressItem) {
    await update(item.id, { active: !item.active });
  }

  async function handleSubmit(draft: PressItemDraft) {
    if (editing === 'new') {
      const message = await insert(draft);
      if (!message) setEditing(null);
      return message;
    }
    if (editing) {
      const message = await update(editing.id, draft);
      if (!message) setEditing(null);
      return message;
    }
    return null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-xl text-brand-ink">Press Items</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green"
        >
          + New Press Item
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
          sortKey="sort_order"
          activeKey="active"
          onMove={move}
          onToggleActive={handleToggleActive}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      )}

      {editing && (
        <PressItemForm
          isNew={editing === 'new'}
          initial={editing === 'new' ? EMPTY_DRAFT : editing}
          onCancel={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
