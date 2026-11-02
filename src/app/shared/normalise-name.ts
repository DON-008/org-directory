/** Canonical form used for case-insensitive uniqueness checks. */
export function normaliseName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}