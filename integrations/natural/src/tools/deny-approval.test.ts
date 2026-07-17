import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { denyApproval } from './admin';

const approvalId = 'apr_550e8400e29b41d4a716446655440000';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('deny_approval', () => {
  it('accepts only documented Natural approval IDs and is marked destructive', () => {
    expect(denyApproval.inputSchema.safeParse({ approvalId, confirm: true }).success).toBe(
      true
    );
    expect(
      denyApproval.inputSchema.safeParse({
        approvalId: 'pay_550e8400e29b41d4a716446655440000',
        confirm: true
      }).success
    ).toBe(false);
    expect(
      denyApproval.inputSchema.safeParse({
        approvalId: 'apr_550E8400e29b41d4a716446655440000',
        confirm: true
      }).success
    ).toBe(false);
    expect(
      denyApproval.inputSchema.safeParse({ approvalId: 'apr_invalid', confirm: true }).success
    ).toBe(false);
    expect(denyApproval.tags).toMatchObject({ destructive: true });
  });

  it('requires explicit confirmation before denying', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');

    await expect(
      denyApproval.handleInvocation({
        input: { approvalId, confirm: false },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
    ).rejects.toThrow(/confirm/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('posts without a body or idempotency key and exposes decision metadata plus the raw record', async () => {
    const approval = {
      type: 'approval',
      id: approvalId,
      attributes: {
        status: 'denied',
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
        updatedAt: '2026-01-04T15:45:00.000Z',
        resolvedAt: '2026-01-04T15:45:00.000Z',
        futureApprovalField: 'preserved'
      }
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: approval
    });

    const result = await denyApproval.handleInvocation({
      input: { approvalId, confirm: true },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'deny approval',
      'post',
      `/approvals/${approvalId}/deny`
    );
    expect(denyApproval.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      approvalId,
      type: approval.type,
      status: approval.attributes.status,
      targetType: approval.attributes.target.type,
      targetId: approval.attributes.target.id,
      reasons: approval.attributes.reasons,
      createdAt: approval.attributes.createdAt,
      updatedAt: approval.attributes.updatedAt,
      resolvedAt: approval.attributes.resolvedAt,
      approval
    });
    expect(result.message).toBe(`Denied approval **${approvalId}**.`);
  });
});
