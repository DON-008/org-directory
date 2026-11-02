import {
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { normaliseName } from '../shared/normalise-name';
import fixture from './organisations.fixture.json';

const PAGE_LIMIT_MAX = 25;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const DELAY_MIN_MS = 400;
const DELAY_MAX_MS = 900;
const DEFAULT_FAIL_RATE = 0.15;

/** `?failRate=0` makes demos and debugging predictable. */
function readFailRate(): number {
  const raw = new URLSearchParams(globalThis.location?.search ?? '').get('failRate');
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : DEFAULT_FAIL_RATE;
}

const failRate = readFailRate();
const requestTimes: number[] = []; // list requests that were not rate-limited
const created: unknown[] = []; // records added through POST

const randomDelay = () => DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
const database = (): unknown[] => [...(fixture as unknown[]), ...created];

function after<T>(ms: number, make: () => Observable<T>): Observable<T> {
  return timer(ms).pipe(mergeMap(make));
}

function nameOf(record: unknown): string | null {
  const name = (record as { name?: unknown } | null)?.name;
  return typeof name === 'string' ? name : null;
}

function handleList(url: string, params: HttpParams): Observable<HttpEvent<unknown>> {
  const now = Date.now();
  while (requestTimes.length && now - requestTimes[0] >= RATE_WINDOW_MS) requestTimes.shift();

  if (requestTimes.length >= RATE_LIMIT) {
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - requestTimes[0])) / 1000);
    console.debug(`[mock] GET list -> 429 (retry after ${retryAfter}s)`);
    return after(50, () =>
      throwError(
        () =>
          new HttpErrorResponse({
            url,
            status: 429,
            statusText: 'Too Many Requests',
            headers: new HttpHeaders({ 'Retry-After': String(retryAfter) }),
          }),
      ),
    );
  }
  requestTimes.push(now); // failed requests count against the budget too

  const limit = Math.min(Number(params.get('limit')) || PAGE_LIMIT_MAX, PAGE_LIMIT_MAX);
  const offset = Math.max(Number(params.get('offset')) || 0, 0);

  return after(randomDelay(), () => {
    if (Math.random() < failRate) {
      console.debug(`[mock] GET offset=${offset} -> 500 (${requestTimes.length}/${RATE_LIMIT} used)`);
      return throwError(
        () => new HttpErrorResponse({ url, status: 500, statusText: 'Internal Server Error' }),
      );
    }
    const all = database();
    console.debug(`[mock] GET offset=${offset} -> 200 (${requestTimes.length}/${RATE_LIMIT} used)`);
    return of(
      new HttpResponse({
        status: 200,
        body: { items: all.slice(offset, offset + limit), total: all.length, limit, offset },
      }),
    );
  });
}

function handleCreate(url: string, body: unknown): Observable<HttpEvent<unknown>> {
  const input = body as { name: string; status: string; ownerEmail: string; memberCount: number | null };
  return after(randomDelay(), () => {
    const wanted = normaliseName(input.name);
    const taken = wanted !== '' && database().some((r) => {
      const existing = nameOf(r);
      return existing !== null && normaliseName(existing) === wanted;
    });
    if (taken) {
      return throwError(
        () => new HttpErrorResponse({ url, status: 409, statusText: 'Conflict', error: { code: 'NAME_TAKEN' } }),
      );
    }
    const record = {
      id: 1000 + created.length,
      name: input.name.trim(),
      status: input.status,
      memberCount: input.memberCount,
      owner: { email: input.ownerEmail },
      createdAt: new Date().toISOString(),
    };
    created.push(record);
    return of(new HttpResponse({ status: 201, body: record }));
  });
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url !== '/api/organisations') return next(req);
  if (req.method === 'GET') return handleList(req.url, req.params);
  if (req.method === 'POST') return handleCreate(req.url, req.body);
  return next(req);
};