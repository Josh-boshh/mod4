'use client';

import { useState } from 'react';
import type { PressItemDraft } from './types';
import { ImageUploadField } from '@/lib/admin/ImageUploadField';
import { confirmDiscard, useUnsavedChangesGuard } from '@/lib/admin/useUnsavedChangesGuard';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function PressItemForm({
  initial,
  isNew,
  onCancel,
  onSubmit,
}: {
  initial: PressItemDraft;
  isNew: boolean;
  onCancel: () => void;
  onSubmit: (draft: PressItemDraft) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<PressItemDraft>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function update<K extends keyof PressItemDraft>(key: K, value: PressItemDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleTitleChange(value: string) {
    update('title', value);
    if (!slugTouched) {
      update('slug', slugify(value));
    }
  }

  function handleCancel() {
    if (confirmDiscard(isDirty)) onCancel();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const message = await onSubmit(draft);
    setPending(false);
    if (message) setError(message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 px-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded border border-brand-line bg-brand-paper p-6 shadow-[0_18px_40px_rgba(14,26,20,.10),0_4px_8px_rgba(14,26,20,.04)]">
        <h2 className="mb-4 font-heading text-lg text-brand-ink">
          {isNew ? 'New Press Item' : 'Edit Press Item'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title" required>
            <input
              required
              value={draft.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Slug" required>
            <input
              required
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update('slug', e.target.value);
              }}
              className={inputClass}
            />
          </Field>

          <Field label="Excerpt">
            <textarea
              value={draft.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>

          <Field label="Body">
            <textarea
              value={draft.body}
              onChange={(e) => update('body', e.target.value)}
              rows={4}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(e) => update('category', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Published At">
              <input
                type="date"
                value={draft.published_at}
                onChange={(e) => update('published_at', e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Image">
            <ImageUploadField value={draft.image_url} onChange={(url) => update('image_url', url)} />
          </Field>

          <Field label="Link URL">
            <input
              value={draft.link_url}
              onChange={(e) => update('link_url', e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sort Order">
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) => update('sort_order', Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-brand-ink-2 sm:mt-6">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => update('active', e.target.checked)}
                className="h-4 w-4 rounded border-brand-line text-brand-green focus:ring-brand-green"
              />
              Active
            </label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-brand-red">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border border-brand-ink px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-paper-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green disabled:opacity-60"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brand-ink-2">
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </label>
      {children}
    </div>
  );
}
