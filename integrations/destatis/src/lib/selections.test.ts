import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { encodeContents, encodeSelections } from './selections';

describe('GENESIS structured selection encoding', () => {
  it('emits trimmed regional and numbered classifying form fields', () => {
    let form = new URLSearchParams();

    encodeSelections(
      form,
      { variableCode: ' DLAND ', valueCodes: [' 01 ', '*'] },
      [
        { variableCode: 'GES', valueCodes: ['1', '2'] },
        { variableCode: 'ALTER', valueCodes: ['A01'] }
      ],
      5
    );

    expect(form.toString()).toBe(
      'regionalvariable=DLAND&regionalkey=01%2C*&classifyingvariable1=GES&classifyingkey1=1%2C2&classifyingvariable2=ALTER&classifyingkey2=A01'
    );
  });

  it.each([
    [{ variableCode: '', valueCodes: ['01'] }, undefined],
    [{ variableCode: '1234567', valueCodes: ['01'] }, undefined],
    [{ variableCode: 'D,L', valueCodes: ['01'] }, undefined],
    [{ variableCode: 'D\u0000L', valueCodes: ['01'] }, undefined],
    [{ variableCode: 'DLAND', valueCodes: [] }, undefined],
    [{ variableCode: 'DLAND', valueCodes: ['123456789'] }, undefined],
    [{ variableCode: 'DLAND', valueCodes: ['   '] }, undefined]
  ])('rejects malformed regional selection %#', (regionalSelection, selections) => {
    expect(() =>
      encodeSelections(new URLSearchParams(), regionalSelection, selections, 5)
    ).toThrow(ServiceError);
  });

  it.each([
    { selections: [{ variableCode: '', valueCodes: ['A'] }] },
    { selections: [{ variableCode: '1234567', valueCodes: ['A'] }] },
    { selections: [{ variableCode: 'G,S', valueCodes: ['A'] }] },
    { selections: [{ variableCode: 'G\nS', valueCodes: ['A'] }] },
    { selections: [{ variableCode: 'GES', valueCodes: [] }] },
    { selections: [{ variableCode: 'GES', valueCodes: ['1234567890123456'] }] },
    { selections: [{ variableCode: 'GES', valueCodes: [''] }] }
  ])('rejects malformed classifying selection %#', ({ selections }) => {
    expect(() => encodeSelections(new URLSearchParams(), undefined, selections, 5)).toThrow(
      ServiceError
    );
  });

  it('rejects duplicate classifying variable codes after trimming', () => {
    expect(() =>
      encodeSelections(
        new URLSearchParams(),
        undefined,
        [
          { variableCode: 'GES', valueCodes: ['1'] },
          { variableCode: ' GES ', valueCodes: ['2'] }
        ],
        5
      )
    ).toThrow(/duplicate variableCode GES/);
  });

  it.each([
    ',',
    '1,2',
    'A\u0000B',
    'A\nB',
    'A\u007fB'
  ])('rejects ambiguous or control-bearing regional and classifying value code %s', valueCode => {
    expect(() =>
      encodeSelections(
        new URLSearchParams(),
        { variableCode: 'DLAND', valueCodes: [valueCode] },
        undefined,
        5
      )
    ).toThrow(ServiceError);
    expect(() =>
      encodeSelections(
        new URLSearchParams(),
        undefined,
        [{ variableCode: 'GES', valueCodes: [valueCode] }],
        5
      )
    ).toThrow(ServiceError);
  });

  it('preserves URL-encodable provider codes without creating or overwriting form keys', () => {
    let form = new URLSearchParams({ area: 'public', regionalkey: 'canonical' });
    encodeSelections(
      form,
      { variableCode: 'D&=/', valueCodes: ['A&B', 'A=B', 'A/B', 'A B'] },
      [{ variableCode: 'G &', valueCodes: ['X&Y', 'X=Y', 'X/Y', 'X Y'] }],
      5
    );

    expect(form.get('area')).toBe('public');
    expect(form.get('regionalvariable')).toBe('D&=/');
    expect(form.get('regionalkey')).toBe('A&B,A=B,A/B,A B');
    expect(form.get('classifyingvariable1')).toBe('G &');
    expect(form.get('classifyingkey1')).toBe('X&Y,X=Y,X/Y,X Y');
    expect([...form.keys()]).toEqual([
      'area',
      'regionalkey',
      'regionalvariable',
      'classifyingvariable1',
      'classifyingkey1'
    ]);
    expect(form.toString()).toContain('regionalvariable=D%26%3D%2F');
    expect(form.toString()).toContain('regionalkey=A%26B%2CA%3DB%2CA%2FB%2CA+B');
  });

  it('rejects empty classifying arrays and duplicate trimmed selection values', () => {
    expect(() => encodeSelections(new URLSearchParams(), undefined, [], 5)).toThrow(
      ServiceError
    );
    expect(() =>
      encodeSelections(
        new URLSearchParams(),
        { variableCode: 'DLAND', valueCodes: ['01', ' 01 '] },
        undefined,
        5
      )
    ).toThrow(/duplicate codes/i);
  });

  it('serializes bounded atomic contents and rejects ambiguous or duplicate codes', () => {
    let form = new URLSearchParams();
    encodeContents(form, [' BEV001 ', 'RATE-1', '*']);
    expect(form.toString()).toBe('contents=BEV001%2CRATE-1%2C*');

    for (let contents of [[','], ['1,2'], ['A\rB'], ['A\u007fB'], ['BEV', ' BEV '], []]) {
      expect(() => encodeContents(new URLSearchParams(), contents)).toThrow(ServiceError);
    }
  });

  it('serializes ampersands, equals signs, slashes, and internal spaces as literal contents', () => {
    let form = new URLSearchParams({ area: 'public' });
    encodeContents(form, ['A&B', 'A=B', 'A/B', 'A B']);

    expect(form.get('contents')).toBe('A&B,A=B,A/B,A B');
    expect([...form.keys()]).toEqual(['area', 'contents']);
    expect(form.toString()).toBe('area=public&contents=A%26B%2CA%3DB%2CA%2FB%2CA+B');
  });

  it.each([
    [3, 4],
    [5, 6]
  ])('enforces a maximum of %i classifying selections', (maximum, count) => {
    let selections = Array.from({ length: count }, (_, index) => ({
      variableCode: `V${index}`,
      valueCodes: ['*']
    }));
    expect(() =>
      encodeSelections(new URLSearchParams(), undefined, selections, maximum)
    ).toThrow(ServiceError);
  });
});
