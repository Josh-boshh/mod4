'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';

type Tender = {
  id: number;
  type: 'tender' | 'award';
  title: string;
  ref_number: string;
  category: string;
  method: string;
  closes_at: string | null;
  doc_url: string;
  description: string;
  sort_order: number;
  active: boolean;
};

const columns: ColumnConfig<Tender>[] = [
  {
    label: 'Type',
    render: (item) => (
      <span className="rounded-full bg-brand-paper-3 px-2.5 py-1 text-xs font-medium capitalize text-brand-ink-2">
        {item.type}
      </span>
    ),
  },
  { label: 'Title', render: (item) => item.title },
  { label: 'Ref Number', render: (item) => item.ref_number },
  { label: 'Closes', render: (item) => item.closes_at ?? '—' },
];

const fields: FieldConfig[] = [
  { key: 'type', label: 'Type', type: 'select', options: ['tender', 'award'], required: true },
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'ref_number', label: 'Reference Number', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'method', label: 'Method', type: 'text' },
  { key: 'closes_at', label: 'Closes At', type: 'date' },
  { key: 'doc_url', label: 'Document URL', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

const emptyDraft = {
  type: 'tender',
  title: '',
  ref_number: '',
  category: '',
  method: '',
  closes_at: '',
  doc_url: '',
  description: '',
  sort_order: 0,
  active: true,
};

export default function TendersPage() {
  return (
    <AdminCrudPage<Tender>
      title="Tenders"
      singularLabel="Tender"
      table="mod_tenders"
      orderBy="sort_order"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      activeKey="active"
      softDelete
      searchKeys={['title', 'ref_number', 'category']}
    />
  );
}
