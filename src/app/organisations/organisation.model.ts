export const ORG_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type KnownStatus = (typeof ORG_STATUSES)[number];
export type OrgStatus = KnownStatus | 'unknown';

export type DataIssue =
  | 'missingName'
  | 'unknownStatus'
  | 'invalidMemberCount'
  | 'missingOwner'
  | 'invalidEmail'
  | 'invalidDate'
  | 'duplicateId';

/** Clean, UI-ready shape. Null always means "unknown or invalid", never zero. */
export interface Organisation {
  /** Unique per row. `id` alone is not safe because the fixture has duplicate ids. */
  key: string;
  id: number | null;
  name: string | null;
  status: OrgStatus;
  memberCount: number | null;
  ownerEmail: string | null;
  ownerEmailValid: boolean;
  createdAt: Date | null;
  issues: DataIssue[];
}

/** Response of GET /api/organisations. Items are `unknown` on purpose: we don't trust them. */
export interface OrganisationsPage {
  items: unknown[];
  total: number;
  limit: number;
  offset: number;
}