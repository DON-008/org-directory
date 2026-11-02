import fixture from '../mock/organisations.fixture.json';
import { normaliseOrganisation } from './normalise-organisation';
import { sortOrganisations } from './organisation-sort';

const all = (fixture as unknown[]).map((r, i) => normaliseOrganisation(r, i));
const make = (...names: (string | null)[]) => names.map((name, i) => normaliseOrganisation({ name }, i));

describe('sortOrganisations', () => {
  it('sorts names ignoring case, with unnamed rows last', () => {
    const sorted = sortOrganisations(make('banana', null, 'Apple', 'cherry'), 'name', 'asc');
    expect(sorted.map((o) => o.name)).toEqual(['Apple', 'banana', 'cherry', null]);
  });

  it('keeps unnamed rows last when descending', () => {
    const sorted = sortOrganisations(make('banana', null, 'Apple', 'cherry'), 'name', 'desc');
    expect(sorted.map((o) => o.name)).toEqual(['cherry', 'banana', 'Apple', null]);
  });

  it('sorts numbers inside names naturally', () => {
    const sorted = sortOrganisations(make('Org 10', 'Org 2'), 'name', 'asc');
    expect(sorted.map((o) => o.name)).toEqual(['Org 2', 'Org 10']);
  });

  it('sorts dates ascending and puts invalid dates last in both directions', () => {
    for (const dir of ['asc', 'desc'] as const) {
      const times = sortOrganisations(all, 'createdAt', dir).map((o) => o.createdAt?.getTime() ?? null);
      const firstNull = times.indexOf(null);
      expect(firstNull).toBeGreaterThan(0);
      expect(times.slice(firstNull).every((t) => t === null)).toBe(true);
      const valid = times.slice(0, firstNull) as number[];
      for (let i = 1; i < valid.length; i++) {
        expect(dir === 'asc' ? valid[i] >= valid[i - 1] : valid[i] <= valid[i - 1]).toBe(true);
      }
    }
  });

  it('does not change the input array', () => {
    const input = make('b', 'a');
    sortOrganisations(input, 'name', 'asc');
    expect(input.map((o) => o.name)).toEqual(['b', 'a']);
  });

  it('copes with the whole fixture, including Arabic names', () => {
    expect(() => sortOrganisations(all, 'name', 'asc')).not.toThrow();
  });
});