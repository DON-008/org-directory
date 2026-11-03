import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, vi } from 'vitest';
import fixture from '../mock/organisations.fixture.json';
import { OrganisationsPage } from './organisation.model';
import { OrganisationStore } from './organisation.store';
import { OrganisationsApi } from './organisations.api';

const raw = fixture as unknown[];
type Behaviour = 'ok' | 'fail' | 'rate-limit';

class FakeApi {
  calls: number[] = [];
  constructor(private readonly behave: (offset: number, nth: number) => Behaviour = () => 'ok') {}

  getPage(offset: number, limit: number): Observable<OrganisationsPage> {
    this.calls.push(offset);
    const nth = this.calls.filter((o) => o === offset).length;
    switch (this.behave(offset, nth)) {
      case 'fail':
        return throwError(() => new HttpErrorResponse({ status: 500 }));
      case 'rate-limit':
        return throwError(
          () => new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '2' }) }),
        );
      default:
        return of({ items: raw.slice(offset, offset + limit), total: raw.length, limit, offset });
    }
  }
}

function setup(behave?: (offset: number, nth: number) => Behaviour) {
  const api = new FakeApi(behave);
  TestBed.configureTestingModule({ providers: [{ provide: OrganisationsApi, useValue: api }] });
  return { api, store: TestBed.inject(OrganisationStore) };
}

/** Runs load() while fake time moves forward, so the 60-second wait costs nothing. */
async function runLoad(store: OrganisationStore): Promise<void> {
  const done = store.load();
  await vi.advanceTimersByTimeAsync(300_000);
  await done;
}

describe('OrganisationStore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('loads all 137 records in 6 requests', async () => {
    const { api, store } = setup();
    await runLoad(store);
    expect(api.calls).toEqual([0, 25, 50, 75, 100, 125]);
    expect(store.loadedCount()).toBe(137);
    expect(store.isComplete()).toBe(true);
    expect(store.status()).toBe('ready');
  });

  it('retries a failed page once and still completes', async () => {
    const { api, store } = setup((offset, nth) => (offset === 50 && nth === 1 ? 'fail' : 'ok'));
    await runLoad(store);
    expect(api.calls.filter((o) => o === 50)).toHaveLength(2);
    expect(store.isComplete()).toBe(true);
  });

  it('keeps loaded rows when a page fails twice', async () => {
    const { store } = setup((offset) => (offset === 75 ? 'fail' : 'ok'));
    await runLoad(store);
    expect(store.failedOffsets()).toEqual([75]);
    expect(store.loadedCount()).toBe(112);
    expect(store.isComplete()).toBe(false);
    expect(store.status()).toBe('ready');
  });

  it('reports an error when page 1 fails, and recovers on retry', async () => {
    let healthy = false;
    const { store } = setup(() => (healthy ? 'ok' : 'fail'));
    await runLoad(store);
    expect(store.status()).toBe('error');
    expect(store.loadedCount()).toBe(0);

    healthy = true;
    await runLoad(store);
    expect(store.status()).toBe('ready');
    expect(store.isComplete()).toBe(true);
  });

  it('obeys a 429 and then succeeds', async () => {
    const { api, store } = setup((offset, nth) => (offset === 0 && nth === 1 ? 'rate-limit' : 'ok'));
    await runLoad(store);
    expect(api.calls.filter((o) => o === 0)).toHaveLength(2);
    expect(store.isComplete()).toBe(true);
  });

    it('shows a created organisation immediately and counts it', async () => {
    const { store } = setup();
    await runLoad(store);
    store.add({ id: 1000, name: 'Brand New', status: 'active', memberCount: 1, owner: { email: 'a@b.co' }, createdAt: '2026-01-01T00:00:00Z' });
    expect(store.loadedCount()).toBe(138);
    expect(store.total()).toBe(138);
    expect(store.isComplete()).toBe(true);
    expect(store.items().at(-1)?.name).toBe('Brand New');
  });

  it('does not treat a created row as a loaded page', async () => {
    const { store } = setup((offset) => (offset === 75 ? 'fail' : 'ok'));
    await runLoad(store);
    store.add({ id: 1000, name: 'Brand New' });
    expect(store.loadedCount()).toBe(113);
    expect(store.isComplete()).toBe(false);
  });
});