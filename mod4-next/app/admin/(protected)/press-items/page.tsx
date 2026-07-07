'use client';

import { useMemo, useState } from 'react';
import { useAdminTable } from '@/lib/admin/useAdminTable';
import { AdminList, type ColumnConfig } from '@/lib/admin/AdminList';
import { PUBLIC_SITE_URL } from '@/lib/admin/publicSiteUrl';
import { PressItemForm } from './PressItemForm';
import { EMPTY_DRAFT, type PressItem, type PressItemDraft } from './types';

const columns: ColumnConfig<PressItem>[] = [
  { label: 'Title', render: (item) => <span className="font-medium text-brand-ink">{item.title}</span> },
  { label: 'Category', render: (item) => item.category },
  {
    label: 'Published',
    render: (item) => {
      const isFuture = item.published_at > new Date().toISOString().slice(0, 10);
      return (
        <span className={isFuture ? 'font-medium text-brand-gold' : undefined}>
          {item.published_at}
          {isFuture ? ' (scheduled)' : ''}
        </span>
      );
    },
  },
];

export default function PressItemsPage() {
  // Ordered by publish date (not sort_order) so backdating and scheduling
  // "just work" without any manual reordering — the public site orders
  // press releases the same way (see contentstore.js's loadSupabasePress).
  const { items, loading, error, insert, update, remove } = useAdminTable<PressItem>(
    'mod_press_items',
    'published_at',
    false,
    true
  );
  const [editing, setEditing] = useState<PressItem | 'new' | null>(null);
  const [query, setQuery] = useState('');

  const visibleItems = useMemo(() => {
    if (!query.trim()) return items;
    const needle = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        item.excerpt.toLowerCase().includes(needle)
    );
  }, [items, query]);

  async function handleDelete(item: PressItem) {
    if (!window.confirm(`Move "${item.title}" to Trash?`)) return;
    await remove(item.id);
  }

  async function handleToggleActive(item: PressItem) {
    await update(item.id, { active: !item.active });
  }

  function handlePreview(item: PressItem) {
    const url = `${PUBLIC_SITE_URL}/press-release.html?slug=${encodeURIComponent(item.slug)}&preview=1&token=${item.preview_token}`;
    window.open(url, '_blank', 'noopener');
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl text-brand-ink">Press Items</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green"
        >
          + New Press Item
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search press items…"
        className="mb-4 w-full max-w-sm rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
      />

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
          activeKey="active"
          onToggleActive={handleToggleActive}
          onEdit={setEditing}
          onDelete={handleDelete}
          onPreview={handlePreview}
          deleteLabel="Trash"
          emptyMessage={query.trim() ? 'No items match your search.' : 'No items yet.'}
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
