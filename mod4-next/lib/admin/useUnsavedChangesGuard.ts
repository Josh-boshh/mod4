'use client';

import { useEffect } from 'react';

// Warns on tab close/refresh while there are unsaved edits. In-app Cancel
// clicks can't be caught by beforeunload, so those are guarded separately
// with confirmDiscard() at the call site.
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}

export function confirmDiscard(isDirty: boolean): boolean {
  if (!isDirty) return true;
  return window.confirm('Discard unsaved changes?');
}
