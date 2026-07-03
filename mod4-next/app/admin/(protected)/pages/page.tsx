'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';

type CustomPage = {
  id: number;
  slug: string;
  title: string;
  meta_description: string;
  body: string;
  active: boolean;
  sort_order: number;
};

const columns: ColumnConfig<CustomPage>[] = [
  { label: 'Title', render: (item) => <span className="font-medium text-brand-ink">{item.title}</span> },
  { label: 'Slug', render: (item) => <code className="text-xs text-brand-ink-3">{item.slug}</code> },
  { label: 'URL', render: (item) => <code className="text-xs text-brand-ink-4">page.html?slug={item.slug}</code> },
];

const fields: FieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'slug', label: 'URL Slug', type: 'text', required: true },
  { key: 'meta_description', label: 'Meta Description', type: 'textarea', rows: 2 },
  { key: 'body', label: 'Body (HTML)', type: 'textarea', required: true, rows: 12 },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

const emptyDraft = {
  slug: '',
  title: '',
  meta_description: '',
  body: '',
  sort_order: 0,
  active: true,
};

export default function CustomPagesPage() {
  return (
    <AdminCrudPage<CustomPage>
      title="Pages"
      singularLabel="Page"
      table="mod_custom_pages"
      orderBy="sort_order"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      activeKey="active"
      softDelete
      searchKeys={['title', 'slug']}
    />
  );
}
