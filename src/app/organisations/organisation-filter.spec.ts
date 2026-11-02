import fixture from '../mock/organisations.fixture.json';
import { normaliseOrganisation } from './normalise-organisation';
import { filterOrganisations } from './organisation-filter';

const all = (fixture as unknown[]).map((r, i) => normaliseOrganisation(r, i));
const make = (...names: (string | null)[]) => names.map((name, i) => normaliseOrganisation({ name }, i));

describe('filterOrganisations', () => {
  it('returns everything when there is no query and no status filter', () => {
    expect(filterOrganisations(all, '', 'all')).toHaveLength(137);
  });

  it('ignores case and surrounding spaces', () => {
    expect(filterOrganisations(all, '  northwind ', 'all')).toHaveLength(2);
  });

  it('matches names that differ only by case', () => {
    expect(filterOrganisations(all, 'globex', 'all')).toHaveLength(3);
  });

  it('ignores accents', () => {
    expect(filterOrganisations(make('Café Noir', 'Other'), 'cafe', 'all')).toHaveLength(1);
  });

  it('finds Arabic names, with or without the hamza', () => {
    expect(filterOrganisations(all, 'الأمل', 'all').map((o) => o.name)).toEqual(['شركة الأمل 🚀']);
    expect(filterOrganisations(all, 'الامل', 'all')).toHaveLength(1);
  });

  it('never matches unnamed rows when searching, but keeps them when not', () => {
    const list = make('Alpha', null);
    expect(filterOrganisations(list, 'a', 'all')).toHaveLength(1);
    expect(filterOrganisations(list, '', 'all')).toHaveLength(2);
  });

  it('filters by status, including unknown', () => {
    const unknown = filterOrganisations(all, '', 'unknown');
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown.every((o) => o.status === 'unknown')).toBe(true);
  });

  it('combines query and status', () => {
    const result = filterOrganisations(all, 'globex', 'suspended');
    expect(result.map((o) => o.id)).toEqual([42]);
  });
});