import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpMocks = vi.hoisted(() => ({
  publicGet: vi.fn(),
  documentGet: vi.fn(),
  downloadGet: vi.fn(),
  createAuthenticatedAxios: vi.fn(),
  createAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  httpMocks.createAuthenticatedAxios.mockImplementation((config: { baseURL?: string }) =>
    config.baseURL === 'https://api.company-information.service.gov.uk'
      ? { get: httpMocks.publicGet }
      : { get: httpMocks.documentGet }
  );
  httpMocks.createAxios.mockImplementation(() => ({ get: httpMocks.downloadGet }));
  return {
    ...actual,
    createAuthenticatedAxios: httpMocks.createAuthenticatedAxios,
    createAxios: httpMocks.createAxios
  };
});

import {
  type CompaniesHouseAdvancedSearchParams,
  CompaniesHouseClient,
  type CompaniesHouseSearchRestriction
} from './client';
import {
  DOCUMENT_API_BASE_URL,
  MAX_DOCUMENT_DOWNLOAD_BYTES,
  PUBLIC_DATA_BASE_URL
} from './constants';

let createClient = () => new CompaniesHouseClient({ token: 'secret-key' });
let emptySearch = { items: [], items_per_page: 20, start_index: 0, total_results: 0 };
let metadata = (contentLength = 4) => ({
  id: 'doc-123',
  resources: {
    'application/pdf': { content_length: contentLength },
    'text/csv': { content_length: contentLength }
  }
});

describe('CompaniesHouseClient transport setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses exact Basic credentials and JSON Accept only on provider clients', () => {
    createClient();
    let authorization = `Basic ${Buffer.from('secret-key:').toString('base64')}`;

    expect(httpMocks.createAuthenticatedAxios).toHaveBeenNthCalledWith(1, {
      baseURL: PUBLIC_DATA_BASE_URL,
      authHeader: { value: authorization },
      contentType: false,
      headers: { Accept: 'application/json' }
    });
    expect(httpMocks.createAuthenticatedAxios).toHaveBeenNthCalledWith(2, {
      baseURL: DOCUMENT_API_BASE_URL,
      authHeader: { value: authorization },
      contentType: false,
      headers: { Accept: 'application/json' }
    });
    expect(httpMocks.createAxios).toHaveBeenCalledWith();
  });
});

describe('CompaniesHouseClient endpoint requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpMocks.publicGet.mockResolvedValue({ data: emptySearch });
    httpMocks.documentGet.mockResolvedValue({ data: metadata() });
  });

  it('uses exact encoded paths, query keys, defaults, and documented boolean strings', async () => {
    let client = createClient();

    await client.searchCompanies({
      query: 'Example',
      restrictions: ['active-companies', 'legally-equivalent-company-name'],
      itemsPerPage: 10,
      startIndex: 2
    });
    await client.getCompanyProfile('A/B');
    await client.searchOfficers({ query: 'Jane Doe' });
    await client.listCompanyOfficers('A/B', {
      orderBy: 'appointed_on',
      registerType: 'directors',
      registerView: true
    });
    await client.listOfficerAppointments('officer/1');
    await client.searchDisqualifiedOfficers({ query: 'Jane Doe' });
    await client.getOfficerDisqualifications('officer/1', 'natural');
    await client.getOfficerDisqualifications('company/1', 'corporate');
    await client.listFilingHistory('A/B', { categories: ['accounts', 'capital'] });
    await client.getFilingHistoryItem('A/B', 'tx/1');
    await client.getDocumentMetadata('doc/1');
    await client.listCompanyCharges('A/B');
    await client.getCompanyCharge('A/B', 'charge/1');
    await client.getCompanyInsolvency('A/B');
    await client.listCompanyPscs('A/B', { registerView: false });
    await client.listPscStatements('A/B', { registerView: true });

    expect(httpMocks.publicGet.mock.calls).toEqual([
      [
        '/search/companies',
        {
          params: {
            q: 'Example',
            restrictions: 'active-companies legally-equivalent-company-name',
            items_per_page: 10,
            start_index: 2
          }
        }
      ],
      ['/company/A%2FB'],
      ['/search/officers', { params: { q: 'Jane Doe', items_per_page: 20, start_index: 0 } }],
      [
        '/company/A%2FB/officers',
        {
          params: {
            items_per_page: 20,
            order_by: 'appointed_on',
            register_type: 'directors',
            register_view: 'true',
            start_index: 0
          }
        }
      ],
      [
        '/officers/officer%2F1/appointments',
        { params: { items_per_page: 20, start_index: 0 } }
      ],
      [
        '/search/disqualified-officers',
        { params: { q: 'Jane Doe', items_per_page: 20, start_index: 0 } }
      ],
      ['/disqualified-officers/natural/officer%2F1'],
      ['/disqualified-officers/corporate/company%2F1'],
      [
        '/company/A%2FB/filing-history',
        { params: { category: 'accounts,capital', items_per_page: 20, start_index: 0 } }
      ],
      ['/company/A%2FB/filing-history/tx%2F1'],
      ['/company/A%2FB/charges'],
      ['/company/A%2FB/charges/charge%2F1'],
      ['/company/A%2FB/insolvency'],
      [
        '/company/A%2FB/persons-with-significant-control',
        { params: { items_per_page: 20, register_view: 'false', start_index: 0 } }
      ],
      [
        '/company/A%2FB/persons-with-significant-control-statements',
        { params: { items_per_page: 20, register_view: 'true', start_index: 0 } }
      ]
    ]);
    expect(httpMocks.documentGet).toHaveBeenCalledWith('/document/doc%2F1');
  });

  it('serializes advanced arrays with commas and omits undefined filters', async () => {
    httpMocks.publicGet.mockResolvedValueOnce({ data: { hits: '0', items: [] } });
    let client = createClient();
    let params: CompaniesHouseAdvancedSearchParams = {
      companyNameIncludes: 'Example',
      companyNameExcludes: 'Dormant',
      companyStatus: ['active', 'dissolved'],
      companyType: ['ltd', 'plc'],
      companySubtype: ['community-interest-company'],
      incorporatedFrom: '2020-01-01',
      incorporatedTo: '2024-01-01',
      dissolvedFrom: '2024-02-01',
      dissolvedTo: '2024-03-01',
      location: 'London',
      sicCodes: ['62012', '62020'],
      itemsPerPage: 25,
      startIndex: 50
    };

    await expect(client.searchCompaniesAdvanced(params)).resolves.toMatchObject({
      totalResults: 0,
      itemsPerPage: 25,
      startIndex: 50
    });
    expect(httpMocks.publicGet).toHaveBeenCalledWith('/advanced-search/companies', {
      params: {
        company_name_includes: 'Example',
        company_name_excludes: 'Dormant',
        company_status: 'active,dissolved',
        company_subtype: 'community-interest-company',
        company_type: 'ltd,plc',
        incorporated_from: '2020-01-01',
        incorporated_to: '2024-01-01',
        dissolved_from: '2024-02-01',
        dissolved_to: '2024-03-01',
        location: 'London',
        sic_codes: '62012,62020',
        size: 25,
        start_index: 50
      }
    });
  });

  it.each([
    { name: 'an empty list', restrictions: [] },
    {
      name: 'duplicate values',
      restrictions: ['active-companies', 'active-companies']
    },
    { name: 'an invalid runtime value', restrictions: ['dissolved-companies'] }
  ])('rejects simple-search restrictions containing $name before HTTP', async ({
    restrictions
  }) => {
    let error = await createClient()
      .searchCompanies({
        query: 'Example',
        restrictions: restrictions as CompaniesHouseSearchRestriction[]
      })
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toContain('restrictions');
    expect(httpMocks.publicGet).not.toHaveBeenCalled();
  });

  it.each([
    [{}, 'business filter'],
    [
      {
        companyNameIncludes: 'Example',
        incorporatedFrom: '2024-01-02',
        incorporatedTo: '2024-01-01'
      },
      'incorporated'
    ],
    [
      {
        companyNameIncludes: 'Example',
        dissolvedFrom: '2024-01-02',
        dissolvedTo: '2024-01-01'
      },
      'dissolved'
    ],
    [
      {
        companyNameIncludes: 'Example',
        incorporatedFrom: '2024-02-30'
      },
      'incorporatedfrom'
    ]
  ])('rejects invalid advanced search locally', async (params, message) => {
    let client = createClient();
    let error = await client
      .searchCompaniesAdvanced(params as CompaniesHouseAdvancedSearchParams)
      .catch(error => error);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message.toLowerCase()).toContain(message);
    expect(httpMocks.publicGet).not.toHaveBeenCalled();
  });

  it('rejects a register type without register view and an unknown disqualification path', async () => {
    let client = createClient();

    let registerError = await client
      .listCompanyOfficers('01234567', { registerType: 'directors' })
      .catch(error => error);
    let discriminatorError = await client
      .getOfficerDisqualifications('officer-1', 'unknown' as 'natural')
      .catch(error => error);

    expect(registerError).toBeInstanceOf(ServiceError);
    expect(registerError.data.message).toContain('registerView');
    expect(discriminatorError).toBeInstanceOf(ServiceError);
    expect(discriminatorError.data.message).toContain('officerType');
    expect(httpMocks.publicGet).not.toHaveBeenCalled();
  });
});

describe('CompaniesHouseClient error normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes documented advanced-search 404 to an empty successful page', async () => {
    httpMocks.publicGet.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'No companies found' } }
    });
    await expect(
      createClient().searchCompaniesAdvanced({ companyNameIncludes: 'No such company' })
    ).resolves.toEqual({
      items: [],
      itemsPerPage: 20,
      startIndex: 0,
      totalResults: 0,
      record: { hits: '0', items: [] }
    });
  });

  it.each([
    [401, 'authentication'],
    [404, 'not found'],
    [406, 'representation'],
    [429, 'rate limit']
  ])('maps HTTP %i to a provider-labeled ServiceError without leaking the key', async (status, text) => {
    httpMocks.publicGet.mockRejectedValueOnce({
      message: 'request with secret-key failed',
      response: {
        status,
        data: { message: 'secret-key' },
        headers: { 'x-ratelimit-reset': '120' }
      }
    });

    let error = await createClient()
      .getCompanyProfile('missing')
      .catch(error => error);
    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({
      reason: 'companies_house_api_error',
      upstreamStatus: status
    });
    expect(error.data.message).toContain('Companies House');
    expect(error.data.message.toLowerCase()).toContain(text);
    expect(error.data.message).not.toContain('secret-key');
    if (status === 429) {
      expect(error.data.message).toContain('X-RateLimit-Reset time 120');
      expect(error.data.message).not.toContain('120 seconds');
    }
  });
});

describe('CompaniesHouseClient document downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('discovers metadata, follows one HTTPS location, and never sends auth to it', async () => {
    let bytes = Buffer.from([0, 255, 13, 37]);
    httpMocks.documentGet
      .mockResolvedValueOnce({ data: metadata(bytes.length) })
      .mockResolvedValueOnce({
        status: 302,
        headers: { location: 'https://files.example.gov.uk/signed/document.pdf' }
      });
    httpMocks.downloadGet.mockResolvedValueOnce({
      status: 200,
      data: bytes,
      headers: { 'content-type': 'application/pdf', 'content-length': String(bytes.length) }
    });

    let result = await createClient().getDocumentContent('doc-123', 'application/pdf');

    expect(httpMocks.documentGet).toHaveBeenNthCalledWith(1, '/document/doc-123');
    expect(httpMocks.documentGet).toHaveBeenNthCalledWith(
      2,
      '/document/doc-123/content',
      expect.objectContaining({
        headers: { Accept: 'application/pdf' },
        maxRedirects: 0,
        validateStatus: expect.any(Function)
      })
    );
    expect(httpMocks.downloadGet).toHaveBeenCalledWith(
      'https://files.example.gov.uk/signed/document.pdf',
      expect.objectContaining({
        responseType: 'arraybuffer',
        maxRedirects: 0,
        maxBodyLength: MAX_DOCUMENT_DOWNLOAD_BYTES,
        maxContentLength: MAX_DOCUMENT_DOWNLOAD_BYTES
      })
    );
    expect(httpMocks.downloadGet.mock.calls[0]?.[1]).not.toHaveProperty('headers');
    expect(result).toEqual({
      documentId: 'doc-123',
      content: bytes,
      mimeType: 'application/pdf',
      extension: 'pdf'
    });
  });

  it.each([
    undefined,
    'application/octet-stream',
    'binary/octet-stream'
  ])('falls back to the requested MIME for a generic response MIME %j', async responseMime => {
    let bytes = Buffer.from([1, 2, 3]);
    httpMocks.documentGet
      .mockResolvedValueOnce({ data: metadata(bytes.length) })
      .mockResolvedValueOnce({
        status: 302,
        headers: { location: 'https://files.example.gov.uk/signed/document.csv' }
      });
    httpMocks.downloadGet.mockResolvedValueOnce({
      status: 200,
      data: bytes,
      headers: responseMime ? { 'content-type': responseMime } : {}
    });

    await expect(createClient().getDocumentContent('doc-123', 'text/csv')).resolves.toEqual({
      documentId: 'doc-123',
      content: bytes,
      mimeType: 'text/csv',
      extension: 'csv'
    });
  });

  it.each([
    {
      name: 'unadvertised MIME',
      setup: () => httpMocks.documentGet.mockResolvedValueOnce({ data: metadata() }),
      mimeType: 'application/zip',
      reason: 'companies_house_document_mime_unavailable'
    },
    {
      name: 'metadata-declared oversize content',
      setup: () =>
        httpMocks.documentGet.mockResolvedValueOnce({
          data: metadata(MAX_DOCUMENT_DOWNLOAD_BYTES + 1)
        }),
      mimeType: 'application/pdf',
      reason: 'companies_house_document_too_large'
    },
    {
      name: 'missing redirect location',
      setup: () => {
        httpMocks.documentGet
          .mockResolvedValueOnce({ data: metadata() })
          .mockResolvedValueOnce({ status: 302, headers: {} });
      },
      mimeType: 'application/pdf',
      reason: 'companies_house_document_redirect_invalid'
    },
    {
      name: 'non-HTTPS redirect location',
      setup: () => {
        httpMocks.documentGet
          .mockResolvedValueOnce({ data: metadata() })
          .mockResolvedValueOnce({
            status: 302,
            headers: { location: 'http://files.example.gov.uk/document.pdf' }
          });
      },
      mimeType: 'application/pdf',
      reason: 'companies_house_document_redirect_invalid'
    },
    {
      name: 'declared oversize download',
      setup: () => {
        httpMocks.documentGet
          .mockResolvedValueOnce({ data: metadata() })
          .mockResolvedValueOnce({
            status: 302,
            headers: { location: 'https://files.example.gov.uk/document.pdf' }
          });
        httpMocks.downloadGet.mockResolvedValueOnce({
          status: 200,
          data: Buffer.from([1]),
          headers: {
            'content-type': 'application/pdf',
            'content-length': String(MAX_DOCUMENT_DOWNLOAD_BYTES + 1)
          }
        });
      },
      mimeType: 'application/pdf',
      reason: 'companies_house_document_too_large'
    },
    {
      name: 'empty body',
      setup: () => {
        httpMocks.documentGet
          .mockResolvedValueOnce({ data: metadata() })
          .mockResolvedValueOnce({
            status: 302,
            headers: { location: 'https://files.example.gov.uk/document.pdf' }
          });
        httpMocks.downloadGet.mockResolvedValueOnce({
          status: 200,
          data: Buffer.alloc(0),
          headers: { 'content-type': 'application/pdf' }
        });
      },
      mimeType: 'application/pdf',
      reason: 'companies_house_document_body_invalid'
    },
    {
      name: 'non-binary body',
      setup: () => {
        httpMocks.documentGet
          .mockResolvedValueOnce({ data: metadata() })
          .mockResolvedValueOnce({
            status: 302,
            headers: { location: 'https://files.example.gov.uk/document.pdf' }
          });
        httpMocks.downloadGet.mockResolvedValueOnce({
          status: 200,
          data: '<html>not a document</html>',
          headers: { 'content-type': 'application/pdf' }
        });
      },
      mimeType: 'application/pdf',
      reason: 'companies_house_document_body_invalid'
    },
    {
      name: 'unexpected unsafe MIME',
      setup: () => {
        httpMocks.documentGet
          .mockResolvedValueOnce({ data: metadata() })
          .mockResolvedValueOnce({
            status: 302,
            headers: { location: 'https://files.example.gov.uk/document.pdf' }
          });
        httpMocks.downloadGet.mockResolvedValueOnce({
          status: 200,
          data: Buffer.from([1]),
          headers: { 'content-type': 'text/html' }
        });
      },
      mimeType: 'application/pdf',
      reason: 'companies_house_document_mime_invalid'
    }
  ])('rejects $name', async ({ setup, mimeType, reason }) => {
    setup();
    let error = await createClient()
      .getDocumentContent('doc-123', mimeType)
      .catch(error => error);
    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.reason).toBe(reason);
  });

  it('rejects actual content above the limit while preserving arbitrary valid bytes otherwise', async () => {
    let oversized = Buffer.alloc(MAX_DOCUMENT_DOWNLOAD_BYTES + 1, 7);
    httpMocks.documentGet.mockResolvedValueOnce({ data: metadata() }).mockResolvedValueOnce({
      status: 302,
      headers: { location: 'https://files.example.gov.uk/document.pdf' }
    });
    httpMocks.downloadGet.mockResolvedValueOnce({
      status: 200,
      data: oversized,
      headers: { 'content-type': 'application/pdf' }
    });

    let error = await createClient()
      .getDocumentContent('doc-123', 'application/pdf')
      .catch(error => error);
    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.reason).toBe('companies_house_document_too_large');
  });
});
