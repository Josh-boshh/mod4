'use client';

import { useState, type FormEvent } from 'react';
import type { FieldConfig } from './fields';
import { ImageUploadField } from './ImageUploadField';
import { DocumentUploadField } from './DocumentUploadField';
import { confirmDiscard, useUnsavedChangesGuard } from './useUnsavedChangesGuard';

const inputClass =
  'w-full rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green';

type Draft = Record<string, unknown>;

export function AdminModalForm({
  title,
  fields,
  initial,
  onCancel,
  onSubmit,
}: {
  title: string;
  fields: FieldConfig[];
  initial: Draft;
  onCancel: () => void;
  onSubmit: (draft: Draft) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function update(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleCancel() {
    if (confirmDiscard(isDirty)) onCancel();
  }

  async function handleSubmit(e: FormEvent) {
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
        <h2 className="mb-4 font-heading text-lg text-brand-ink">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const value = draft[field.key];

            if (field.type === 'checkbox') {
              return (
                <label key={field.key} className="flex items-center gap-2 text-sm text-brand-ink-2">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => update(field.key, e.target.checked)}
                    className="h-4 w-4 rounded border-brand-line text-brand-green focus:ring-brand-green"
                  />
                  {field.label}
                </label>
              );
            }

            return (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium text-brand-ink-2">
                  {field.label}
                  {field.required && <span className="text-brand-red"> *</span>}
                </label>

                {field.type === 'textarea' && (
                  <textarea
                    required={field.required}
                    rows={field.rows ?? 3}
                    value={(value as string) ?? ''}
                    onChange={(e) => update(field.key, e.target.value)}
                    className={inputClass}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    required={field.required}
                    value={(value as string) ?? ''}
                    onChange={(e) => update(field.key, e.target.value)}
                    className={inputClass}
                  >
                    {field.options!.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'text' && field.imagePreview && (
                  <ImageUploadField
                    value={(value as string) ?? ''}
                    onChange={(url) => update(field.key, url)}
                  />
                )}

                {field.type === 'text' && field.documentUpload && (
                  <DocumentUploadField
                    value={(value as string) ?? ''}
                    onChange={(url) => update(field.key, url)}
                  />
                )}

                {(field.type === 'text' || field.type === 'number' || field.type === 'date') &&
                  !field.imagePreview &&
                  !field.documentUpload && (
                    <input
                      type={field.type}
                      required={field.required}
                      value={(value as string | number) ?? ''}
                      onChange={(e) =>
                        update(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
                      }
                      className={inputClass}
                    />
                  )}
              </div>
            );
          })}

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
