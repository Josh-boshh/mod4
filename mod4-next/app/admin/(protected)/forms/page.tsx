'use client';

import { useState } from 'react';
import { useAdminTable } from '@/lib/admin/useAdminTable';
import { AdminList, type ColumnConfig } from '@/lib/admin/AdminList';
import { CustomFormForm } from './CustomFormForm';
import { EMPTY_DRAFT, type CustomForm, type CustomFormDraft } from './types';

const columns: ColumnConfig<CustomForm>[] = [
  { label: 'Title', render: (item) => <span className="font-medium text-brand-ink">{item.title}</span> },
  { label: 'Slug', render: (item) => <code className="text-xs text-brand-ink-3">{item.slug}</code> },
  { label: 'Fields', render: (item) => `${item.fields?.length ?? 0} field${item.fields?.length === 1 ? '' : 's'}` },
];

export default function CustomFormsPage() {
  const { items, loading, error, insert, update, remove } = useAdminTable<CustomForm>(
    'mod_custom_forms',
    'title',
    true,
    true
  );
  const [editing, setEditing] = useState<CustomForm | 'new' | null>(null);

  async function handleDelete(item: CustomForm) {
    if (!window.confirm(`Move "${item.title}" to Trash? This also hides it from mod_form_submissions history.`)) return;
    await remove(item.id);
  }

  async function handleToggleActive(item: CustomForm) {
    await update(item.id, { active: !item.active });
  }

  async function handleSubmit(draft: CustomFormDraft) {
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
        <h1 className="font-heading text-xl text-brand-ink">Forms</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green"
        >
          + New Form
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
          activeKey="active"
          onToggleActive={handleToggleActive}
          onEdit={setEditing}
          onDelete={handleDelete}
          deleteLabel="Trash"
        />
      )}

      {editing && (
        <CustomFormForm
          isNew={editing === 'new'}
          initial={editing === 'new' ? EMPTY_DRAFT : editing}
          onCancel={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
