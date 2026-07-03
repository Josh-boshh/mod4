export type CustomFormFieldType = 'text' | 'textarea' | 'email' | 'select' | 'checkbox';

// Shape stored in Supabase (mod_custom_forms.fields jsonb) and consumed by
// the public form.html renderer.
export type CustomFormField = {
  key: string;
  label: string;
  type: CustomFormFieldType;
  required: boolean;
  options?: string[];
};

// Shape used while editing in the admin UI — a single comma-separated
// string is much easier to edit inline than an array, field by field.
export type CustomFormFieldEditState = {
  key: string;
  label: string;
  type: CustomFormFieldType;
  required: boolean;
  options: string;
};

export type CustomForm = {
  id: number;
  slug: string;
  title: string;
  description: string;
  fields: CustomFormField[];
  active: boolean;
};

export type CustomFormDraft = Omit<CustomForm, 'id'>;

export const EMPTY_FIELD_EDIT: CustomFormFieldEditState = {
  key: '',
  label: '',
  type: 'text',
  required: false,
  options: '',
};

export const EMPTY_DRAFT: CustomFormDraft = {
  slug: '',
  title: '',
  description: '',
  fields: [],
  active: true,
};

export function fieldsToEditState(fields: CustomFormField[]): CustomFormFieldEditState[] {
  return (fields || []).map((f) => ({ ...f, options: (f.options || []).join(', ') }));
}

export function editStateToFields(edits: CustomFormFieldEditState[]): CustomFormField[] {
  return edits.map((e) => {
    const field: CustomFormField = { key: e.key, label: e.label, type: e.type, required: e.required };
    if (e.type === 'select') {
      const opts = e.options.split(',').map((o) => o.trim()).filter(Boolean);
      if (opts.length) field.options = opts;
    }
    return field;
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function keyFromLabel(label: string) {
  return slugify(label).replace(/-/g, '_');
}

export { slugify };
