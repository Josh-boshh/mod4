'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from './activityLog';

function withoutId(draft: Record<string, unknown>) {
  const rest = { ...draft };
  delete rest.id;
  return rest;
}

// Shared data layer for admin CRUD pages: every table management page needs
// the same fetch/insert/update/delete/reorder shape, calling supabase-js
// directly per the no-custom-backend architecture. List rendering stays
// per-page since columns and behaviors differ per table.
//
// softDelete: true routes remove() through a deleted_at timestamp instead of
// an actual DELETE, and excludes trashed rows from the normal list query —
// only pass this for tables that have a deleted_at column (see the Trash
// page for restore/purge).
export function useAdminTable<T extends { id: number }>(
  table: string,
  orderBy: keyof T & string,
  ascending = true,
  softDelete = false
) {
  const supabase = createClient();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    let query = supabase.from(table).select('*').order(orderBy, { ascending });
    if (softDelete) query = query.is('deleted_at', null);
    const { data, error } = await query;

    if (error) setError(error.message);
    else {
      setItems(data as T[]);
      setError(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, orderBy, ascending, softDelete]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  // supabase-js infers row types from a generated Database schema, which this
  // demo doesn't have — `table` is a plain string, so its row shape is opaque
  // to the client. Cast at the boundary rather than threading `any` upward.
  //
  // `id` is stripped from every payload here: it's a GENERATED ALWAYS AS
  // IDENTITY column, and edit forms are seeded from the full row (so their
  // draft state still carries the original `id` even though no field ever
  // edits it). Postgres rejects an UPDATE that assigns that column any value
  // at all — even its own unchanged value — with "column can only be
  // updated to DEFAULT". Insert has the same restriction, so it's dropped
  // there too for consistency, even though drafts for new rows don't have
  // an id to begin with.
  async function insert(draft: Partial<T>) {
    const clean = withoutId(draft as Record<string, unknown>);
    const { data, error } = await supabase.from(table).insert(clean as never).select('id').single();
    if (error) return error.message;
    logActivity('insert', table, (data as { id: number } | null)?.id, clean);
    await reload();
    return null;
  }

  async function update(id: number, draft: Partial<T>) {
    const clean = withoutId(draft as Record<string, unknown>);
    const { error } = await supabase.from(table).update(clean as never).eq('id', id);
    if (error) return error.message;
    logActivity('update', table, id, clean);
    await reload();
    return null;
  }

  async function remove(id: number) {
    const target = items.find((i) => i.id === id) as Record<string, unknown> | undefined;
    if (softDelete) {
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) {
        setError(error.message);
        return false;
      }
      logActivity('trash', table, id, target);
    } else {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        setError(error.message);
        return false;
      }
      logActivity('delete', table, id, target);
    }
    await reload();
    return true;
  }

  async function move(item: T, direction: 'up' | 'down', orderKey: keyof T = orderBy) {
    const index = items.findIndex((i) => i.id === item.id);
    const swapItem = items[direction === 'up' ? index - 1 : index + 1];
    if (!swapItem) return;

    // Two updates, not upsert: `id` is a GENERATED ALWAYS AS IDENTITY column,
    // and upsert's underlying INSERT ... ON CONFLICT is rejected by Postgres
    // for writing an explicit value into that column.
    const [first, second] = await Promise.all([
      supabase.from(table).update({ [orderKey]: swapItem[orderKey] } as never).eq('id', item.id),
      supabase.from(table).update({ [orderKey]: item[orderKey] } as never).eq('id', swapItem.id),
    ]);
    if (first.error || second.error) {
      setError((first.error ?? second.error)!.message);
      return;
    }
    await reload();
  }

  return { items, loading, error, setError, reload, insert, update, remove, move };
}
