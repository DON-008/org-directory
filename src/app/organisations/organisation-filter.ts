import { Organisation } from './organisation.model';
import { StatusFilter } from './organisation-view-params';

/** Search form: no accents, no case, single spaces. "Café" matches "cafe"; Arabic "الأمل" matches "الامل". */
export function normaliseSearch(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

/** Search matches the name only. Unnamed rows never match a search, but do show when there is none. */
export function filterOrganisations(
  list: readonly Organisation[],
  query: string,
  status: StatusFilter,
): Organisation[] {
  const needle = normaliseSearch(query);
  return list.filter((org) => {
    if (status !== 'all' && org.status !== status) return false;
    if (needle === '') return true;
    return org.name !== null && normaliseSearch(org.name).includes(needle);
  });
}