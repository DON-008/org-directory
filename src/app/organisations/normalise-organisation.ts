import { DataIssue, ORG_STATUSES, OrgStatus, Organisation } from './organisation.model';

// const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_START = /^\d{4}-\d{2}-\d{2}/;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function parseId(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Fix case and whitespace only. A typo like "actve" stays unknown; we never guess. */
function parseStatus(value: unknown): OrgStatus {
  if (typeof value !== 'string') return 'unknown';
  const lowered = value.trim().toLowerCase();
  return (ORG_STATUSES as readonly string[]).includes(lowered) ? (lowered as OrgStatus) : 'unknown';
}

/** Accepts non-negative integers, or digit-only strings such as "12". Anything else is null. */
function parseMemberCount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

/** Accepts epoch milliseconds or an ISO-style string. Anything else is null. */
function parseDate(value: unknown): Date | null {
  let date: Date | null = null;
  if (typeof value === 'number') date = new Date(value);
  else if (typeof value === 'string' && ISO_DATE_START.test(value.trim())) date = new Date(value.trim());
  return date !== null && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * @param raw   one untrusted record from the API
 * @param index position of the record in the API's full list; keeps `key` unique
 */
export function normaliseOrganisation(raw: unknown, index: number): Organisation {
  const record = asRecord(raw);
  const issues: DataIssue[] = [];

  const id = parseId(record['id']);
  const name = parseName(record['name']);
  if (name === null) issues.push('missingName');

  const status = parseStatus(record['status']);
  if (status === 'unknown') issues.push('unknownStatus');

  const memberCount = parseMemberCount(record['memberCount']);
  if (memberCount === null) issues.push('invalidMemberCount');

  const rawEmail = asRecord(record['owner'])['email'];
  const ownerEmail = typeof rawEmail === 'string' && rawEmail.trim() !== '' ? rawEmail.trim() : null;
  const ownerEmailValid = ownerEmail !== null && EMAIL_PATTERN.test(ownerEmail);
  if (ownerEmail === null) issues.push('missingOwner');
  else if (!ownerEmailValid) issues.push('invalidEmail');

  const createdAt = parseDate(record['createdAt']);
  if (createdAt === null) issues.push('invalidDate');

  return {
    key: `${id ?? 'x'}-${index}`,
    id,
    name,
    status,
    memberCount,
    ownerEmail,
    ownerEmailValid,
    createdAt,
    issues,
  };
}

/** Adds `duplicateId` to every row whose id appears more than once. Run it over the whole loaded list. */
export function flagDuplicateIds(list: Organisation[]): Organisation[] {
  const counts = new Map<number, number>();
  for (const org of list) {
    if (org.id !== null) counts.set(org.id, (counts.get(org.id) ?? 0) + 1);
  }
  return list.map((org) =>
    org.id !== null && (counts.get(org.id) ?? 0) > 1 && !org.issues.includes('duplicateId')
      ? { ...org, issues: [...org.issues, 'duplicateId'] }
      : org,
  );
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;{
  
}

