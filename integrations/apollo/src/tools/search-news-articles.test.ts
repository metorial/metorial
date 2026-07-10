import { describe, expect, it } from 'vitest';
import { validatePublishedAtRange } from './search-news-articles';

let validationError = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return (error as { data?: { message?: unknown; reason?: unknown } }).data;
  }

  return undefined;
};

describe('validatePublishedAtRange', () => {
  it('accepts a complete range or no range', () => {
    expect(validatePublishedAtRange(undefined, undefined)).toEqual({
      publishedAtMin: undefined,
      publishedAtMax: undefined
    });
    expect(validatePublishedAtRange('2026-06-21', '2026-07-04')).toEqual({
      publishedAtMin: '2026-06-21',
      publishedAtMax: '2026-07-04'
    });
  });

  it('rejects either incomplete range before calling Apollo', () => {
    for (let range of [
      ['2026-06-21', undefined],
      [undefined, '2026-07-04']
    ] as const) {
      let data = validationError(() => validatePublishedAtRange(range[0], range[1]));

      expect(data?.message).toBe(
        'Provide both publishedAtMin and publishedAtMax, or omit both.'
      );
      expect(data?.reason).toBe('apollo_validation_error');
    }
  });

  it('rejects a reversed range', () => {
    expect(
      validationError(() => validatePublishedAtRange('2026-07-04', '2026-06-21'))?.message
    ).toBe('publishedAtMin must be on or before publishedAtMax.');
  });
});
