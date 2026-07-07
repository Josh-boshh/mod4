'use client';

import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 20;

// Purely client-side pagination over an already-fetched array. Scoped to
// lists that grow unboundedly (Submissions, Form Submissions) rather than
// applied everywhere — most admin lists are hand-curated content (press
// items, gallery, etc.) with manual up/down reordering, which needs the
// full unpaginated list to find each row's neighbour; slicing those would
// break reordering across page boundaries.
export function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  return { page, setPage, pageCount, pageItems, pageSize: PAGE_SIZE };
}
