'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';

type Director = {
  id: number;
  dept_slug: string;
  director: string;
  role: string;
  photo_url: string;
  updated_at: string;
};

const columns: ColumnConfig<Director>[] = [
  {
    label: 'Photo',
    render: (item) =>
      item.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <span className="text-brand-ink-4">—</span>
      ),
  },
  { label: 'Director', render: (item) => item.director },
  { label: 'Role', render: (item) => item.role },
  { label: 'Dept Slug', render: (item) => <code className="text-xs text-brand-ink-3">{item.dept_slug}</code> },
];

// dept_slug is unique per department, so it doubles as the natural key —
// there is no separate id-independent identifier to edit here.
const fields: FieldConfig[] = [
  { key: 'dept_slug', label: 'Department Slug', type: 'text', required: true },
  { key: 'director', label: 'Director Name', type: 'text', required: true },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'photo_url', label: 'Photo', type: 'text', imagePreview: true },
];

const emptyDraft = {
  dept_slug: '',
  director: '',
  role: '',
  photo_url: '',
};

export default function DirectorsPage() {
  return (
    <AdminCrudPage<Director>
      title="Directors"
      singularLabel="Director"
      table="mod_directors"
      orderBy="dept_slug"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      sortable={false}
    />
  );
}
