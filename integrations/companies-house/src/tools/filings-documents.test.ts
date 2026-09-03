import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import { companiesHouseValidationError } from '../lib/errors';
import {
  mapDocumentMetadata,
  mapFilingHistoryEnvelope,
  mapFilingRecord
} from '../lib/mappers';
import { downloadFilingDocument, getDocumentMetadata } from './documents';
import { getFilingHistoryItem, listFilingHistory } from './filings';

let context = <T>(input: T) => ({ input, auth: { token: 'secret-key' }, config: {} }) as never;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('filing and document tool contracts', () => {
  it('uses exact keys and read-only tags', () => {
    for (let [tool, key] of [
      [listFilingHistory, 'list_filing_history'],
      [getFilingHistoryItem, 'get_filing_history_item'],
      [getDocumentMetadata, 'get_document_metadata'],
      [downloadFilingDocument, 'download_filing_document']
    ] as const) {
      expect(tool.key).toBe(key);
      expect(tool.tags).toEqual({ readOnly: true, destructive: false });
    }
  });

  it('requires unique nonempty categories and bounded pagination', () => {
    expect(listFilingHistory.inputSchema.parse({ companyNumber: ' 01234567 ' })).toEqual({
      companyNumber: '01234567',
      itemsPerPage: 20,
      startIndex: 0
    });
    expect(
      listFilingHistory.inputSchema.safeParse({ companyNumber: '01234567', categories: [] })
        .success
    ).toBe(false);
    expect(
      listFilingHistory.inputSchema.safeParse({
        companyNumber: '01234567',
        categories: ['accounts', 'accounts']
      }).success
    ).toBe(false);
    expect(
      listFilingHistory.inputSchema.safeParse({
        companyNumber: '01234567',
        categories: ['accounts', '  ']
      }).success
    ).toBe(false);
    expect(
      listFilingHistory.inputSchema.safeParse({ companyNumber: '01234567', itemsPerPage: 101 })
        .success
    ).toBe(false);
  });

  it('requires a documented safe content type and directs callers to metadata first', () => {
    expect(downloadFilingDocument.inputSchema.safeParse({ documentId: 'doc-1' }).success).toBe(
      false
    );
    for (let contentType of [
      'application/pdf',
      'application/json',
      'application/xml',
      'application/xhtml+xml',
      'application/zip',
      'text/csv'
    ]) {
      expect(
        downloadFilingDocument.inputSchema.safeParse({ documentId: 'doc-1', contentType })
          .success
      ).toBe(true);
    }
    expect(
      downloadFilingDocument.inputSchema.safeParse({
        documentId: 'doc-1',
        contentType: 'text/html'
      }).success
    ).toBe(false);
    let jsonSchema = z.toJSONSchema(downloadFilingDocument.inputSchema) as {
      properties?: Record<string, { description?: string }>;
    };
    expect(jsonSchema.properties?.contentType?.description).toContain('get_document_metadata');
  });
});

describe('filing and metadata mapping', () => {
  it('maps the official filing shape and extracts a document ID from its metadata link', () => {
    let record = {
      annotations: [
        { annotation: 'Replacement document', date: '2024-02-04', description: 'annotation' }
      ],
      associated_filings: [
        { date: '2024-02-03', description: 'associated-filing', type: 'RP04' }
      ],
      barcode: 'X1234567',
      category: 'accounts',
      date: '2024-02-02',
      description: 'accounts-with-accounts-type-full',
      links: {
        document_metadata: '/document/doc%2F123',
        self: '/company/01234567/filing-history/tx-1'
      },
      pages: 7,
      paper_filed: true,
      resolutions: [
        {
          category: 'miscellaneous',
          description: 'ordinary-resolution',
          document_id: 'resolution-document-1',
          receive_date: '2024-02-01',
          subcategory: 'resolution',
          type: 'RES01'
        }
      ],
      subcategory: 'resolution',
      transaction_id: 'tx-1',
      type: 'AA',
      future_field: { retained: true }
    };

    expect(mapFilingRecord(record)).toEqual({
      transactionId: 'tx-1',
      documentId: 'doc/123',
      barcode: 'X1234567',
      category: 'accounts',
      subcategory: 'resolution',
      date: '2024-02-02',
      description: 'accounts-with-accounts-type-full',
      type: 'AA',
      pages: 7,
      paperFiled: true,
      annotations: [
        {
          annotation: 'Replacement document',
          date: '2024-02-04',
          description: 'annotation',
          record: record.annotations[0]
        }
      ],
      associatedFilings: [
        {
          date: '2024-02-03',
          description: 'associated-filing',
          type: 'RP04',
          record: record.associated_filings[0]
        }
      ],
      resolutions: [
        {
          category: 'miscellaneous',
          description: 'ordinary-resolution',
          documentId: 'resolution-document-1',
          receivedOn: '2024-02-01',
          subcategory: 'resolution',
          type: 'RES01',
          record: record.resolutions[0]
        }
      ],
      links: record.links,
      record
    });
  });

  it('maps filing list status and provider pagination', () => {
    let record = {
      etag: 'etag-1',
      filing_history_status: 'future-status',
      items: [
        {
          category: 'accounts',
          date: '2024-02-02',
          description: 'accounts-with-accounts-type-full',
          transaction_id: 'tx-1',
          type: 'AA'
        }
      ],
      items_per_page: 10,
      kind: 'filing-history',
      start_index: 30,
      total_count: 41,
      future_field: true
    };
    expect(
      mapFilingHistoryEnvelope(record, '01234567', { itemsPerPage: 20, startIndex: 0 })
    ).toMatchObject({
      companyNumber: '01234567',
      filingHistoryStatus: 'future-status',
      itemsPerPage: 10,
      startIndex: 30,
      totalCount: 41,
      filings: [{ transactionId: 'tx-1', category: 'accounts', type: 'AA' }],
      record
    });
  });

  it('maps official document resources to an available-content-type list', () => {
    let record = {
      etag: 'etag-1',
      company_number: '01234567',
      created_at: '2024-02-01T10:11:12Z',
      updated_at: '2024-02-02T10:11:12Z',
      id: 'doc-123',
      pages: 3,
      links: { self: '/document/doc-123', document: '/document/doc-123/content' },
      resources: {
        'application/pdf': {
          content_length: 1024,
          created_at: '2024-02-01T10:11:12Z',
          updated_at: '2024-02-02T10:11:12Z'
        },
        'application/xml': {
          content_length: 512,
          created_at: '2024-02-01T10:11:12Z',
          future_field: true
        }
      },
      future_field: true
    };

    expect(mapDocumentMetadata(record)).toEqual({
      documentId: 'doc-123',
      companyNumber: '01234567',
      createdAt: '2024-02-01T10:11:12Z',
      updatedAt: '2024-02-02T10:11:12Z',
      pages: 3,
      availableContentTypes: [
        {
          mimeType: 'application/pdf',
          contentLength: 1024,
          createdAt: '2024-02-01T10:11:12Z',
          updatedAt: '2024-02-02T10:11:12Z',
          record: record.resources['application/pdf']
        },
        {
          mimeType: 'application/xml',
          contentLength: 512,
          createdAt: '2024-02-01T10:11:12Z',
          record: record.resources['application/xml']
        }
      ],
      links: record.links,
      resources: expect.any(Object),
      record
    });
  });
});

describe('filing and document invocations', () => {
  it('passes filing filters and coordinates exactly', async () => {
    vi.spyOn(CompaniesHouseClient.prototype, 'listFilingHistory').mockResolvedValue({
      companyNumber: '01234567',
      filingHistoryStatus: 'filing-history-available',
      filings: [],
      itemsPerPage: 5,
      startIndex: 10,
      totalCount: 0,
      record: {}
    } as never);

    let result = await listFilingHistory.handleInvocation(
      context({
        companyNumber: '01234567',
        categories: ['accounts', 'capital'],
        itemsPerPage: 5,
        startIndex: 10
      })
    );

    expect(CompaniesHouseClient.prototype.listFilingHistory).toHaveBeenCalledWith('01234567', {
      categories: ['accounts', 'capital'],
      itemsPerPage: 5,
      startIndex: 10
    });
    expect(listFilingHistory.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it('uses request identifiers as stable filing and metadata fallbacks', async () => {
    vi.spyOn(CompaniesHouseClient.prototype, 'getFilingHistoryItem').mockResolvedValue({
      transactionId: 'tx-1',
      category: 'accounts',
      date: '2024-01-01',
      description: 'accounts-with-accounts-type-full',
      type: 'AA',
      record: {}
    } as never);
    vi.spyOn(CompaniesHouseClient.prototype, 'getDocumentMetadata').mockResolvedValue({
      documentId: 'doc-1',
      availableContentTypes: [],
      resources: {},
      record: {}
    } as never);

    let filing = await getFilingHistoryItem.handleInvocation(
      context({ companyNumber: '01234567', transactionId: 'tx-1' })
    );
    let metadata = await getDocumentMetadata.handleInvocation(
      context({ documentId: 'doc-1' })
    );

    expect(getFilingHistoryItem.outputSchema.parse(filing.output)).toEqual(filing.output);
    expect(getDocumentMetadata.outputSchema.parse(metadata.output)).toEqual(metadata.output);
    expect(filing.output.companyNumber).toBe('01234567');
    expect(metadata.output.documentId).toBe('doc-1');
  });

  it('returns exactly one downloaded file while structured output contains metadata only', async () => {
    let bytes = Buffer.from([0, 255, 13, 37]);
    vi.spyOn(CompaniesHouseClient.prototype, 'getDocumentContent').mockResolvedValue({
      documentId: 'doc/123',
      content: bytes,
      mimeType: 'application/pdf',
      extension: 'pdf'
    });

    let result = await downloadFilingDocument.handleInvocation(
      context({ documentId: 'doc/123', contentType: 'application/pdf' })
    );

    expect(CompaniesHouseClient.prototype.getDocumentContent).toHaveBeenCalledWith(
      'doc/123',
      'application/pdf'
    );
    expect(result.output).toEqual({
      documentId: 'doc/123',
      fileName: 'companies-house-doc_123.pdf',
      mimeType: 'application/pdf',
      byteLength: 4
    });
    expect(result.attachments).toEqual([
      {
        mimeType: 'application/pdf',
        content: { type: 'content', encoding: 'base64', content: bytes.toString('base64') }
      }
    ]);
    expect(Object.keys(result.output).sort()).toEqual([
      'byteLength',
      'documentId',
      'fileName',
      'mimeType'
    ]);
    expect(JSON.stringify(result.output)).not.toMatch(/base64|content|attachment/i);
    expect(result.message).toContain('Downloaded file');
    expect(result.message).not.toMatch(/attachment|Slates/i);
  });

  it('preserves 406 remediation as a ServiceError', async () => {
    vi.spyOn(CompaniesHouseClient.prototype, 'getDocumentContent').mockRejectedValue(
      companiesHouseValidationError(
        'Companies House could not provide the requested document representation. Choose a MIME type advertised by the document metadata.'
      )
    );

    await expect(
      downloadFilingDocument.handleInvocation(
        context({ documentId: 'doc-1', contentType: 'application/pdf' })
      )
    ).rejects.toBeInstanceOf(ServiceError);
  });
});
