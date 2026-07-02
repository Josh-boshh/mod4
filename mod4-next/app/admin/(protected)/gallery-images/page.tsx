'use client';

import { AdminCrudPage } from '@/lib/admin/AdminCrudPage';
import type { ColumnConfig } from '@/lib/admin/AdminList';
import type { FieldConfig } from '@/lib/admin/fields';
import { resolveImageUrl } from '@/lib/admin/resolveImageUrl';

type GalleryImage = {
  id: number;
  image_url: string;
  alt_text: string;
  caption: string;
  event_date: string | null;
  category: string;
  sort_order: number;
  active: boolean;
};

const columns: ColumnConfig<GalleryImage>[] = [
  {
    label: 'Image',
    render: (item) =>
      item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveImageUrl(item.image_url)} alt="" className="h-12 w-20 rounded object-cover" />
      ) : (
        <span className="text-brand-ink-4">—</span>
      ),
  },
  { label: 'Caption', render: (item) => <span className="line-clamp-2 max-w-xs">{item.caption}</span> },
  { label: 'Category', render: (item) => item.category },
  { label: 'Event Date', render: (item) => item.event_date ?? '—' },
];

const fields: FieldConfig[] = [
  { key: 'image_url', label: 'Image', type: 'text', required: true, imagePreview: true },
  { key: 'alt_text', label: 'Alt Text', type: 'text' },
  { key: 'caption', label: 'Caption', type: 'textarea', required: true },
  { key: 'event_date', label: 'Event Date', type: 'date' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'sort_order', label: 'Sort Order', type: 'number' },
  { key: 'active', label: 'Active', type: 'checkbox' },
];

const emptyDraft = {
  image_url: '',
  alt_text: '',
  caption: '',
  event_date: '',
  category: 'General',
  sort_order: 0,
  active: true,
};

export default function GalleryImagesPage() {
  return (
    <AdminCrudPage<GalleryImage>
      title="Gallery Images"
      singularLabel="Gallery Image"
      table="mod_gallery_images"
      orderBy="sort_order"
      columns={columns}
      fields={fields}
      emptyDraft={emptyDraft}
      activeKey="active"
      softDelete
      searchKeys={['caption', 'category']}
    />
  );
}
