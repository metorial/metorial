import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import { listApprovals } from './admin';

const createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  }) as any;

describe('Natural list approvals tool', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('preserves approval decision metadata and the full raw resource', async () => {
    const approval = {
      type: 'approval',
      id: 'apr_550e8400e29b41d4a716446655440000',
      attributes: {
        status: 'pending',
        target: {
          type: 'payment',
          id: 'pay_550e8400e29b41d4a716446655440001'
        },
        reasons: [
          {
            type: 'limitExceeded',
            limitType: 'perTransactionAmount',
            limitAmount: 250000,
            actualAmount: 500000,
            currency: 'USD'
          }
        ],
        createdAt: '2026-01-04T15:30:00.000Z',
        updatedAt: '2026-01-04T15:31:00.000Z',
        resolvedAt: null
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({
      data: [approval],
      meta: {
        pagination: {
          hasMore: true,
          nextCursor: 'cur_next'
        }
      }
    });

    const result = await listApprovals.handleInvocation(
      createCtx({
        limit: 25,
        status: 'pending'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list approvals',
      'get',
      '/approvals',
      {
        params: {
          limit: 25,
          status: 'pending'
        }
      }
    );
    expect(result.output).toEqual({
      approvals: [
        {
          id: approval.id,
          approvalId: approval.id,
          type: approval.type,
          status: approval.attributes.status,
          targetType: approval.attributes.target.type,
          targetId: approval.attributes.target.id,
          reasons: approval.attributes.reasons,
          createdAt: approval.attributes.createdAt,
          updatedAt: approval.attributes.updatedAt,
          resolvedAt: null,
          approval
        }
      ],
      pagination: {
        hasMore: true,
        nextCursor: 'cur_next'
      }
    });
  });
});
