import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router,RouterLink } from '@angular/router';
import { debounceTime, filter, map } from 'rxjs';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { Organisation } from './organisation.model';
import { OrganisationStore } from './organisation.store';
import { filterOrganisations } from './organisation-filter';
import { SortKey, sortOrganisations } from './organisation-sort';
import { STATUS_FILTERS, ViewParams, isStatusFilter, parseViewParams, toQueryParams } from './organisation-view-params';
import { StatusIndicator } from './status-indicator';
import { StatePanel } from './state-panel';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-organisation-list',
  imports: [DatePipe, DecimalPipe, TPipe, StatusIndicator, StatePanel ,RouterLink],
  templateUrl: './organisation-list.html',
  styleUrl: './organisation-list.css',
})
export class OrganisationList {
  protected readonly store = inject(OrganisationStore);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];

  /** The URL is the single source of truth for search, filter and sort. */
  protected readonly params = toSignal(this.route.queryParamMap.pipe(map(parseViewParams)), {
    initialValue: parseViewParams(this.route.snapshot.queryParamMap),
  });

  /** Only the text in the search box is kept separately, so typing feels instant. */
  protected readonly searchText = signal(this.params().q);
  private lastQuery = this.params().q;

  protected readonly hasActiveFilters = computed(
    () => this.params().q.trim() !== '' || this.params().status !== 'all',
  );
  protected readonly filtered = computed(() =>
    filterOrganisations(this.store.items(), this.params().q, this.params().status),
  );
  protected readonly rows = computed(() =>
    sortOrganisations(this.filtered(), this.params().sort, this.params().dir),
  );

  constructor() {
    void this.store.load(); // safe to call again; it only fetches what is missing

    // URL -> search box: back/forward and shared links. Skips changes we pushed ourselves.
    effect(() => {
      const urlQuery = this.params().q;
      if (urlQuery !== this.lastQuery) {
        this.lastQuery = urlQuery;
        this.searchText.set(urlQuery);
      }
    });

    // Search box -> URL, after the user pauses typing.
    toObservable(this.searchText)
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((text) => text.trim()),
        filter((query) => query !== this.params().q),
        takeUntilDestroyed(),
      )
      .subscribe((query) => {
        this.lastQuery = query;
        this.update({ q: query }, true);
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (isStatusFilter(value)) this.update({ status: value });
  }

  protected toggleSort(key: SortKey): void {
    const { sort, dir } = this.params();
    this.update(sort === key ? { dir: dir === 'asc' ? 'desc' : 'asc' } : { sort: key, dir: 'asc' });
  }

    protected retry(): void {
    void this.store.load(); // fetches only what is missing
  }

  protected clearFilters(): void {
    this.update({ q: '', status: 'all' });
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    const { sort, dir } = this.params();
    if (sort !== key) return 'none';
    return dir === 'asc' ? 'ascending' : 'descending';
  }

  protected sortArrow(key: SortKey): string {
    const { sort, dir } = this.params();
    if (sort !== key) return '';
    return dir === 'asc' ? '▲' : '▼';
  }

  protected issueText(org: Organisation): string {
    return org.issues.map((code) => this.i18n.t(`issues.${code}`)).join(', ');
  }

  private update(changes: Partial<ViewParams>, replaceUrl = false): void {
    const next: ViewParams = { ...this.params(), ...changes };
    void this.router.navigate([], { relativeTo: this.route, queryParams: toQueryParams(next), replaceUrl });
  }
}