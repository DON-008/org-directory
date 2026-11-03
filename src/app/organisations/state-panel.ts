import { Component, computed, input } from '@angular/core';

export type StateKind = 'error' | 'warning' | 'empty' | 'noResults';

const ICONS: Record<StateKind, string> = {
  error: '✕',
  warning: '!',
  empty: '∅',
  noResults: '?',
};

/** One look for every message state. Text comes in already translated; actions are projected. */
@Component({
  selector: 'app-state-panel',
  template: `
    <div class="panel" [attr.data-kind]="kind()" [attr.role]="kind() === 'error' ? 'alert' : 'status'">
      <span class="icon" aria-hidden="true">{{ icon() }}</span>
      <div class="body">
        <h2>{{ heading() }}</h2>
        @if (message()) {
          <p>{{ message() }}</p>
        }
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .panel {
      --accent: var(--color-text-muted);
      display: flex;
      gap: var(--space-4);
      align-items: flex-start;
      margin-bottom: var(--space-4);
      padding: var(--space-4);
      border: var(--border-width) solid var(--color-border);
      border-inline-start: var(--border-width-accent) solid var(--accent);
      border-radius: var(--radius-1);
      background: var(--color-surface);
    }
    .panel[data-kind='error'] { --accent: var(--color-error); }
    .panel[data-kind='warning'] { --accent: var(--color-warning); }
    .panel[data-kind='noResults'] { --accent: var(--color-brand); }
    .icon {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: var(--size-icon);
      height: var(--size-icon);
      border: var(--border-width-2) solid var(--accent);
      border-radius: 50%;
      color: var(--accent);
      font-weight: var(--font-weight-strong);
    }
    h2 {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-2);
    }
    p {
      margin: 0 0 var(--space-3);
      color: var(--color-text-muted);
    }
  `,
})
export class StatePanel {
  readonly kind = input.required<StateKind>();
  readonly heading = input.required<string>();
  readonly message = input<string>('');
  protected readonly icon = computed(() => ICONS[this.kind()]);
}