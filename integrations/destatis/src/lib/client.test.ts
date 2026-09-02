import { deflateRawSync } from 'node:zlib';
import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';

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

import { GENESIS_MAX_DOWNLOAD_BYTES, GenesisClient } from './client';

let successfulEnvelope = (extra: Record<string, unknown>) => ({
  Status: { Code: 0, Content: 'Success', Type: 'Success' },
  ...extra
});

let testCrc32Table = Array.from({ length: 256 }, (_, value) => {
  let checksum = value;
  for (let bit = 0; bit < 8; bit += 1) {
    checksum = (checksum & 1) === 1 ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1;
  }
  return checksum >>> 0;
});

let testCrc32 = (buffer: Buffer) => {
  let checksum = 0xffffffff;
  for (let byte of buffer) {
    checksum = (testCrc32Table[(checksum ^ byte) & 0xff] ?? 0) ^ (checksum >>> 8);
  }
  return (checksum ^ 0xffffffff) >>> 0;
};

type ZipFixtureEntry = {
  name: string;
  contents: string | Buffer;
  nameBytes?: Buffer;
  extra?: Buffer;
  compression?: 'stored' | 'deflate';
  dataDescriptor?: boolean;
  flags?: number;
};

// These fixtures exercise local headers, optional data descriptors, central records, CRCs,
// compression, filename encodings, and the end-of-central-directory record.
let zipFixtureEntries = (entries: ZipFixtureEntry[]) => {
  let localRecords: Buffer[] = [];
  let centralRecords: Buffer[] = [];
  let localOffset = 0;
  for (let entry of entries) {
    let nameBytes = entry.nameBytes ?? Buffer.from(entry.name);
    let extra = entry.extra ?? Buffer.alloc(0);
    let data = Buffer.isBuffer(entry.contents) ? entry.contents : Buffer.from(entry.contents);
    let compressionMethod = entry.compression === 'deflate' ? 8 : 0;
    let compressed = compressionMethod === 8 ? deflateRawSync(data) : data;
    let flags = (entry.flags ?? 0) | (entry.dataDescriptor ? 0x08 : 0);
    let checksum = testCrc32(data);
    let descriptor = entry.dataDescriptor ? Buffer.alloc(16) : Buffer.alloc(0);
    if (entry.dataDescriptor) {
      descriptor.writeUInt32LE(0x08074b50, 0);
      descriptor.writeUInt32LE(checksum, 4);
      descriptor.writeUInt32LE(compressed.length, 8);
      descriptor.writeUInt32LE(data.length, 12);
    }
    let local = Buffer.alloc(
      30 + nameBytes.length + extra.length + compressed.length + descriptor.length
    );
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(compressionMethod, 8);
    if (!entry.dataDescriptor) {
      local.writeUInt32LE(checksum, 14);
      local.writeUInt32LE(compressed.length, 18);
      local.writeUInt32LE(data.length, 22);
    }
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(extra.length, 28);
    nameBytes.copy(local, 30);
    extra.copy(local, 30 + nameBytes.length);
    compressed.copy(local, 30 + nameBytes.length + extra.length);
    descriptor.copy(local, 30 + nameBytes.length + extra.length + compressed.length);

    let central = Buffer.alloc(46 + nameBytes.length + extra.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(compressionMethod, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(extra.length, 30);
    central.writeUInt32LE(localOffset, 42);
    nameBytes.copy(central, 46);
    extra.copy(central, 46 + nameBytes.length);

    localRecords.push(local);
    centralRecords.push(central);
    localOffset += local.length;
  }
  let centralSize = centralRecords.reduce((sum, record) => sum + record.length, 0);
  let eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(localRecords.length, 8);
  eocd.writeUInt16LE(localRecords.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localRecords, ...centralRecords, eocd]);
};

let zipFixture = (entries: Record<string, string | Buffer>) =>
  zipFixtureEntries(Object.entries(entries).map(([name, contents]) => ({ name, contents })));

let csvZipFixture = () => zipFixture({ '12411-0001.csv': 'code;value\nA;1\n' });
let unicodePathExtra = (legacyName: Buffer, unicodeName: string) => {
  let unicode = Buffer.from(unicodeName);
  let extra = Buffer.alloc(4 + 1 + 4 + unicode.length);
  extra.writeUInt16LE(0x7075, 0);
  extra.writeUInt16LE(1 + 4 + unicode.length, 2);
  extra[4] = 1;
  extra.writeUInt32LE(testCrc32(legacyName), 5);
  unicode.copy(extra, 9);
  return extra;
};

let minimalXlsxParts = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Table" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
  'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`
};

let xlsxFixture = (overrides: Record<string, string | undefined> = {}) => {
  let parts: Record<string, string> = { ...minimalXlsxParts };
  for (let [name, contents] of Object.entries(overrides)) {
    if (contents === undefined) delete parts[name];
    else parts[name] = contents;
  }
  return zipFixture(parts);
};

let sheetJsXlsxFixture = () => {
  let workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['code', 'value'],
      ['A', 1]
    ]),
    'Data'
  );
  return Buffer.from(
    XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer', compression: true })
  );
};

let twoSheetXlsxOverrides = (
  firstSheetAttributes: string,
  secondSheetAttributes: string,
  secondRelationshipTarget = 'worksheets/sheet2.xml'
) => ({
  '[Content_Types].xml': minimalXlsxParts['[Content_Types].xml'].replace(
    '</Types>',
    '  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n</Types>'
  ),
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="First" ${firstSheetAttributes}/><sheet name="Second" ${secondSheetAttributes}/></sheets>
</workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${secondRelationshipTarget}"/>
</Relationships>`,
  'xl/worksheets/sheet2.xml': `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`
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
        data: csvZipFixture(),
        headers: { 'content-type': 'application/zip' }
      })
      .mockResolvedValueOnce({
        data: Buffer.from('code,value\nA,1\n'),
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
      contents: ['BEV', 'RATE'],
      startYear: '2020/21',
      endYear: '2024/25',
      timeSlices: 5,
      regionalSelection: { variableCode: 'DLAND', valueCodes: ['01', '02'] },
      classifyingSelections: [{ variableCode: 'GES', valueCodes: ['1', '2'] }],
      updatedAfter: '01.01.2024',
      transpose: false,
      compress: true
    });
    await client.downloadCube({
      language: 'de',
      cubeCode: '12411BJ001',
      area: 'all',
      contents: ['BEV'],
      startYear: '2020',
      endYear: '2024',
      includeValues: false,
      includeMetadata: true,
      includeAdditionalMetadata: false
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
      'language=en&name=12411-0001&format=csv&area=user&contents=BEV%2CRATE&startyear=2020%2F21&endyear=2024%2F25&timeslices=5&stand=01.01.2024&regionalvariable=DLAND&regionalkey=01%2C02&classifyingvariable1=GES&classifyingkey1=1%2C2&transpose=false&compress=true&job=false'
    );
    expect((mocks.http.post.mock.calls[3]?.[1] as URLSearchParams).toString()).toBe(
      'language=de&name=12411BJ001&format=csv&area=all&contents=BEV&startyear=2020&endyear=2024&values=false&metadata=true&additionals=false'
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
      data: csvZipFixture(),
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await client.downloadTable({
      language: 'en',
      tableCode: '12411-0001',
      format: 'csv',
      area: 'public',
      startYear: '2020',
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

  it('URL-encodes literal provider code characters without introducing form fields', async () => {
    mocks.http.post.mockResolvedValueOnce({
      data: csvZipFixture(),
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await client.downloadTable({
      language: 'en',
      tableCode: '12411-0001',
      format: 'csv',
      area: 'public',
      contents: ['A&B', 'A=B', 'A/B', 'A B'],
      regionalSelection: { variableCode: 'D&=/', valueCodes: ['A&B', 'A=B'] },
      classifyingSelections: [{ variableCode: 'G &', valueCodes: ['X/Y', 'X Y'] }]
    });

    let form = mocks.http.post.mock.calls[0]?.[1] as URLSearchParams;
    expect(form.get('contents')).toBe('A&B,A=B,A/B,A B');
    expect(form.get('regionalvariable')).toBe('D&=/');
    expect(form.get('regionalkey')).toBe('A&B,A=B');
    expect(form.get('classifyingvariable1')).toBe('G &');
    expect([...form.keys()]).toEqual([
      'language',
      'name',
      'format',
      'area',
      'contents',
      'regionalvariable',
      'regionalkey',
      'classifyingvariable1',
      'classifyingkey1',
      'job'
    ]);
  });

  it('rejects too many or duplicate structured selections before transport', async () => {
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadCube({
        language: 'en',
        cubeCode: '12411BJ01',
        classifyingSelections: Array.from({ length: 4 }, (_, index) => ({
          variableCode: `V${index}`,
          valueCodes: ['*']
        }))
      })
    ).rejects.toBeInstanceOf(ServiceError);
    await expect(
      client.downloadTable({
        language: 'en',
        tableCode: '12411-0001',
        classifyingSelections: [
          { variableCode: 'GES', valueCodes: ['1'] },
          { variableCode: ' GES ', valueCodes: ['2'] }
        ]
      })
    ).rejects.toBeInstanceOf(ServiceError);
    await expect(
      client.downloadTable({
        language: 'en',
        tableCode: '12411-0001',
        contents: ['BEV,INSG']
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(mocks.http.post).not.toHaveBeenCalled();
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

  it('configures the exact transport limit and rejects a post-transport over-limit body', async () => {
    mocks.http.post.mockResolvedValueOnce({
      data: Buffer.alloc(GENESIS_MAX_DOWNLOAD_BYTES + 1),
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
    ).rejects.toThrow(/64 MiB download limit/i);
    expect(mocks.http.post).toHaveBeenCalledWith(
      '/data/tablefile',
      expect.any(URLSearchParams),
      {
        responseType: 'arraybuffer',
        maxContentLength: GENESIS_MAX_DOWNLOAD_BYTES,
        maxBodyLength: GENESIS_MAX_DOWNLOAD_BYTES
      }
    );
  });

  it('allows an exact-limit body through the size gate before format validation', async () => {
    mocks.http.post.mockResolvedValueOnce({
      data: Buffer.alloc(GENESIS_MAX_DOWNLOAD_BYTES),
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    let failure = await client
      .downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceError);
    expect(String(failure)).toMatch(/corrupt|unexpected/i);
    expect(String(failure)).not.toMatch(/larger than|exceeded the 64 MiB/i);
  });

  it('maps an Axios transport-size failure to a safe ServiceError', async () => {
    let upstreamSecret = 'transport-debug-value-that-must-not-leak';
    mocks.http.post.mockRejectedValueOnce({
      code: 'ERR_BAD_RESPONSE',
      message: `maxContentLength size exceeded: ${upstreamSecret}`
    });
    let client = new GenesisClient({ token: 'token' });

    let failure = await client
      .downloadCube({ language: 'en', cubeCode: '12411BJ01' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceError);
    expect(String(failure)).toMatch(/64 MiB download limit/i);
    expect(String(failure)).not.toContain(upstreamSecret);
    expect(JSON.stringify(failure)).not.toContain(upstreamSecret);
  });

  it.each([
    {
      label: 'ZIP CSV table',
      bytes: csvZipFixture(),
      contentType: 'application/zip',
      disposition: 'attachment; filename="table-export.zip"',
      format: 'csv' as const,
      expectedName: 'table-export.zip',
      expectedArchive: true
    },
    {
      label: 'XLSX table',
      bytes: xlsxFixture(),
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
      {
        responseType: 'arraybuffer',
        maxContentLength: GENESIS_MAX_DOWNLOAD_BYTES,
        maxBodyLength: GENESIS_MAX_DOWNLOAD_BYTES
      }
    );
  });

  it.each([
    {
      label: 'workbook emitted by SheetJS',
      bytes: sheetJsXlsxFixture()
    },
    {
      label: 'override-only required part content types',
      bytes: xlsxFixture({
        '[Content_Types].xml': minimalXlsxParts['[Content_Types].xml']
          .replace(
            '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
            '  <Override PartName="/_rels/.rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Override PartName="/xl/_rels/workbook.xml.rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
          )
          .replace('  <Default Extension="xml" ContentType="application/xml"/>\n', '')
      })
    },
    {
      label: 'relationship namespace declared on the sheet element',
      bytes: xlsxFixture({
        'xl/workbook.xml': minimalXlsxParts['xl/workbook.xml']
          .replace(
            ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
            ''
          )
          .replace(
            '<sheet name="Table" sheetId="1" r:id="rId1"/>',
            '<sheet xmlns:local="http://schemas.openxmlformats.org/officeDocument/2006/relationships" name="Table" sheetId="1" local:id="rId1"/>'
          )
      })
    },
    {
      label: 'minimal two-sheet workbook with distinct IDs and targets',
      bytes: xlsxFixture(
        twoSheetXlsxOverrides('sheetId="1" r:id="rId1"', 'sheetId="2" r:id="rId2"')
      )
    }
  ])('accepts a standards-valid XLSX with $label', async example => {
    mocks.http.post.mockResolvedValueOnce({
      data: example.bytes,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'xlsx' })
    ).resolves.toMatchObject({
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      isArchive: false
    });
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

  it.each([
    {
      format: 'datencsv' as const,
      bytes: csvZipFixture(),
      headers: { 'content-type': 'application/octet-stream' },
      expectedMime: 'application/zip',
      expectedName: '12411-0001.zip',
      expectedArchive: true
    },
    {
      format: 'ffcsv' as const,
      bytes: csvZipFixture(),
      headers: { 'content-type': 'text/csv' },
      expectedMime: 'application/zip',
      expectedName: '12411-0001.zip',
      expectedArchive: true
    },
    {
      format: 'xlsx' as const,
      bytes: xlsxFixture(),
      headers: { 'content-type': 'application/zip' },
      expectedMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      expectedName: '12411-0001.xlsx',
      expectedArchive: false
    },
    {
      format: 'html' as const,
      bytes: Buffer.from(
        '<!doctype html><html><head><meta name="generator" content="GENESIS-Online"></head><body><table><tr><th>Code</th></tr><tr><td>A</td></tr></table></body></html>'
      ),
      headers: { 'content-type': 'text/html; charset=utf-8' },
      expectedMime: 'text/html',
      expectedName: '12411-0001.html',
      expectedArchive: false
    },
    {
      format: 'genml' as const,
      bytes: Buffer.from(
        '<?xml version="1.0"?><GENML><Header><Code>12411-0001</Code></Header><Data><Value>1</Value></Data></GENML>'
      ),
      headers: {},
      expectedMime: 'application/xml',
      expectedName: '12411-0001.xml',
      expectedArchive: false
    }
  ])('uses canonical or defensible MIME metadata for $format table files', async example => {
    mocks.http.post.mockResolvedValueOnce({ data: example.bytes, headers: example.headers });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({
        language: 'en',
        tableCode: '12411-0001',
        format: example.format
      })
    ).resolves.toEqual({
      contentBase64: example.bytes.toString('base64'),
      mimeType: example.expectedMime,
      byteLength: example.bytes.byteLength,
      fileName: example.expectedName,
      isArchive: example.expectedArchive
    });
  });

  it('normalizes a generic cube response to CSV metadata', async () => {
    let bytes = Buffer.from('code,value\nA,1\n');
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: { 'content-type': 'application/octet-stream' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadCube({ language: 'en', cubeCode: '12411BJ01' })
    ).resolves.toMatchObject({ mimeType: 'text/csv', isArchive: false });
  });

  it.each([
    {
      label: 'deflated CSV entry',
      bytes: zipFixtureEntries([
        {
          name: 'table.csv',
          contents: 'code;value\nA;1\n',
          compression: 'deflate'
        }
      ])
    },
    {
      label: 'signed data descriptor',
      bytes: zipFixtureEntries([
        {
          name: 'table.csv',
          contents: 'code;value\nA;1\n',
          compression: 'deflate',
          dataDescriptor: true
        }
      ])
    },
    {
      label: 'CP437 legacy filename',
      bytes: zipFixtureEntries([
        {
          name: 'tabelle-ü.csv',
          nameBytes: Buffer.concat([
            Buffer.from('tabelle-'),
            Buffer.from([0x81]),
            Buffer.from('.csv')
          ]),
          contents: 'code;value\nA;1\n'
        }
      ])
    },
    {
      label: 'Info-ZIP Unicode Path filename',
      bytes: (() => {
        let legacyName = Buffer.concat([
          Buffer.from('tabelle-'),
          Buffer.from([0x81]),
          Buffer.from('.csv')
        ]);
        return zipFixtureEntries([
          {
            name: 'tabelle-über.csv',
            nameBytes: legacyName,
            extra: unicodePathExtra(legacyName, 'tabelle-über.csv'),
            contents: 'code;value\nA;1\n'
          }
        ]);
      })()
    },
    {
      label: 'general-purpose bit 11 UTF-8 filename',
      bytes: zipFixtureEntries([
        {
          name: 'tabelle-über.csv',
          nameBytes: Buffer.from('tabelle-über.csv'),
          flags: 0x0800,
          contents: 'code;value\nA;1\n'
        }
      ])
    }
  ])('accepts a structurally valid ZIP with a $label', async example => {
    mocks.http.post.mockResolvedValueOnce({
      data: example.bytes,
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
    ).resolves.toMatchObject({ mimeType: 'application/zip', isArchive: true });
  });

  it.each([
    {
      label: 'traversing entry name',
      bytes: zipFixture({ '../table.csv': 'code;value\nA;1\n' })
    },
    {
      label: 'corrupt data descriptor',
      bytes: (() => {
        let bytes = zipFixtureEntries([
          {
            name: 'table.csv',
            contents: 'code;value\nA;1\n',
            compression: 'deflate',
            dataDescriptor: true
          }
        ]);
        let descriptor = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]));
        bytes[descriptor + 4] = (bytes[descriptor + 4] ?? 0) ^ 0xff;
        return bytes;
      })()
    }
  ])('rejects a ZIP with a $label', async example => {
    mocks.http.post.mockResolvedValueOnce({
      data: example.bytes,
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('rejects a ZIP with an excessive compression ratio', async () => {
    let bytes = zipFixtureEntries([
      {
        name: 'table.csv',
        contents: Buffer.alloc(4 * 1024 * 1024, 0x30),
        compression: 'deflate'
      }
    ]);
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
    ).rejects.toThrow(/ZIP expansion safety limit|narrow/i);
  });

  it('accepts a ZIP at the exact 32 MiB expanded-data boundary', async () => {
    let bytes = zipFixture({
      'table.csv': Buffer.alloc(32 * 1024 * 1024, 'code;value\nA;1\n')
    });
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
    ).resolves.toMatchObject({ mimeType: 'application/zip', isArchive: true });
  });

  it('rejects a ZIP whose aggregate expansion exceeds the bounded parser budget', async () => {
    let bytes = zipFixture({
      'table.csv': Buffer.alloc(34 * 1024 * 1024, 'code;value\nA;1\n')
    });
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    let failure = await client
      .downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceError);
    expect(String(failure)).toMatch(/32 MiB expanded ZIP limit/i);
    expect(String(failure)).toMatch(/narrow/i);
    expect(String(failure)).not.toContain('code;value');
  });

  it('rejects a ZIP with more than the bounded entry count', async () => {
    let bytes = zipFixtureEntries(
      Array.from({ length: 4097 }, (_, index) => ({
        name: `part-${index}.csv`,
        contents: ''
      }))
    );
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: { 'content-type': 'application/zip' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
    ).rejects.toThrow(/4,096-entry ZIP limit|narrow/i);
  });

  it.each([
    {
      label: 'HTML gateway for a zipped table',
      format: 'csv' as const,
      bytes: Buffer.from('<html><body>Gateway error</body></html>'),
      contentType: 'text/html'
    },
    {
      label: 'truncated ZIP with a local-file signature',
      format: 'ffcsv' as const,
      bytes: Buffer.from('PK\u0003\u0004table.csv'),
      contentType: 'application/zip'
    },
    {
      label: 'ZIP whose entry fails its CRC',
      format: 'datencsv' as const,
      bytes: (() => {
        let bytes = Buffer.from(csvZipFixture());
        let dataOffset = 30 + Buffer.byteLength('12411-0001.csv');
        bytes[dataOffset] = (bytes[dataOffset] ?? 0) ^ 0xff;
        return bytes;
      })(),
      contentType: 'application/zip'
    },
    {
      label: 'corrupt XLSX',
      format: 'xlsx' as const,
      bytes: Buffer.from('not-a-zip'),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'pseudo-XLSX ZIP without workbook entries',
      format: 'xlsx' as const,
      bytes: zipFixture({ 'table.csv': 'code,value\nA,1\n' }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'pseudo-XLSX with all expected names but dummy XML parts',
      format: 'xlsx' as const,
      bytes: zipFixture({
        '[Content_Types].xml': '<Types><Override /></Types>',
        '_rels/.rels': '<Relationships><Relationship /></Relationships>',
        'xl/workbook.xml': '<workbook><sheets><sheet /></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': '<Relationships><Relationship /></Relationships>',
        'xl/worksheets/sheet1.xml': '<worksheet />'
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX content types without the package namespace',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        '[Content_Types].xml': minimalXlsxParts['[Content_Types].xml'].replace(
          ' xmlns="http://schemas.openxmlformats.org/package/2006/content-types"',
          ''
        )
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX with an incorrect workbook content type',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        '[Content_Types].xml': minimalXlsxParts['[Content_Types].xml'].replace(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
          'application/xml'
        )
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX with an incorrect relationships default content type',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        '[Content_Types].xml': minimalXlsxParts['[Content_Types].xml'].replace(
          'application/vnd.openxmlformats-package.relationships+xml',
          'application/xml'
        )
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX without the package officeDocument relationship',
      format: 'xlsx' as const,
      bytes: xlsxFixture({ '_rels/.rels': undefined }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX with a traversing officeDocument target',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        '_rels/.rels': minimalXlsxParts['_rels/.rels'].replace(
          'Target="xl/workbook.xml"',
          'Target="../xl/workbook.xml"'
        )
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX workbook without the SpreadsheetML namespace',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        'xl/workbook.xml': minimalXlsxParts['xl/workbook.xml'].replace(
          ' xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
          ''
        )
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX workbook relationship targeting a missing worksheet',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        'xl/_rels/workbook.xml.rels': minimalXlsxParts['xl/_rels/workbook.xml.rels'].replace(
          'worksheets/sheet1.xml',
          'worksheets/missing.xml'
        )
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX with a corrupt referenced worksheet leaf and a correct archive CRC',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        'xl/worksheets/sheet1.xml':
          '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData></worksheet>'
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX with a non-worksheet referenced leaf root',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        'xl/worksheets/sheet1.xml':
          '<chartsheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>'
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX with a referenced worksheet in the wrong namespace',
      format: 'xlsx' as const,
      bytes: xlsxFixture({
        'xl/worksheets/sheet1.xml':
          '<worksheet xmlns="https://example.invalid/sheet"><sheetData/></worksheet>'
      }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    ...[
      {
        label: 'XLSX sheet without sheetId',
        workbook: minimalXlsxParts['xl/workbook.xml'].replace(' sheetId="1"', '')
      },
      {
        label: 'XLSX sheet with zero sheetId',
        workbook: minimalXlsxParts['xl/workbook.xml'].replace('sheetId="1"', 'sheetId="0"')
      },
      {
        label: 'XLSX sheet with noninteger sheetId',
        workbook: minimalXlsxParts['xl/workbook.xml'].replace('sheetId="1"', 'sheetId="1.5"')
      },
      {
        label: 'XLSX sheet without a relationship ID',
        workbook: minimalXlsxParts['xl/workbook.xml'].replace(' r:id="rId1"', '')
      },
      {
        label: 'XLSX sheet with an invalid relationship ID',
        workbook: minimalXlsxParts['xl/workbook.xml'].replace('r:id="rId1"', 'r:id="bad id"')
      }
    ].map(example => ({
      label: example.label,
      format: 'xlsx' as const,
      bytes: xlsxFixture({ 'xl/workbook.xml': example.workbook }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })),
    {
      label: 'XLSX with duplicate numeric sheetIds',
      format: 'xlsx' as const,
      bytes: xlsxFixture(
        twoSheetXlsxOverrides('sheetId="1" r:id="rId1"', 'sheetId="01" r:id="rId2"')
      ),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX with duplicate sheet relationship IDs',
      format: 'xlsx' as const,
      bytes: xlsxFixture(
        twoSheetXlsxOverrides('sheetId="1" r:id="rId1"', 'sheetId="2" r:id="rId1"')
      ),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'XLSX with distinct relationship IDs resolving to one worksheet target',
      format: 'xlsx' as const,
      bytes: xlsxFixture(
        twoSheetXlsxOverrides(
          'sheetId="1" r:id="rId1"',
          'sheetId="2" r:id="rId2"',
          'worksheets/sheet1.xml'
        )
      ),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'encrypted XLSX archive',
      format: 'xlsx' as const,
      bytes: (() => {
        let bytes = Buffer.from(xlsxFixture());
        bytes.writeUInt16LE(1, 6);
        let centralOffset = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
        bytes.writeUInt16LE(1, centralOffset + 8);
        return bytes;
      })(),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      label: 'plain text mislabeled as HTML',
      format: 'html' as const,
      bytes: Buffer.from('temporary gateway failure'),
      contentType: 'text/html'
    },
    {
      label: 'recognizable HTML gateway requested as a table',
      format: 'html' as const,
      bytes: Buffer.from(
        '<!doctype html><html><head><title>Gateway Error</title></head><body><h1>Gateway Error</h1></body></html>'
      ),
      contentType: 'text/html'
    },
    {
      label: 'HTML mislabeled as GENML',
      format: 'genml' as const,
      bytes: Buffer.from('<html><body>Error</body></html>'),
      contentType: 'application/xml'
    },
    {
      label: 'XML error envelope requested as GENML',
      format: 'genml' as const,
      bytes: Buffer.from('<?xml version="1.0"?><Error><Message>Denied</Message></Error>'),
      contentType: 'application/xml'
    },
    {
      label: 'malformed GENML document',
      format: 'genml' as const,
      bytes: Buffer.from('<GENML><Data></GENML>'),
      contentType: 'application/xml'
    },
    {
      label: 'GENML document exceeding the XML depth bound',
      format: 'genml' as const,
      bytes: Buffer.from(`<GENML>${'<Node>'.repeat(64)}value${'</Node>'.repeat(64)}</GENML>`),
      contentType: 'application/xml'
    }
  ])('rejects $label before file delivery', async example => {
    mocks.http.post.mockResolvedValueOnce({
      data: example.bytes,
      headers: { 'content-type': example.contentType }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({
        language: 'en',
        tableCode: '12411-0001',
        format: example.format
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('rejects GENML before parsing when it exceeds the XML byte budget', async () => {
    let prefix = '<GENML><Data>';
    let suffix = '</Data></GENML>';
    let bytes = Buffer.from(
      `${prefix}${' '.repeat(33 * 1024 * 1024 - prefix.length - suffix.length)}${suffix}`
    );
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: { 'content-type': 'application/xml' }
    });
    let client = new GenesisClient({ token: 'token' });

    let failure = await client
      .downloadTable({ language: 'en', tableCode: '12411-0001', format: 'genml' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceError);
    expect(String(failure)).toMatch(/32 MiB GENML\/XML limit/i);
    expect(String(failure)).toMatch(/narrow/i);
    expect(JSON.stringify(failure)).not.toContain(prefix);
  });

  it.each([
    {
      label: 'HTML gateway',
      bytes: Buffer.from('<!doctype html><html><body>Error</body></html>'),
      contentType: 'text/html'
    },
    {
      label: 'binary payload',
      bytes: Buffer.from([0, 1, 2, 3, 4, 5]),
      contentType: 'application/octet-stream'
    },
    {
      label: 'XML error document',
      bytes: Buffer.from('<?xml version="1.0"?><Error>Denied</Error>'),
      contentType: 'application/xml'
    },
    {
      label: 'unstructured generic text',
      bytes: Buffer.from('temporary gateway failure'),
      contentType: 'application/octet-stream'
    },
    {
      label: 'explicit text/csv gateway text',
      bytes: Buffer.from('temporary gateway failure'),
      contentType: 'text/csv'
    },
    {
      label: 'newline-only text/csv payload',
      bytes: Buffer.from('\r\n\n'),
      contentType: 'text/csv'
    },
    {
      label: 'tabular-looking generic error payload',
      bytes: Buffer.from('Error,Message\nGateway,Unavailable\n'),
      contentType: 'text/csv'
    }
  ])('rejects a cube $label instead of labeling it CSV', async example => {
    mocks.http.post.mockResolvedValueOnce({
      data: example.bytes,
      headers: { 'content-type': example.contentType }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadCube({ language: 'en', cubeCode: '12411BJ01' })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('uses a safe CSV validation error without echoing upstream bytes', async () => {
    let upstreamSecret = 'provider-debug-value-that-must-not-leak';
    mocks.http.post.mockResolvedValueOnce({
      data: Buffer.from(`Error: ${upstreamSecret}`),
      headers: { 'content-type': 'text/csv' }
    });
    let client = new GenesisClient({ token: 'token' });

    let failure = await client
      .downloadCube({ language: 'en', cubeCode: '12411BJ01' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceError);
    expect(String(failure)).not.toContain(upstreamSecret);
    expect(JSON.stringify(failure)).not.toContain(upstreamSecret);
  });

  it.each([
    {
      label: 'UTF-8 BOM',
      bytes: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('code;value\nA;1\n')])
    },
    {
      label: 'UTF-16LE BOM',
      bytes: Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from('code,value\r\nA,1\r\n', 'utf16le')
      ])
    },
    {
      label: 'documented GENESIS K/D cube records separated by semicolons',
      // The GENESIS export guide defines K header records and D data records in semicolon
      // CSV. The fixture keeps several record widths because real cube metadata is sectional.
      bytes: Buffer.from(
        'K;DQ;FACH-SCHL;"nur Werte"\r\nD;61111BM001\r\nK;DQ-ERH;FACH-SCHL\r\nD;61111\r\nK;DQA;NAME\r\nD;MONAT\r\nD;DINSG\r\n'
      )
    }
  ])('accepts defensible $label cube CSV text', async example => {
    mocks.http.post.mockResolvedValueOnce({
      data: example.bytes,
      headers: { 'content-type': 'application/octet-stream' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadCube({ language: 'en', cubeCode: '12411BJ01' })
    ).resolves.toMatchObject({ mimeType: 'text/csv', byteLength: example.bytes.byteLength });
  });

  it('accepts a large cube once the bounded prefix establishes provider tabular structure', async () => {
    let bytes = Buffer.concat([
      Buffer.from('code;value\nA;1\n'),
      Buffer.alloc(2 * 1024 * 1024, 0x20)
    ]);
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: { 'content-type': 'text/csv' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadCube({ language: 'en', cubeCode: '12411BJ01' })
    ).resolves.toMatchObject({ byteLength: bytes.length, mimeType: 'text/csv' });
  });

  it('does not scan beyond the bounded CSV prefix to find delayed tabular rows', async () => {
    let bytes = Buffer.concat([
      Buffer.alloc(1024 * 1024, 0x78),
      Buffer.from('\ncode;value\nA;1\n')
    ]);
    mocks.http.post.mockResolvedValueOnce({
      data: bytes,
      headers: { 'content-type': 'text/csv' }
    });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadCube({ language: 'en', cubeCode: '12411BJ01' })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('canonicalizes requested extensions and bounds oversized provider filenames', async () => {
    let longName = `${'a'.repeat(250)}.zip`;
    mocks.http.post
      .mockResolvedValueOnce({
        data: csvZipFixture(),
        headers: {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="table.csv"'
        }
      })
      .mockResolvedValueOnce({
        data: xlsxFixture(),
        headers: {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="workbook.zip"'
        }
      })
      .mockResolvedValueOnce({
        data: Buffer.from('code,value\nA,1\n'),
        headers: {
          'content-type': 'text/csv',
          'content-disposition': `attachment; filename="${longName}"`
        }
      });
    let client = new GenesisClient({ token: 'token' });

    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'csv' })
    ).resolves.toMatchObject({ fileName: 'table.zip' });
    await expect(
      client.downloadTable({ language: 'en', tableCode: '12411-0001', format: 'xlsx' })
    ).resolves.toMatchObject({ fileName: 'workbook.xlsx' });
    let cube = await client.downloadCube({ language: 'en', cubeCode: '12411BJ01' });
    expect(cube.fileName).toMatch(/\.csv$/);
    expect([...cube.fileName]).toHaveLength(120);
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
