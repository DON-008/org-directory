import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../i18n/i18n.service';
import { TPipe } from '../i18n/t.pipe';
import { normaliseName } from '../shared/normalise-name';
import { KnownStatus, NewOrganisationInput, ORG_STATUSES } from './organisation.model';
import { OrganisationStore } from './organisation.store';
import {
  NAME_MAX,
  NAME_MIN,
  emailValidator,
  memberCountValidator,
  nameValidator,
  requiredText,
  uniqueNameValidator,
} from './organisation-validators';
import { OrganisationsApi } from './organisations.api';

type FieldName = 'name' | 'ownerEmail' | 'status' | 'memberCount';
const FIELD_ORDER: readonly FieldName[] = ['name', 'ownerEmail', 'status', 'memberCount'];

interface SummaryItem {
  field: FieldName;
  message: string;
}

@Component({
  selector: 'app-organisation-form',
  imports: [ReactiveFormsModule, RouterLink, TPipe],
  templateUrl: './organisation-form.html',
  styleUrl: './organisation-form.css',
})
export class OrganisationForm {
  protected readonly store = inject(OrganisationStore);
  private readonly api = inject(OrganisationsApi);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly nameMin = NAME_MIN;
  protected readonly nameMax = NAME_MAX;
  protected readonly statuses = ORG_STATUSES;

  /** Names already in use, in the canonical form. Used for the instant client-side check. */
  private readonly takenNames = computed(() => {
    const names = new Set<string>();
    for (const org of this.store.items()) {
      if (org.name !== null) names.add(normaliseName(org.name));
    }
    return names;
  });

  protected readonly form = this.fb.group({
    name: this.fb.control('', [nameValidator, uniqueNameValidator(() => this.takenNames())]),
    ownerEmail: this.fb.control('', [requiredText, emailValidator]),
    status: this.fb.control<KnownStatus>('active'),
    memberCount: this.fb.control<number | null>(null, [memberCountValidator]),
  });

  protected readonly submitting = signal(false);
  protected readonly serverError = signal(false);
  /** A snapshot taken on each submit attempt, so a screen reader isn't re-announced on every keystroke. */
  protected readonly summary = signal<SummaryItem[]>([]);

  constructor() {
    void this.store.load(); // needed when the user opens /new directly

    // When more pages arrive, re-check the name against the larger list.
    effect(() => {
      this.takenNames();
      untracked(() => this.form.controls.name.updateValueAndValidity());
    });
  }

  protected showError(field: FieldName): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  protected errorText(field: FieldName): string | null {
    const errors = this.form.controls[field].errors;
    if (!errors) return null;
    const code = Object.keys(errors)[0];
    return this.i18n.t(`form.errors.${field}.${code}`, { min: NAME_MIN, max: NAME_MAX });
  }

  protected onSummaryLink(event: Event, field: FieldName): void {
    event.preventDefault();
    this.focusField(field);
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) return;
    this.serverError.set(false);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.summary.set(this.collectSummary());
      this.focusFirstInvalid();
      return;
    }
    this.summary.set([]);

    const value = this.form.getRawValue();
    const input: NewOrganisationInput = {
      name: value.name.trim(),
      status: value.status,
      ownerEmail: value.ownerEmail.trim(),
      memberCount: value.memberCount,
    };

    this.submitting.set(true);
    try {
      const created = await firstValueFrom(this.api.create(input));
      this.store.add(created);
      await this.router.navigate(['/'], { queryParamsHandling: 'preserve' });
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        // The server knows names the client hasn't loaded yet.
        this.form.controls.name.setErrors({ taken: true });
        this.form.controls.name.markAsTouched();
        this.summary.set(this.collectSummary());
        this.focusFirstInvalid();
      } else {
        this.serverError.set(true);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  private collectSummary(): SummaryItem[] {
    return FIELD_ORDER.filter((field) => this.form.controls[field].invalid).map((field) => ({
      field,
      message: this.errorText(field) ?? '',
    }));
  }

  private focusFirstInvalid(): void {
    const field = FIELD_ORDER.find((name) => this.form.controls[name].invalid);
    if (field) this.focusField(field);
  }

  private focusField(field: FieldName): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#field-${field}`)?.focus();
  }
}