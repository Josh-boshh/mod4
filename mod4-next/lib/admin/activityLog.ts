import { createClient } from '@/lib/supabase/client';

export type ActivityAction = 'insert' | 'update' | 'trash' | 'restore' | 'delete';

const SUMMARY_FIELDS = ['title', 'name', 'director', 'region', 'email', 'value'] as const;

function summarize(draft: Record<string, unknown> | undefined): string | null {
  if (!draft) return null;
  for (const key of SUMMARY_FIELDS) {
    const value = draft[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

// Best-effort: a failed activity-log write should never block the actual
// content change it's describing, so errors are swallowed (logged to the
// console for local debugging only).
export async function logActivity(
  action: ActivityAction,
  table: string,
  recordId: number | string | null | undefined,
  draft?: Record<string, unknown>
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const summary = summarize(draft);
    await supabase.from('mod_activity_log').insert({
      actor: user?.email?.split('@')[0] ?? 'unknown',
      action,
      table_name: table,
      record_id: recordId != null ? String(recordId) : null,
      summary,
    } as never);
  } catch (e) {
    console.warn('[activity log] failed to record entry:', e);
  }
}
