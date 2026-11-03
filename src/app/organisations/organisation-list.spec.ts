import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { I18nService } from '../i18n/i18n.service';
import { normaliseOrganisation } from './normalise-organisation';
import { Organisation } from './organisation.model';
import { LoadStatus, OrganisationStore } from './organisation.store';
import { OrganisationList } from './organisation-list';

class FakeStore {
  status = signal<LoadStatus>('ready');
  items = signal<Organisation[]>([]);
  total = signal<number | null>(0);
  loadedCount = computed(() => this.items().length);
  isComplete = signal(true);
  rateLimited = signal(false);
  fetching = signal(false);
  failedOffsets = signal<number[]>([]);
  load = vi.fn();
}

const org = (name: string, i: number) => normaliseOrganisation({ id: i, name, status: 'active' }, i);

async function render(setup: (store: FakeStore) => void, queryParams: Record<string, string> = {}) {
  const store = new FakeStore();
  setup(store);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '', children: [] }]),
      { provide: OrganisationStore, useValue: store },
      { provide: I18nService, useValue: { t: (key: string) => key } },
    ],
  });
  if (Object.keys(queryParams).length) {
    await TestBed.inject(Router).navigate([], { queryParams });
  }
  const fixture = TestBed.createComponent(OrganisationList);
  await fixture.whenStable();
  store.load.mockClear(); // ignore the call the constructor makes
  const el = fixture.nativeElement as HTMLElement;
  return { store, fixture, el, panel: (kind: string) => el.querySelector(`[data-kind="${kind}"]`) };
}

describe('OrganisationList states', () => {
  it('shows a skeleton while page 1 loads', async () => {
    const { el } = await render((s) => s.status.set('loading'));
    expect(el.querySelector('.skeleton')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it('shows an alert with a working retry when page 1 fails', async () => {
    const { el, store, fixture, panel } = await render((s) => s.status.set('error'));
    expect(panel('error')?.getAttribute('role')).toBe('alert');
    el.querySelector<HTMLButtonElement>('.action')!.click();
    await fixture.whenStable();
    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('keeps the rows and warns when some pages failed', async () => {
    const { el, panel } = await render((s) => {
      s.items.set([org('Alpha', 1), org('Beta', 2)]);
      s.total.set(137);
      s.isComplete.set(false);
      s.failedOffsets.set([75]);
    });
    expect(panel('warning')).not.toBeNull();
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('shows the empty state when the API has no organisations', async () => {
    const { panel, el } = await render(() => undefined);
    expect(panel('empty')).not.toBeNull();
    expect(panel('noResults')).toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it('shows no-results with Clear filters when a search matches nothing', async () => {
    const { panel, el } = await render(
      (s) => {
        s.items.set([org('Alpha', 1), org('Beta', 2)]);
        s.total.set(2);
      },
      { q: 'zzz' },
    );
    expect(panel('noResults')).not.toBeNull();
    expect(panel('empty')).toBeNull();
    expect(el.querySelector('.action')).not.toBeNull();
  });
});