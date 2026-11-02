import { Component, input } from '@angular/core';
import { TPipe } from '../i18n/t.pipe';
import { OrgStatus } from './organisation.model';

/** Dot (decorative) plus visible text label. Colour is never the only signal. */
@Component({
  selector: 'app-status-indicator',
  imports: [TPipe],
  template: `
    <span class="dot" [attr.data-status]="status()" aria-hidden="true"></span>
    <span class="label">{{ 'status.' + status() | t }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
    .dot {
      box-sizing: border-box;
      width: var(--size-dot);
      height: var(--size-dot);
      flex: none;
      border-radius: 50%;
      background: var(--color-status-unknown);
    }
    .dot[data-status='active'] { background: var(--color-status-active); }
    .dot[data-status='inactive'] { background: var(--color-status-inactive); }
    .dot[data-status='suspended'] { background: var(--color-status-suspended); }
    /* Unknown is a hollow ring, so it differs by shape and not only by shade. */
    .dot[data-status='unknown'] {
      background: transparent;
      border: var(--border-width-2) solid var(--color-status-unknown);
    }
    .label {
      color: var(--color-text-muted);
      font-size: var(--font-size-1);
    }
  `,
})
export class StatusIndicator {
  readonly status = input.required<OrgStatus>();
}