export type PressItem = {
  id: number;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  published_at: string; // YYYY-MM-DD
  image_url: string;
  link_url: string;
  slug: string;
  sort_order: number;
  active: boolean;
  // DB-generated (see supabase/migrations/0002_preview_tokens.sql) — never
  // set from the client, so it's excluded from the draft/insert/update shape.
  preview_token: string;
};

export type PressItemDraft = Omit<PressItem, 'id' | 'preview_token'>;

export const EMPTY_DRAFT: PressItemDraft = {
  title: '',
  excerpt: '',
  body: '',
  category: '',
  published_at: new Date().toISOString().slice(0, 10),
  image_url: '',
  link_url: '',
  slug: '',
  sort_order: 0,
  active: true,
};
