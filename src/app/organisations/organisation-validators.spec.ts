import { FormControl } from '@angular/forms';
import { normaliseName } from '../shared/normalise-name';
import {
  emailValidator,
  memberCountValidator,
  nameValidator,
  uniqueNameValidator,
} from './organisation-validators';

const run = (validator: (c: FormControl) => unknown, value: unknown) =>
  validator(new FormControl(value));

describe('nameValidator', () => {
  it('requires a name, and treats spaces as empty', () => {
    expect(run(nameValidator, '')).toEqual({ required: true });
    expect(run(nameValidator, '    ')).toEqual({ required: true });
  });

  it('enforces 3 to 80 characters after trimming', () => {
    expect(run(nameValidator, ' ab ')).toEqual({ minlength: true });
    expect(run(nameValidator, 'a'.repeat(81))).toEqual({ maxlength: true });
    expect(run(nameValidator, '  Abc  ')).toBeNull();
    expect(run(nameValidator, 'a'.repeat(80))).toBeNull();
  });

  it('accepts Arabic names', () => {
    expect(run(nameValidator, 'شركة')).toBeNull();
  });
});

describe('uniqueNameValidator', () => {
  const taken = new Set([normaliseName('Northwind Traders')]);
  const validator = uniqueNameValidator(() => taken);

  it('rejects the same name regardless of case and spacing', () => {
    expect(run(validator, '  NORTHWIND   traders ')).toEqual({ taken: true });
  });

  it('accepts a new name, and leaves empty to the required rule', () => {
    expect(run(validator, 'Something else')).toBeNull();
    expect(run(validator, '')).toBeNull();
  });
});

describe('emailValidator', () => {
  it('needs a dot after the @', () => {
    expect(run(emailValidator, 'a@b')).toEqual({ email: true });
    expect(run(emailValidator, 'not-an-email')).toEqual({ email: true });
    expect(run(emailValidator, 'a@b.co')).toBeNull();
    expect(run(emailValidator, '')).toBeNull();
  });
});

describe('memberCountValidator', () => {
  it('is optional, whole and non-negative', () => {
    expect(run(memberCountValidator, null)).toBeNull();
    expect(run(memberCountValidator, 0)).toBeNull();
    expect(run(memberCountValidator, 12)).toBeNull();
    expect(run(memberCountValidator, -1)).toEqual({ min: true });
    expect(run(memberCountValidator, 1.5)).toEqual({ integer: true });
  });
});