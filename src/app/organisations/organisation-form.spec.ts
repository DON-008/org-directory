import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { I18nService } from '../i18n/i18n.service';
import { normaliseOrganisation } from './normalise-organisation';
import { Organisation } from './organisation.model';
import { OrganisationStore } from './organisation.store';
import { OrganisationForm } from './organisation-form';
import { OrganisationsApi } from './organisations.api';

class FakeStore {
  items = signal<Organisation[]>([normaliseOrganisation({ id: 1, name: 'Alpha' }, 0)]);
  isComplete = signal(true);
  total = signal<number | null>(1);
  loadedCount = computed(() => this.items().length);
  load = vi.fn();
  add = vi.fn();
}

async function setup(createResult: Observable<unknown> = of({ id: 1000, name: 'Brand New' })) {
  const store = new FakeStore();
  const api = { create: vi.fn(() => createResult) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: OrganisationStore, useValue: store },
      { provide: OrganisationsApi, useValue: api },
      { provide: I18nService, useValue: { t: (key: string) => key } },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(OrganisationForm);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;

  const type = (selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  const fillValid = (name = 'Brand New') => {
    type('#field-name', name);
    type('#field-ownerEmail', 'owner@example.com');
  };
  return { store, api, navigate, fixture, el, type, submit, fillValid };
}

describe('OrganisationForm', () => {
  it('does not call the API for an empty form, shows a summary and focuses the first problem', async () => {
    const { api, el, submit } = await setup();
    await submit();
    expect(api.create).not.toHaveBeenCalled();
    expect(el.querySelector('.summary[role="alert"]')).not.toBeNull();
    expect(el.querySelector('#field-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('field-name');
  });

  it('flags a name that is already loaded, ignoring case and spacing', async () => {
    const { el, type, fixture } = await setup();
    type('#field-name', '  ALPHA ');
    await fixture.whenStable();
    expect(el.querySelector('#name-error')?.textContent).toContain('form.errors.name.taken');
  });

  it('shows an email error for an address without a dot', async () => {
    const { el, type, fixture } = await setup();
    type('#field-ownerEmail', 'a@b');
    await fixture.whenStable();
    expect(el.querySelector('#email-error')?.textContent).toContain('form.errors.ownerEmail.email');
  });

  it('shows the server-side name conflict as a field error', async () => {
    const { el, store, submit, fillValid } = await setup(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    fillValid();
    await submit();
    await vi.waitFor(() =>
      expect(el.querySelector('#name-error')?.textContent).toContain('form.errors.name.taken'),
    );
    expect(store.add).not.toHaveBeenCalled();
  });

  it('shows a general error when the server fails', async () => {
    const { el, submit, fillValid } = await setup(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    fillValid();
    await submit();
    await vi.waitFor(() => expect(el.textContent).toContain('form.serverErrorTitle'));
  });

  it('creates the organisation, adds it to the store and returns to the list', async () => {
    const { api, store, navigate, submit, fillValid } = await setup();
    fillValid('  Brand New  ');
    await submit();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(api.create).toHaveBeenCalledWith({
      name: 'Brand New',
      status: 'active',
      ownerEmail: 'owner@example.com',
      memberCount: null,
    });
    expect(store.add).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/'], { queryParamsHandling: 'preserve' });
  });
});