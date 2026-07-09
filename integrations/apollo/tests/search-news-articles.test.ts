import { describe, expect, test } from 'bun:test';
import { validatePublishedAtRange } from '../src/tools/search-news-articles';

let validationMessage = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return (error as { data?: { message?: unknown } }).data?.message;
  }

  return undefined;
};

describe('validatePublishedAtRange', () => {
  test('accepts a complete range or no range', () => {
    expect(validatePublishedAtRange(undefined, undefined)).toEqual({
      publishedAtMin: undefined,
      publishedAtMax: undefined
    });
    expect(validatePublishedAtRange('2026-06-21', '2026-07-04')).toEqual({
      publishedAtMin: '2026-06-21',
      publishedAtMax: '2026-07-04'
    });
  });

  test('rejects either incomplete range before calling Apollo', () => {
    for (let range of [
      ['2026-06-21', undefined],
      [undefined, '2026-07-04']
    ] as const) {
      expect(validationMessage(() => validatePublishedAtRange(...range))).toBe(
        'Provide both publishedAtMin and publishedAtMax, or omit both.'
      );
    }
  });

  test('rejects a reversed range', () => {
    expect(validationMessage(() => validatePublishedAtRange('2026-07-04', '2026-06-21'))).toBe(
      'publishedAtMin must be on or before publishedAtMax.'
    );
  });
});
