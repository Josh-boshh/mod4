'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';
import { resolveImageUrl } from '@/lib/admin/resolveImageUrl';

type Leader = {
  id: number;
  position_key: string;
  title: string;
  name: string;
  bio: string;
  photo_url: string;
  profile_link: string;
  sort_order: number;
  active: boolean;
};

const columns: ColumnConfig<Leader>[] = [
  {
    label: 'Photo',
    render: (item) =>
      item.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveImageUrl(item.photo_url)} alt="" className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <span className="text-brand-ink-4">—</span>
      ),
  },
  { label: 'Name', render: (item) => item.name },
  { label: 'Title', render: (item) => item.title },
];

const fields: FieldConfig[] = [
  { key: 'position_key', label: 'Position Key', type: 'text', required: true },
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'bio', label: 'Bio', type: 'textarea' },
  { key: 'photo_url', label: 'Photo', type: 'text', imagePreview: true },
  { key: 'profile_link', label: 'Profile Link', type: 'text' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

const emptyDraft = {
  position_key: '',
  title: '',
  name: '',
  bio: '',
  photo_url: '',
  profile_link: '',
  sort_order: 0,
  active: true,
};

export default function LeadersPage() {
  return (
    <AdminCrudPage<Leader>
      title="Leaders"
      singularLabel="Leader"
      table="mod_leaders"
      orderBy="sort_order"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      activeKey="active"
    />
  );
}
