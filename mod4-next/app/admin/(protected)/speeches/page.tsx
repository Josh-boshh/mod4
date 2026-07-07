'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';

type Speech = {
  id: number;
  category: string;
  quote: string;
  description: string;
  sort_order: number;
  active: boolean;
};

const columns: ColumnConfig<Speech>[] = [
  { label: 'Category', render: (item) => item.category },
  { label: 'Quote', render: (item) => <span className="line-clamp-2 max-w-sm">{item.quote}</span> },
];

const fields: FieldConfig[] = [
  { key: 'category', label: 'Category', type: 'text', required: true },
  { key: 'quote', label: 'Quote', type: 'textarea', required: true, rows: 3 },
  { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

const emptyDraft = {
  category: '',
  quote: '',
  description: '',
  sort_order: 0,
  active: true,
};

export default function SpeechesPage() {
  return (
    <AdminCrudPage<Speech>
      title="Speeches"
      singularLabel="Speech"
      table="mod_speeches"
      orderBy="sort_order"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      activeKey="active"
      softDelete
      searchKeys={['category', 'quote', 'description']}
    />
  );
}
