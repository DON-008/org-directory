import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { Organisation } from './organisation.model';
import { OrganisationStore } from './organisation.store';
import { DEFAULT_SORT, SortDir, SortKey, sortOrganisations } from './organisation-sort';
import { StatusIndicator } from './status-indicator';

@Component({
  selector: 'app-organisation-list',
  imports: [DatePipe, DecimalPipe, TPipe, StatusIndicator],
  templateUrl: './organisation-list.html',
  styleUrl: './organisation-list.css',
})
export class OrganisationList {
  protected readonly store = inject(OrganisationStore);
  private readonly i18n = inject(I18nService);

  // Step 6 replaces these two signals with values read from the URL.
  protected readonly sortKey = signal<SortKey>(DEFAULT_SORT.key);
  protected readonly sortDir = signal<SortDir>(DEFAULT_SORT.dir);

  protected readonly rows = computed(() =>
    sortOrganisations(this.store.items(), this.sortKey(), this.sortDir()),
  );

  constructor() {
    void this.store.load(); // safe to call again; it only fetches what is missing
  }

  protected toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected sortArrow(key: SortKey): string {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  protected issueText(org: Organisation): string {
    return org.issues.map((code) => this.i18n.t(`issues.${code}`)).join(', ');
  }
}