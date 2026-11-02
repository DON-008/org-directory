import { Organisation } from './organisation.model';

export type SortKey = 'name' | 'createdAt';
export type SortDir = 'asc' | 'desc';

export const SORT_KEYS: readonly SortKey[] = ['name', 'createdAt'];
export const DEFAULT_SORT: { key: SortKey; dir: SortDir } = { key: 'name', dir: 'asc' };

/** Case-insensitive, accent-insensitive, "Org 2" before "Org 10", and works for Arabic. */
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/** To make a new column sortable: add its key to SortKey and SORT_KEYS, then one line here. */
const COLUMNS: Record<SortKey, (org: Organisation) => string | number | null> = {
  name: (org) => org.name,
  createdAt: (org) => org.createdAt?.getTime() ?? null,
};

function compareValues(a: string | number, b: string | number): number {
  return typeof a === 'string' && typeof b === 'string' ? collator.compare(a, b) : Number(a) - Number(b);
}

/** Returns a new sorted array. Rows with no value always come last, in both directions. */
export function sortOrganisations(list: readonly Organisation[], key: SortKey, dir: SortDir): Organisation[] {
  const read = COLUMNS[key];
  const sign = dir === 'asc' ? 1 : -1;
  return [...list].sort((x, y) => {
    const a = read(x);
    const b = read(y);
    if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
    return sign * compareValues(a, b);
  });
}