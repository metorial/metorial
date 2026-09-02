import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { flattenGenesisCatalog, normalizeGenesisResponse } from './response';

describe('normalizeGenesisResponse', () => {
  it('returns a code-0 payload without transport metadata or Parameter', () => {
    expect(
      normalizeGenesisResponse(
        {
          Status: { Code: '0', Content: 'Success', Type: 'Success' },
          Parameter: { username: 'must-not-escape' },
          Copyright: '© Destatis',
          Object: { Code: '12411-0001', Parameter: 'private transport detail' }
        },
        { operation: 'get metadata', select: payload => payload.Object }
      )
    ).toEqual({
      data: { Code: '12411-0001' },
      copyright: '© Destatis'
    });
  });

  it.each([
    ['Warning', 1],
    ['Warnung', 7]
  ])('keeps a localized %s with usable payload', (type, code) => {
    expect(
      normalizeGenesisResponse(
        {
          Status: { Code: code, Content: 'Partial result', Type: type },
          List: [{ Code: 'A' }]
        },
        { operation: 'list values', select: payload => payload.List }
      )
    ).toEqual({ data: [{ Code: 'A' }], warning: 'Partial result' });
  });

  it('turns code 104 into the caller-provided empty value only with explicit opt-in', () => {
    let noResult = {
      Status: { Code: 104, Content: 'No results found', Type: 'Warning' }
    };

    expect(
      normalizeGenesisResponse(noResult, {
        operation: 'find tables',
        allowNoResult: true,
        emptyValue: []
      })
    ).toEqual({ data: [], warning: 'No results found' });
    expect(() => normalizeGenesisResponse(noResult, { operation: 'get metadata' })).toThrow(
      expect.objectContaining({ data: expect.objectContaining({ upstreamCode: '104' }) })
    );
  });

  it.each([
    ['authentication', 1, 'Authentication failed', 'Error'],
    ['find', 12, 'Invalid search', 'Error'],
    ['catalogue', 22, 'Catalogue failed', 'Fehler'],
    ['metadata', 42, 'Unknown object', 'Error'],
    ['data', 99, 'Data export failed', 'Fehler']
  ])('throws ServiceError for failed %s envelopes', (operation, code, content, type) => {
    let failure = () =>
      normalizeGenesisResponse(
        { Status: { Code: code, Content: content, Type: type }, Parameter: { name: 'x' } },
        { operation }
      );

    expect(failure).toThrow(ServiceError);
    try {
      failure();
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      if (!(error instanceof ServiceError)) return;
      expect(error.data.upstreamCode).toBe(String(code));
      expect(String(error)).not.toContain('Parameter');
    }
  });

  it('gives code 98 actionable narrowing guidance', () => {
    expect(() =>
      normalizeGenesisResponse(
        { Status: { Code: 98, Content: 'The result is too large', Type: 'Error' } },
        { operation: 'download table' }
      )
    ).toThrow(/narrow.+year.+time.+variable/i);
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { Status: 'Success' },
    { Status: { Code: 0, Type: 'Success' } }
  ])('rejects malformed or unusable payload %#', payload => {
    expect(() =>
      normalizeGenesisResponse(payload, {
        operation: 'request',
        select: value => value.Object
      })
    ).toThrow(ServiceError);
  });
});

describe('flattenGenesisCatalog', () => {
  it('flattens all supported catalogue groups with the public time_series discriminator', () => {
    expect(
      flattenGenesisCatalog({
        Cubes: [{ Code: 'cube' }],
        Statistics: [{ Code: 'statistic' }],
        Tables: [{ Code: 'table' }],
        Timeseries: [{ Code: 'series' }],
        Variables: [{ Code: 'variable' }],
        Parameter: { searchterm: 'secret transport detail' }
      })
    ).toEqual([
      { category: 'cube', Code: 'cube' },
      { category: 'statistic', Code: 'statistic' },
      { category: 'table', Code: 'table' },
      { category: 'time_series', Code: 'series' },
      { category: 'variable', Code: 'variable' }
    ]);
  });
});
