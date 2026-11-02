import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { sleep } from '../shared/sleep';
import { SlidingWindowLimiter } from '../shared/sliding-window-limiter';
import { Organisation, OrganisationsPage } from './organisation.model';
import { flagDuplicateIds, normaliseOrganisation } from './normalise-organisation';
import { OrganisationsApi } from './organisations.api';

const PAGE_SIZE = 25;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 2; // first try plus one retry
const MAX_RATE_LIMIT_WAITS = 3;
const RETRY_BACKOFF_MS = 500;

/** idle: not started. loading: page 1 pending, nothing to show. ready: rows shown. error: page 1 failed. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

function isPage(value: unknown): value is OrganisationsPage {
  const page = value as Partial<OrganisationsPage> | null;
  return !!page && Array.isArray(page.items) && typeof page.total === 'number';
}

function retryAfterMs(error: HttpErrorResponse): number {
  const seconds = Number(error.headers?.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : RATE_WINDOW_MS;
}

@Injectable({ providedIn: 'root' })
export class OrganisationStore {
  private readonly api = inject(OrganisationsApi);
  private readonly limiter = new SlidingWindowLimiter(RATE_LIMIT, RATE_WINDOW_MS);
  private running = false;

  private readonly pages = signal<ReadonlyMap<number, Organisation[]>>(new Map());
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _total = signal<number | null>(null);
  private readonly _fetching = signal(false);
  private readonly _rateLimited = signal(false);
  private readonly _failedOffsets = signal<number[]>([]);

  readonly status = this._status.asReadonly();
  /** Total records the API says exist (137), or null before page 1 arrives. */
  readonly total = this._total.asReadonly();
  /** True while background pages are still being fetched. */
  readonly fetching = this._fetching.asReadonly();
  /** True while we are deliberately waiting for the rate-limit window. */
  readonly rateLimited = this._rateLimited.asReadonly();
  /** Offsets of pages that failed even after a retry. */
  readonly failedOffsets = this._failedOffsets.asReadonly();

  readonly items = computed<Organisation[]>(() => {
    const ordered = [...this.pages().entries()]
      .sort(([a], [b]) => a - b)
      .flatMap(([, list]) => list);
    return flagDuplicateIds(ordered);
  });
  readonly loadedCount = computed(() => this.items().length);
  readonly isComplete = computed(() => {
    const total = this._total();
    return total !== null && this.loadedCount() >= total;
  });

  /** Loads page 1, then every other page we don't have yet. Safe to call again to retry. */
  async load(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this._failedOffsets.set([]);
    this._fetching.set(true);
    try {
      let total = this._total();
      if (total === null) {
        if (this._status() !== 'ready') this._status.set('loading');
        const first = await this.fetchPage(0);
        if (!first) {
          this._status.set('error');
          return;
        }
        total = first.total;
        this._total.set(total);
        this.storePage(0, first);
        this._status.set('ready');
      }

      const failed: number[] = [];
      for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) {
        if (this.pages().has(offset)) continue;
        const page = await this.fetchPage(offset);
        if (page) this.storePage(offset, page);
        else failed.push(offset);
      }
      this._failedOffsets.set(failed);
    } finally {
      this._fetching.set(false);
      this.running = false;
    }
  }

  private storePage(offset: number, page: OrganisationsPage): void {
    // The index passed to the normaliser is the record's position in the full list.
    const organisations = page.items.map((raw, i) => normaliseOrganisation(raw, offset + i));
    this.pages.update((map) => new Map(map).set(offset, organisations));
  }

  private async fetchPage(offset: number): Promise<OrganisationsPage | null> {
    let failures = 0;
    let rateLimitWaits = 0;
    while (failures < MAX_ATTEMPTS) {
      await this.waitForSlot();
      try {
        const body: unknown = await firstValueFrom(this.api.getPage(offset, PAGE_SIZE));
        if (!isPage(body)) throw new Error('Unexpected response shape');
        return body;
      } catch (error) {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 429 &&
          rateLimitWaits < MAX_RATE_LIMIT_WAITS
        ) {
          rateLimitWaits++;
          this.limiter.blockFor(retryAfterMs(error)); // our budget model was wrong; obey the server
          continue;
        }
        failures++;
        if (failures < MAX_ATTEMPTS) await sleep(RETRY_BACKOFF_MS);
      }
    }
    return null;
  }

  private async waitForSlot(): Promise<void> {
    if (this.limiter.msUntilSlot() > 0) this._rateLimited.set(true);
    await this.limiter.acquire();
    this._rateLimited.set(false);
  }
}