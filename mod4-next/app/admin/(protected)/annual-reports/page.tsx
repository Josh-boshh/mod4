'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';

type AnnualReport = {
  id: number;
  year: number;
  title: string;
  description: string;
  doc_url: string;
  status: string;
  sort_order: number;
  active: boolean;
};

const columns: ColumnConfig<AnnualReport>[] = [
  { label: 'Year', render: (item) => item.year },
  { label: 'Title', render: (item) => item.title },
  {
    label: 'Status',
    render: (item) => (
      <span className="rounded-full bg-brand-paper-3 px-2.5 py-1 text-xs font-medium capitalize text-brand-ink-2">
        {item.status}
      </span>
    ),
  },
];

// year has a unique constraint at the DB level — inserting a duplicate
// surfaces as an error message from Supabase, which the form displays.
const fields: FieldConfig[] = [
  { key: 'year', label: 'Year', type: 'number', required: true },
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
  { key: 'doc_url', label: 'Document', type: 'text', documentUpload: true },
  { key: 'status', label: 'Status', type: 'select', options: ['latest', 'published', 'archived'] },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

const emptyDraft = {
  year: new Date().getFullYear(),
  title: '',
  description: '',
  doc_url: '',
  status: 'published',
  sort_order: 0,
  active: true,
};

export default function AnnualReportsPage() {
  return (
    <AdminCrudPage<AnnualReport>
      title="Annual Reports"
      singularLabel="Annual Report"
      table="mod_annual_reports"
      orderBy="sort_order"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      activeKey="active"
      softDelete
      searchKeys={['title']}
    />
  );
}
