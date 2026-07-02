'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';

type HeroSlide = {
  id: number;
  image_url: string;
  alt_text: string;
  role_text: string;
  caption_text: string;
  sort_order: number;
  active: boolean;
};

const columns: ColumnConfig<HeroSlide>[] = [
  {
    label: 'Image',
    render: (item) =>
      item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt="" className="h-12 w-20 rounded object-cover" />
      ) : (
        <span className="text-brand-ink-4">—</span>
      ),
  },
  { label: 'Role', render: (item) => item.role_text },
  { label: 'Caption', render: (item) => <span className="line-clamp-2 max-w-xs">{item.caption_text}</span> },
];

const fields: FieldConfig[] = [
  { key: 'image_url', label: 'Image', type: 'text', required: true, imagePreview: true },
  { key: 'alt_text', label: 'Alt Text', type: 'text', required: true },
  { key: 'role_text', label: 'Role Text', type: 'text', required: true },
  { key: 'caption_text', label: 'Caption', type: 'textarea', required: true },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

const emptyDraft = {
  image_url: '',
  alt_text: '',
  role_text: '',
  caption_text: '',
  sort_order: 0,
  active: true,
};

export default function HeroSlidesPage() {
  return (
    <AdminCrudPage<HeroSlide>
      title="Hero Slides"
      singularLabel="Hero Slide"
      table="mod_hero_slides"
      orderBy="sort_order"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      activeKey="active"
    />
  );
}
