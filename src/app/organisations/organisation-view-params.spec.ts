import { convertToParamMap } from '@angular/router';
import { parseViewParams, toQueryParams } from './organisation-view-params';

describe('view params', () => {
  it('uses defaults for an empty URL', () => {
    expect(parseViewParams(convertToParamMap({}))).toEqual({ q: '', status: 'all', sort: 'name', dir: 'asc' });
  });

  it('ignores invalid values', () => {
    const view = parseViewParams(convertToParamMap({ status: 'banana', sort: 'zzz', dir: 'sideways' }));
    expect(view).toEqual({ q: '', status: 'all', sort: 'name', dir: 'asc' });
  });

  it('reads valid values', () => {
    const view = parseViewParams(
      convertToParamMap({ q: 'glo', status: 'suspended', sort: 'createdAt', dir: 'desc' }),
    );
    expect(view).toEqual({ q: 'glo', status: 'suspended', sort: 'createdAt', dir: 'desc' });
  });

  it('leaves default values out of the URL', () => {
    expect(toQueryParams({ q: '  ', status: 'all', sort: 'name', dir: 'asc' })).toEqual({
      q: null,
      status: null,
      sort: null,
      dir: null,
    });
  });

  it('writes non-default values', () => {
    expect(toQueryParams({ q: ' glo ', status: 'active', sort: 'createdAt', dir: 'desc' })).toEqual({
      q: 'glo',
      status: 'active',
      sort: 'createdAt',
      dir: 'desc',
    });
  });
});