import { AbstractControl, ValidatorFn } from '@angular/forms';
import { normaliseName } from '../shared/normalise-name';
import { EMAIL_PATTERN } from './normalise-organisation';

export const NAME_MIN = 3;
export const NAME_MAX = 80;

const text = (control: AbstractControl): string =>
  typeof control.value === 'string' ? control.value.trim() : '';

/** Validators.required accepts "   ", so trim first. */
export const requiredText: ValidatorFn = (control) => (text(control) === '' ? { required: true } : null);

/** Required, then 3 to 80 characters after trimming. Counts characters, so an emoji counts as one. */
export const nameValidator: ValidatorFn = (control) => {
  const value = text(control);
  if (value === '') return { required: true };
  const length = [...value].length;
  if (length < NAME_MIN) return { minlength: true };
  if (length > NAME_MAX) return { maxlength: true };
  return null;
};

/** Compares in the canonical form from Step 2: ignores case, outer spaces and repeated spaces. */
export function uniqueNameValidator(taken: () => ReadonlySet<string>): ValidatorFn {
  return (control) => {
    const value = text(control);
    return value !== '' && taken().has(normaliseName(value)) ? { taken: true } : null;
  };
}

/** Validators.email accepts "a@b". This one needs a dot after the @. Empty is left to requiredText. */
export const emailValidator: ValidatorFn = (control) => {
  const value = text(control);
  return value === '' || EMAIL_PATTERN.test(value) ? null : { email: true };
};

/** Optional. When present: a whole number, 0 or more. */
export const memberCountValidator: ValidatorFn = (control) => {
  const value: unknown = control.value;
  if (value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) return { integer: true };
  return value < 0 ? { min: true } : null;
};