import { ParamMap, Params } from '@angular/router';
import { ORG_STATUSES } from './organisation.model';
import { DEFAULT_SORT, SORT_KEYS, SortDir, SortKey } from './organisation-sort';

export const STATUS_FILTERS = ['all', ...ORG_STATUSES, 'unknown'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export interface ViewParams {
  q: string;
  status: StatusFilter;
  sort: SortKey;
  dir: SortDir;
}

const MAX_QUERY_LENGTH = 100;

export function isStatusFilter(value: unknown): value is StatusFilter {
  return (STATUS_FILTERS as readonly unknown[]).includes(value);
}

/** Reads the URL. Anything invalid falls back to the default. */
export function parseViewParams(map: ParamMap): ViewParams {
  const status = map.get('status');
  const sort = map.get('sort');
  const dir = map.get('dir');
  return {
    q: (map.get('q') ?? '').slice(0, MAX_QUERY_LENGTH),
    status: isStatusFilter(status) ? status : 'all',
    sort: (SORT_KEYS as readonly string[]).includes(sort ?? '') ? (sort as SortKey) : DEFAULT_SORT.key,
    dir: dir === 'asc' || dir === 'desc' ? dir : DEFAULT_SORT.dir,
  };
}

/** Writes the URL. Values equal to the default are left out. */
export function toQueryParams(view: ViewParams): Params {
  const q = view.q.trim();
  return {
    q: q === '' ? null : q,
    status: view.status === 'all' ? null : view.status,
    sort: view.sort === DEFAULT_SORT.key ? null : view.sort,
    dir: view.dir === DEFAULT_SORT.dir ? null : view.dir,
  };
}