import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  api: {
    get: vi.fn()
  },
  createAuthenticatedAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAuthenticatedAxios: axiosMocks.createAuthenticatedAxios
  };
});

import { listDocumentAttachments } from './attachments';

let invokeListDocumentAttachments = (input: Record<string, unknown>) =>
  listDocumentAttachments.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReturnValue(axiosMocks.api);
});

describe('Business Central list document attachments', () => {
  it('uses the documented documentAttachments navigation and maps byteSize metadata', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [
          {
            id: 'ATT00089',
            fileName: 'Invoice_10542.pdf',
            byteSize: 245823,
            attachmentContent: 'JVBERi0x',
            parentType: 'Purchase Invoice',
            parentId: '22222222-2222-2222-2222-222222222222',
            lineNumber: 0,
            documentFlowSales: false,
            documentFlowPurchase: true,
            lastModifiedDateTime: '2025-04-28T09:15:42Z'
          }
        ]
      }
    });

    let result = await invokeListDocumentAttachments({
      parentResource: 'purchaseInvoice',
      parentId: '22222222-2222-2222-2222-222222222222',
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/purchaseInvoices(22222222-2222-2222-2222-222222222222)/documentAttachments',
      {
        params: {
          $top: 5,
          $skip: 0
        }
      }
    );
    expect(result.output.documentAttachments[0]).toMatchObject({
      id: 'ATT00089',
      fileName: 'Invoice_10542.pdf',
      parentResource: 'purchaseInvoice',
      parentId: '22222222-2222-2222-2222-222222222222',
      parentType: 'Purchase Invoice',
      byteSize: 245823,
      size: 245823,
      lineNumber: 0,
      documentFlowSales: false,
      documentFlowPurchase: true,
      lastModifiedDateTime: '2025-04-28T09:15:42Z'
    });
    expect(result.output.documentAttachments[0].record).not.toHaveProperty(
      'attachmentContent'
    );
  });

  it('uses the documented attachments navigation for general ledger entries', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [
          {
            id: '33333333-3333-3333-3333-333333333333',
            parentId: '44444444-4444-4444-4444-444444444444',
            fileName: 'receipt.pdf',
            byteSize: 1024,
            parentType: 'Journal'
          }
        ]
      }
    });

    let result = await invokeListDocumentAttachments({
      parentResource: 'generalLedgerEntry',
      parentId: '44444444-4444-4444-4444-444444444444',
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/generalLedgerEntries(44444444-4444-4444-4444-444444444444)/attachments',
      {
        params: {
          $top: 5,
          $skip: 0
        }
      }
    );
    expect(result.output.documentAttachments[0]).toMatchObject({
      id: '33333333-3333-3333-3333-333333333333',
      parentResource: 'generalLedgerEntry',
      parentId: '44444444-4444-4444-4444-444444444444',
      fileName: 'receipt.pdf',
      byteSize: 1024,
      size: 1024,
      parentType: 'Journal'
    });
  });

  it('rejects inline attachment content selection for metadata listing', async () => {
    await expect(
      invokeListDocumentAttachments({
        parentResource: 'purchaseInvoice',
        parentId: '22222222-2222-2222-2222-222222222222',
        select: ['id', 'attachmentContent']
      })
    ).rejects.toBeInstanceOf(ServiceError);
    await expect(
      invokeListDocumentAttachments({
        parentResource: 'purchaseInvoice',
        parentId: '22222222-2222-2222-2222-222222222222',
        select: ['id', 'attachmentContent']
      })
    ).rejects.toThrow('returns metadata only');
    expect(axiosMocks.api.get).not.toHaveBeenCalled();
  });
});
