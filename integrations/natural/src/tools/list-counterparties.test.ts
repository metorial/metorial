import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import { listCounterparties } from './resources';

const createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  }) as any;

const counterparty = {
  id: 'pty_550e8400e29b41d4a716446655440002',
  type: 'party',
  attributes: {
    counterpartyPartyId: 'pty_550e8400e29b41d4a716446655440002',
    totalAmountMinor: 500000,
    transactionCount: 5,
    firstAt: '2026-01-04T15:30:00.000Z',
    partyName: 'Acme Supplies',
    partyEmail: 'payables@acmesupplies.com',
    partyStatus: 'ACTIVE'
  }
};

const validEnvelope = {
  data: [counterparty],
  meta: {
    pagination: {
      hasMore: false,
      nextCursor: null
    }
  }
};

describe('Natural list counterparties legacy tool', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('requires an explicit documented legacy direction', () => {
    expect(listCounterparties.inputSchema.safeParse({}).success).toBe(false);
    expect(
      listCounterparties.inputSchema.parse({ direction: 'sent', cursor: 'cur_sent' })
    ).toEqual({ direction: 'sent', limit: 50, cursor: 'cur_sent' });
    expect(
      listCounterparties.inputSchema.parse({ direction: 'received', limit: 100 })
    ).toEqual({ direction: 'received', limit: 100 });
    expect(listCounterparties.inputSchema.safeParse({ direction: 'all' }).success).toBe(false);
    expect(listCounterparties.tags).toMatchObject({ readOnly: true, deprecated: true });
    expect(listCounterparties.description).toMatch(/provider-deprecated legacy/i);
    expect(listCounterparties.constraints).toContain(
      'A direction is required because Natural never documented an unfiltered GET /counterparties endpoint.'
    );
  });

  it.each([
    ['sent', '/counterparties/sent'],
    ['received', '/counterparties/received']
  ] as const)('maps %s to its documented path and sends only pagination query parameters', async (direction, path) => {
    naturalClientMocks.request.mockResolvedValueOnce(validEnvelope);

    await listCounterparties.handleInvocation(
      createCtx({ direction, limit: 25, cursor: 'cur_legacy' })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list counterparties',
      'get',
      path,
      {
        params: {
          limit: 25,
          cursor: 'cur_legacy'
        }
      }
    );
  });

  it('preserves complete raw resources and response metadata while exposing documented aggregate fields', async () => {
    const enrichedCounterparty = {
      ...counterparty,
      attributes: {
        ...counterparty.attributes,
        futureAttribute: { preserved: true }
      },
      relationships: {
        latestPayment: {
          data: { type: 'payment', id: 'pay_future' }
        }
      },
      futureResourceField: 'preserved'
    };
    const meta = {
      pagination: {
        hasMore: true,
        nextCursor: 'cur_next',
        futurePaginationField: 'preserved'
      },
      requestId: 'req_counterparties',
      futureMetaField: { preserved: true }
    };
    naturalClientMocks.request.mockResolvedValueOnce({
      data: [enrichedCounterparty],
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await listCounterparties.handleInvocation(
      createCtx({ direction: 'received', limit: 50 })
    );

    expect(listCounterparties.outputSchema.parse(result.output)).toMatchObject({
      counterparties: [
        {
          id: counterparty.id,
          counterpartyId: counterparty.attributes.counterpartyPartyId,
          partyId: counterparty.attributes.counterpartyPartyId,
          type: 'party',
          name: 'Acme Supplies',
          email: 'payables@acmesupplies.com',
          status: 'ACTIVE',
          totalAmountMinor: 500000,
          transactionCount: 5,
          firstAt: '2026-01-04T15:30:00.000Z',
          counterparty: enrichedCounterparty
        }
      ],
      pagination: {
        hasMore: true,
        nextCursor: 'cur_next'
      },
      meta
    });
    expect(result.output.meta).toEqual(meta);
    expect(result.output.pagination).toEqual(meta.pagination);
    expect(result.message).toBe('Found **1** counterparties.');
  });

  it.each([
    ['missing response', undefined],
    ['missing data', { meta: validEnvelope.meta }],
    ['non-array data', { data: counterparty, meta: validEnvelope.meta }],
    [
      'incomplete resource attributes',
      {
        data: [
          {
            id: counterparty.id,
            type: 'party',
            attributes: {
              counterpartyPartyId: counterparty.id,
              totalAmountMinor: 500000
            }
          }
        ],
        meta: validEnvelope.meta
      }
    ],
    [
      'wrong resource type',
      {
        data: [{ ...counterparty, type: 'counterparty' }],
        meta: validEnvelope.meta
      }
    ],
    ['missing metadata', { data: [counterparty] }],
    ['missing pagination', { data: [counterparty], meta: {} }],
    [
      'invalid has-more value',
      {
        data: [counterparty],
        meta: { pagination: { hasMore: 'false', nextCursor: null } }
      }
    ],
    [
      'invalid next cursor value',
      {
        data: [counterparty],
        meta: { pagination: { hasMore: false, nextCursor: 123 } }
      }
    ]
  ])('rejects a malformed 2xx response with %s', async (_case, response) => {
    naturalClientMocks.request.mockResolvedValueOnce(response);

    const error = await listCounterparties
      .handleInvocation(createCtx({ direction: 'sent', limit: 50 }))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/complete counterparty resources and pagination metadata/i);
    expect(error.message).toMatch(/retry the read|inspect the provider response/i);
  });
});
