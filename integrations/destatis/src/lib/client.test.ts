import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  http: {
    get: vi.fn(),
    post: vi.fn()
  },
  createAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAxios: mocks.createAxios
  };
});

import { GenesisClient } from './client';

let successfulEnvelope = (extra: Record<string, unknown>) => ({
  Status: { Code: 0, Content: 'Success', Type: 'Success' },
  ...extra
});

describe('GenesisClient request contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAxios.mockReturnValue(mocks.http);
  });

  it('uses the fixed GENESIS base URL and header credentials', () => {
    new GenesisClient({ token: 'personal-token' });

    expect(mocks.createAxios).toHaveBeenCalledWith({
      baseURL: 'https://genesis.destatis.de/genesisWS/rest/2020',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        password: '',
        username: 'personal-token'
      }
    });
  });

  it('POSTs form-encoded catalogue requests without a GET fallback or credentials in the body', async () => {
    mocks.http.post.mockResolvedValueOnce({
      data: successfulEnvelope({ Tables: [{ Code: '12411-0001', Content: 'Population' }] })
    });
    let client = new GenesisClient({ token: 'super-secret-token' });

    await client.searchCatalog({
      language: 'en',
      searchTerm: 'population',
      category: 'time_series',
      pageLength: 25
    });

    expect(mocks.http.post).toHaveBeenCalledTimes(1);
    expect(mocks.http.get).not.toHaveBeenCalled();
    let [path, body] = mocks.http.post.mock.calls[0] ?? [];
    expect(path).toBe('/find/find');
    expect(body).toBeInstanceOf(URLSearchParams);
    expect((body as URLSearchParams).toString()).toBe(
      'language=en&term=population&category=time+series&pagelength=25'
    );
    expect((body as URLSearchParams).toString()).not.toContain('super-secret-token');
    expect((body as URLSearchParams).toString()).not.toContain('username');
    expect((body as URLSearchParams).toString()).not.toContain('password');
  });

  it.each([
    ['all', 'all'],
    ['cube', 'cubes'],
    ['statistic', 'statistics'],
    ['table', 'tables'],
    ['time_series', 'time series'],
    ['variable', 'variables']
  ] as const)('maps the %s search category to provider value %s', async (category, expected) => {
    mocks.http.post.mockResolvedValueOnce({
      data: successfulEnvelope({ Tables: [] })
    });
    let client = new GenesisClient({ token: 'token' });

    await client.searchCatalog({
      language: 'en',
      searchTerm: 'population',
      category,
      pageLength: 50
    });

    let body = mocks.http.post.mock.calls[0]?.[1] as URLSearchParams;
    expect(body.get('category')).toBe(expected);
    expect(body.get('pagelength')).toBe('50');
  });

  it('normalizes a documented code-104 catalogue miss to an empty list', async () => {
    mocks.http.post.mockResolvedValueOnce({
      data: {
        Status: { Code: 104, Content: 'No objects found', Type: 'Warning' },
        Copyright: '© Destatis'
      }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.searchCatalog({
        language: 'en',
        searchTerm: 'definitely-not-present',
        allowNoResult: true
      })
    ).resolves.toEqual({
      data: [],
      warning: 'No objects found',
      copyright: '© Destatis'
    });
  });

  it('maps metadata, value, and download parameters to documented form names', async () => {
    mocks.http.post
      .mockResolvedValueOnce({ data: successfulEnvelope({ Object: { Code: '12411-0001' } }) })
      .mockResolvedValueOnce({ data: successfulEnvelope({ List: [] }) })
      .mockResolvedValueOnce({
        data: Buffer.from('a,b\n1,2\n'),
        headers: { 'content-type': 'text/csv' }
      })
      .mockResolvedValueOnce({
        data: Buffer.from('cube'),
        headers: { 'content-type': 'text/csv' }
      });
    let client = new GenesisClient({ token: 'token' });

    await client.getMetadata({
      language: 'de',
      objectType: 'time_series',
      code: '12411-0001',
      area: 'public'
    });
    await client.listVariableValues({
      language: 'en',
      variableCode: 'GES',
      selection: 'female',
      area: 'all',
      searchCriterion: 'content',
      sortCriterion: 'code',
      pageLength: 50
    });
    await client.downloadTable({
      language: 'en',
      tableCode: '12411-0001',
      format: 'csv',
      area: 'user',
      startYear: 2020,
      endYear: 2024,
      timeSlices: 5,
      updatedAfter: '2024-01-01',
      transpose: false,
      compress: true
    });
    await client.downloadCube({
      language: 'de',
      cubeCode: '12411BJ001',
      area: 'all',
      startYear: 2020,
      endYear: 2024
    });

    expect(mocks.http.post.mock.calls.map(call => call[0])).toEqual([
      '/metadata/timeseries',
      '/catalogue/values2variable',
      '/data/tablefile',
      '/data/cubefile'
    ]);
    expect((mocks.http.post.mock.calls[0]?.[1] as URLSearchParams).toString()).toBe(
      'language=de&name=12411-0001&area=public'
    );
    expect((mocks.http.post.mock.calls[1]?.[1] as URLSearchParams).toString()).toBe(
      'language=en&name=GES&selection=female&area=all&searchcriterion=Inhalt&sortcriterion=Code&pagelength=50'
    );
    expect((mocks.http.post.mock.calls[2]?.[1] as URLSearchParams).toString()).toBe(
      'language=en&name=12411-0001&format=csv&area=user&startyear=2020&endyear=2024&timeslices=5&stand=2024-01-01&transpose=false&compress=true&job=false'
    );
    expect((mocks.http.post.mock.calls[3]?.[1] as URLSearchParams).toString()).toBe(
      'language=de&name=12411BJ001&format=csv&area=all&startyear=2020&endyear=2024'
    );
  });

  it.each([
    ['table', '/metadata/table'],
    ['cube', '/metadata/cube'],
    ['statistic', '/metadata/statistic'],
    ['time_series', '/metadata/timeseries'],
    ['variable', '/metadata/variable'],
    ['value', '/metadata/value']
  ] as const)('maps only the allowlisted %s metadata type to %s', async (objectType, path) => {
    mocks.http.post.mockResolvedValueOnce({
      data: successfulEnvelope({ Object: { Code: '12411-0001' } })
    });
    let client = new GenesisClient({ token: 'token' });

    await client.getMetadata({
      language: 'en',
      objectType,
      code: '12411-0001',
      area: 'public'
    });

    expect(mocks.http.post).toHaveBeenCalledWith(path, expect.any(URLSearchParams));
    expect((mocks.http.post.mock.calls[0]?.[1] as URLSearchParams).toString()).toBe(
      'language=en&name=12411-0001&area=public'
    );
  });

  it.each([
    '../data/tablefile',
    '__proto__',
    'toString'
  ])('rejects arbitrary metadata path fragment %s before making a request', async objectType => {
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.getMetadata({
        language: 'en',
        objectType,
        code: '12411-0001',
        area: 'public'
      } as never)
    ).rejects.toBeInstanceOf(ServiceError);
    expect(mocks.http.post).not.toHaveBeenCalled();
  });

  it.each([
    ['code', 'code', 'Code', 'Code'],
    ['code', 'content', 'Code', 'Inhalt'],
    ['content', 'code', 'Inhalt', 'Code'],
    ['content', 'content', 'Inhalt', 'Inhalt']
  ] as const)('maps %s search and %s sort criteria to exact provider values', async (searchCriterion, sortCriterion, expectedSearch, expectedSort) => {
    mocks.http.post.mockResolvedValueOnce({ data: successfulEnvelope({ List: [] }) });
    let client = new GenesisClient({ token: 'token' });

    await client.listVariableValues({
      language: 'de',
      variableCode: 'GES',
      selection: '*',
      searchCriterion,
      sortCriterion,
      area: 'public',
      pageLength: 100
    });

    expect(mocks.http.post).toHaveBeenCalledWith(
      '/catalogue/values2variable',
      expect.any(URLSearchParams)
    );
    expect((mocks.http.post.mock.calls[0]?.[1] as URLSearchParams).toString()).toBe(
      `language=de&name=GES&selection=*&area=public&searchcriterion=${expectedSearch}&sortcriterion=${expectedSort}&pagelength=100`
    );
  });

  it('retains warning metadata with usable Object and List payloads', async () => {
    mocks.http.post
      .mockResolvedValueOnce({
        data: {
          Status: { Code: 7, Content: 'Partial metadata', Type: 'Warning' },
          Object: { Code: '12411-0001' }
        }
      })
      .mockResolvedValueOnce({
        data: {
          Status: { Code: 7, Content: 'Criterion corrected', Type: 'Warning' },
          List: [{ Code: '1', Content: 'Male' }]
        }
      });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.getMetadata({
        language: 'en',
        objectType: 'table',
        code: '12411-0001',
        area: 'public'
      })
    ).resolves.toEqual({
      data: { Code: '12411-0001' },
      warning: 'Partial metadata'
    });
    await expect(
      client.listVariableValues({
        language: 'en',
        variableCode: 'GES',
        selection: '*',
        searchCriterion: 'code',
        sortCriterion: 'code',
        area: 'public',
        pageLength: 100
      })
    ).resolves.toEqual({
      data: [{ Code: '1', Content: 'Male' }],
      warning: 'Criterion corrected'
    });
  });

  it.each([
    ['metadata', { Object: [] }],
    ['values', { List: {} }]
  ])('rejects malformed successful %s payloads', async (kind, payload) => {
    mocks.http.post.mockResolvedValueOnce({ data: successfulEnvelope(payload) });
    let client = new GenesisClient({ token: 'token' });

    let request =
      kind === 'metadata'
        ? client.getMetadata({
            language: 'en',
            objectType: 'table',
            code: '12411-0001',
            area: 'public'
          })
        : client.listVariableValues({
            language: 'en',
            variableCode: 'GES',
            selection: '*',
            searchCriterion: 'code',
            sortCriterion: 'code',
            area: 'public',
            pageLength: 100
          });

    await expect(request).rejects.toBeInstanceOf(ServiceError);
  });

  it('ignores deferred selection passthrough so canonical download fields cannot be overwritten', async () => {
    mocks.http.post.mockResolvedValueOnce({
      data: Buffer.from('PK\u0003\u0004csv'),
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await client.downloadTable({
      language: 'en',
      tableCode: '12411-0001',
      format: 'csv',
      area: 'public',
      startYear: 2020,
      transpose: false,
      compress: true,
      selection: {
        area: 'user',
        compress: 'false',
        startyear: '1900',
        transpose: 'true',
        unsupported: 'must-not-be-sent'
      }
    } as Parameters<GenesisClient['downloadTable']>[0] & {
      selection: Record<string, string>;
    });

    expect((mocks.http.post.mock.calls[0]?.[1] as URLSearchParams).toString()).toBe(
      'language=en&name=12411-0001&format=csv&area=public&startyear=2020&transpose=false&compress=true&job=false'
    );
  });
});

describe('GenesisClient loginCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAxios.mockReturnValue(mocks.http);
  });

  it('POSTs language=en and accepts the documented flat response', async () => {
    mocks.http.post.mockResolvedValueOnce({
      data: { Status: 'You have been logged in.', Username: 'researcher' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(client.loginCheck('en')).resolves.toEqual({ username: 'researcher' });
    expect(mocks.http.post).toHaveBeenCalledWith(
      '/helloworld/logincheck',
      expect.any(URLSearchParams)
    );
    expect((mocks.http.post.mock.calls[0]?.[1] as URLSearchParams).toString()).toBe(
      'language=en'
    );
  });

  it.each([
    ['malformed', { Status: { Code: 0 }, Username: 'researcher' }],
    ['missing username', { Status: 'Logged in' }],
    ['blank username', { Status: 'Logged in', Username: '   ' }]
  ])('rejects a %s login response with ServiceError', async (_name, data) => {
    mocks.http.post.mockResolvedValueOnce({ data });
    let client = new GenesisClient({ token: 'token' });

    await expect(client.loginCheck('en')).rejects.toBeInstanceOf(ServiceError);
  });

  it('converts HTTP failures without leaking the token', async () => {
    let token = 'token-that-must-not-leak';
    mocks.http.post.mockRejectedValueOnce(
      new Error(`HTTP failed while sending username ${token}`)
    );
    let client = new GenesisClient({ token });

    let failure = await client.loginCheck('en').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ServiceError);
    expect(String(failure)).not.toContain(token);
    expect(JSON.stringify(failure)).not.toContain(token);
  });

  it('redacts the token if a provider status message echoes it', async () => {
    let token = 'status-token-that-must-not-leak';
    mocks.http.post.mockResolvedValueOnce({
      data: {
        Status: { Code: 12, Content: `Invalid username ${token}`, Type: 'Error' }
      }
    });
    let client = new GenesisClient({ token });

    let failure = await client
      .searchCatalog({ language: 'en', searchTerm: 'population' })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ServiceError);
    expect(String(failure)).not.toContain(token);
    expect(JSON.stringify(failure)).not.toContain(token);
  });
});

describe('GenesisClient binary responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAxios.mockReturnValue(mocks.http);
  });

  it('parses an arraybuffer JSON error envelope instead of delivering it as a file', async () => {
    let body = Buffer.from(
      JSON.stringify({ Status: { Code: 98, Content: 'Too many values', Type: 'Error' } })
    );
    mocks.http.post.mockResolvedValueOnce({
      data: body,
      headers: { 'content-type': 'application/octet-stream' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'xlsx' })
    ).rejects.toThrow(/narrow.+year|year.+narrow/i);
  });

  it('rejects empty file responses', async () => {
    mocks.http.post.mockResolvedValueOnce({
      data: Buffer.alloc(0),
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
    ).rejects.toThrow(/empty file/i);
  });

  it.each([
    {
      label: 'ZIP CSV table',
      bytes: Buffer.from('PK\u0003\u0004csv'),
      contentType: 'application/zip',
      disposition: 'attachment; filename="table-export.zip"',
      format: 'csv' as const,
      expectedName: 'table-export.zip',
      expectedArchive: true
    },
    {
      label: 'XLSX table',
      bytes: Buffer.from('PK\u0003\u0004xlsx'),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="table.xlsx"',
      format: 'xlsx' as const,
      expectedName: 'table.xlsx',
      expectedArchive: false
    }
  ])('preserves $label bytes and metadata', async example => {
    mocks.http.post.mockResolvedValueOnce({
      data: example.bytes,
      headers: {
        'content-type': `${example.contentType}; charset=binary`,
        'content-disposition': example.disposition
      }
    });
    let client = new GenesisClient({ token: 'token' });

    let result = await client.downloadTable({
      language: 'en',
      tableCode: '12411-0001',
      format: example.format
    });

    expect(result).toEqual({
      contentBase64: example.bytes.toString('base64'),
      mimeType: example.contentType,
      byteLength: example.bytes.byteLength,
      fileName: example.expectedName,
      isArchive: example.expectedArchive
    });
    expect(mocks.http.post).toHaveBeenCalledWith(
      '/data/tablefile',
      expect.any(URLSearchParams),
      { responseType: 'arraybuffer' }
    );
  });

  it('uses a safe cube filename and the response MIME type for CSV bytes', async () => {
    let bytes = Buffer.from('code,value\nA,1\n');
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: {
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="../unsafe\\cube.csv"'
      }
    });
    let client = new GenesisClient({ token: 'token' });

    let result = await client.downloadCube({
      language: 'de',
      cubeCode: '12411BJ001'
    });

    expect(result).toEqual({
      contentBase64: bytes.toString('base64'),
      mimeType: 'text/csv',
      byteLength: bytes.byteLength,
      fileName: 'cube.csv',
      isArchive: false
    });
  });

  it('falls back to a quoted filename when filename* percent encoding is malformed', async () => {
    let bytes = Buffer.from('code,value\nA,1\n');
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: {
        'content-type': 'text/csv',
        'content-disposition':
          'attachment; filename="valid-cube.csv"; filename*=UTF-8\'\'bad%ZZ.csv'
      }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadCube({ language: 'en', cubeCode: '12411BJ001' })
    ).resolves.toEqual(
      expect.objectContaining({
        fileName: 'valid-cube.csv',
        contentBase64: bytes.toString('base64')
      })
    );
  });
});
