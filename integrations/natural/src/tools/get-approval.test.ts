import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { getApproval } from './admin';

const approvalId = 'apr_550e8400e29b41d4a716446655440000';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('get_approval', () => {
  it('accepts only documented Natural approval IDs', () => {
    expect(getApproval.inputSchema.safeParse({ approvalId }).success).toBe(true);
    expect(
      getApproval.inputSchema.safeParse({
        approvalId: 'pay_550e8400e29b41d4a716446655440000'
      }).success
    ).toBe(false);
    expect(
      getApproval.inputSchema.safeParse({
        approvalId: 'apr_550E8400e29b41d4a716446655440000'
      }).success
    ).toBe(false);
    expect(getApproval.inputSchema.safeParse({ approvalId: 'apr_invalid' }).success).toBe(
      false
    );
  });

  it('gets the approval without a body and exposes decision metadata plus the raw record', async () => {
    const approval = {
      type: 'approval',
      id: approvalId,
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
            currency: 'USD',
            futureReasonField: 'preserved'
          }
        ],
        createdAt: '2026-01-04T15:30:00.000Z',
        updatedAt: '2026-01-04T15:31:00.000Z',
        resolvedAt: null,
        futureApprovalField: 'preserved'
      }
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: approval
    });

    const result = await getApproval.handleInvocation({
      input: { approvalId },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('get approval', 'get', `/approvals/${approvalId}`);
    expect(getApproval.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      approvalId,
      type: approval.type,
      status: approval.attributes.status,
      targetType: approval.attributes.target.type,
      targetId: approval.attributes.target.id,
      reasons: approval.attributes.reasons,
      createdAt: approval.attributes.createdAt,
      updatedAt: approval.attributes.updatedAt,
      resolvedAt: null,
      approval
    });
  });
});
