'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';

type Operation = {
  id: number;
  region: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
};

const columns: ColumnConfig<Operation>[] = [
  { label: 'Name', render: (item) => item.name },
  { label: 'Region', render: (item) => item.region },
  {
    label: 'Description',
    render: (item) => <span className="line-clamp-2 max-w-sm">{item.description}</span>,
  },
];

const fields: FieldConfig[] = [
  { key: 'name', label: 'Operation Name', type: 'text', required: true },
  { key: 'region', label: 'Region', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea', required: true, rows: 4 },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

const emptyDraft = {
  region: '',
  name: '',
  description: '',
  sort_order: 0,
  active: true,
};

export default function OperationsPage() {
  return (
    <AdminCrudPage<Operation>
      title="Operations"
      singularLabel="Operation"
      table="mod_operations"
      orderBy="sort_order"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      activeKey="active"
    />
  );
}
