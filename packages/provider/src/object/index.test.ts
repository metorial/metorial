import { describe, expect, it } from 'vitest';
import { pickDefined, setIfDefined } from './index';

describe('object helpers', () => {
  it('omits only undefined values', () => {
    expect(
      pickDefined({
        keepNull: null,
        keepFalse: false,
        keepZero: 0,
        keepEmpty: '',
        dropUndefined: undefined
      })
    ).toEqual({
      keepNull: null,
      keepFalse: false,
      keepZero: 0,
      keepEmpty: ''
    });
  });

  it('sets only defined values on an existing target', () => {
    let target: Record<string, unknown> = {};

    setIfDefined(target, 'nullValue', null);
    setIfDefined(target, 'falseValue', false);
    setIfDefined(target, 'zeroValue', 0);
    setIfDefined(target, 'emptyValue', '');
    setIfDefined(target, 'undefinedValue', undefined);

    expect(target).toEqual({
      nullValue: null,
      falseValue: false,
      zeroValue: 0,
      emptyValue: ''
    });
  });
});
