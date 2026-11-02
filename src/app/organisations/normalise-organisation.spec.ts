import fixture from '../mock/organisations.fixture.json';
import { normaliseName } from '../shared/normalise-name';
import { flagDuplicateIds, normaliseOrganisation } from './normalise-organisation';

const raw = fixture as unknown[];
const at = (index: number) => normaliseOrganisation(raw[index], index);

describe('normaliseOrganisation', () => {
  it('maps a clean record without issues', () => {
    const org = at(0);
    expect(org.name).toBe('Northwind Traders');
    expect(org.status).toBe('active');
    expect(org.memberCount).toBe(42);
    expect(org.ownerEmailValid).toBe(true);
    expect(org.createdAt?.toISOString()).toBe('2024-03-11T09:12:00.000Z');
    expect(org.issues).toEqual([]);
  });

  it('handles empty name, uppercase status, string count and epoch date (id 2)', () => {
    const org = at(1);
    expect(org.name).toBeNull();
    expect(org.status).toBe('active');
    expect(org.memberCount).toBe(12);
    expect(org.createdAt).toBeInstanceOf(Date);
    expect(org.issues).toEqual(['missingName']);
  });

  it('handles null name, negative count and missing owner (id 3)', () => {
    const org = at(2);
    expect(org.name).toBeNull();
    expect(org.status).toBe('active');
    expect(org.memberCount).toBeNull();
    expect(org.ownerEmail).toBeNull();
    expect(org.issues).toEqual(['missingName', 'invalidMemberCount', 'missingOwner']);
  });

  it('does not guess typos in status', () => {
    const org = at(4); // "actve"
    expect(org.status).toBe('unknown');
    expect(org.issues).toContain('unknownStatus');
  });

  it('keeps Arabic text and emoji unchanged', () => {
    expect(at(5).name).toBe('شركة الأمل 🚀');
  });

  it('keeps a zero member count as 0', () => {
    expect(at(6).memberCount).toBe(0);
  });

  it('flags null status, null count, bad email and bad date (id 8)', () => {
    const org = at(7);
    expect(org.status).toBe('unknown');
    expect(org.memberCount).toBeNull();
    expect(org.ownerEmail).toBe('not-an-email');
    expect(org.ownerEmailValid).toBe(false);
    expect(org.createdAt).toBeNull();
    expect(org.issues).toEqual(['unknownStatus', 'invalidMemberCount', 'invalidEmail', 'invalidDate']);
  });

  it('survives garbage input', () => {
    for (const bad of [null, undefined, 42, 'text', [], {}]) {
      expect(() => normaliseOrganisation(bad, 0)).not.toThrow();
    }
    expect(normaliseOrganisation(null, 0).name).toBeNull();
  });
});

describe('whole fixture', () => {
  const all = raw.map((r, i) => normaliseOrganisation(r, i));

  it('has 137 records and unique keys', () => {
    expect(all).toHaveLength(137);
    expect(new Set(all.map((o) => o.key)).size).toBe(137);
  });

  it('flags both records that share id 42', () => {
    const flagged = flagDuplicateIds(all).filter((o) => o.issues.includes('duplicateId'));
    expect(flagged.map((o) => o.id)).toEqual([42, 42]);
  });
});

describe('normaliseName', () => {
  it('ignores case, outer whitespace and repeated spaces', () => {
    expect(normaliseName('  Northwind   TRADERS ')).toBe(normaliseName('northwind traders'));
  });
});