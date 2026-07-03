'use client';

import { useState } from 'react';
import {
  editStateToFields,
  fieldsToEditState,
  keyFromLabel,
  slugify,
  EMPTY_FIELD_EDIT,
  type CustomFormDraft,
  type CustomFormFieldEditState,
} from './types';
import { confirmDiscard, useUnsavedChangesGuard } from '@/lib/admin/useUnsavedChangesGuard';

const inputClass =
  'w-full rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green';

export function CustomFormForm({
  initial,
  isNew,
  onCancel,
  onSubmit,
}: {
  initial: CustomFormDraft;
  isNew: boolean;
  onCancel: () => void;
  onSubmit: (draft: CustomFormDraft) => Promise<string | null>;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [active, setActive] = useState(initial.active);
  const [fieldEdits, setFieldEdits] = useState<CustomFormFieldEditState[]>(fieldsToEditState(initial.fields));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDraft: CustomFormDraft = {
    slug,
    title,
    description,
    active,
    fields: editStateToFields(fieldEdits),
  };
  const isDirty = JSON.stringify(currentDraft) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function updateField(index: number, patch: Partial<CustomFormFieldEditState>) {
    setFieldEdits((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateFieldLabel(index: number, label: string) {
    setFieldEdits((rows) =>
      rows.map((r, i) => {
        if (i !== index) return r;
        // Only auto-derive the key while it still matches the previous
        // label's derived key — once hand-edited, stop overwriting it.
        const autoKey = !r.key || r.key === keyFromLabel(r.label);
        return { ...r, label, key: autoKey ? keyFromLabel(label) : r.key };
      })
    );
  }

  function addField() {
    setFieldEdits((rows) => [...rows, { ...EMPTY_FIELD_EDIT }]);
  }

  function removeField(index: number) {
    setFieldEdits((rows) => rows.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFieldEdits((rows) => {
      const next = [...rows];
      const target = index + direction;
      if (target < 0 || target >= next.length) return rows;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleCancel() {
    if (confirmDiscard(isDirty)) onCancel();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (fieldEdits.some((f) => !f.key || !f.label)) {
      setError('Every field needs a label.');
      return;
    }
    const keys = fieldEdits.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      setError('Field keys must be unique — try distinct labels.');
      return;
    }

    setPending(true);
    setError(null);
    const message = await onSubmit(currentDraft);
    setPending(false);
    if (message) setError(message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-brand-line bg-brand-paper p-6 shadow-[0_18px_40px_rgba(14,26,20,.10),0_4px_8px_rgba(14,26,20,.04)]">
        <h2 className="mb-4 font-heading text-lg text-brand-ink">{isNew ? 'New Form' : 'Edit Form'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title" required>
            <input required value={title} onChange={(e) => handleTitleChange(e.target.value)} className={inputClass} />
          </Field>

          <Field label="Slug" required>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-brand-ink-4">Public URL: form.html?slug={slug || '…'}</p>
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-brand-ink-2">Fields</label>
              <button type="button" onClick={addField} className="text-sm font-medium text-brand-green-2 hover:underline">
                + Add Field
              </button>
            </div>

            {fieldEdits.length === 0 && (
              <p className="rounded border border-dashed border-brand-line px-3 py-4 text-center text-sm text-brand-ink-3">
                No fields yet — add at least one.
              </p>
            )}

            <div className="space-y-3">
              {fieldEdits.map((field, index) => (
                <div key={index} className="rounded border border-brand-line p-3">
                  <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      placeholder="Field label (e.g. Full Name)"
                      value={field.label}
                      onChange={(e) => updateFieldLabel(index, e.target.value)}
                      className={inputClass}
                    />
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, { type: e.target.value as CustomFormFieldEditState['type'] })
                      }
                      className={inputClass}
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="email">Email</option>
                      <option value="select">Select (dropdown)</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>

                  {field.type === 'select' && (
                    <input
                      placeholder="Options, comma separated"
                      value={field.options}
                      onChange={(e) => updateField(index, { options: e.target.value })}
                      className={`${inputClass} mb-2`}
                    />
                  )}

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-brand-ink-3">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-brand-line text-brand-green focus:ring-brand-green"
                      />
                      Required
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                        className="text-brand-ink-3 hover:text-brand-ink disabled:opacity-30"
                        aria-label="Move field up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(index, 1)}
                        disabled={index === fieldEdits.length - 1}
                        className="text-brand-ink-3 hover:text-brand-ink disabled:opacity-30"
                        aria-label="Move field down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="text-xs font-medium text-brand-red hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-brand-ink-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-brand-line text-brand-green focus:ring-brand-green"
            />
            Active
          </label>

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
