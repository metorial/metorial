import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { withdrawFunds } from './money-movement';

const { axiosRequest } = vi.hoisted(() => ({
  axiosRequest: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  const actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAuthenticatedAxios: vi.fn(() => ({ request: axiosRequest }))
  };
});

const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
const walletId = 'wal_550e8400e29b41d4a716446655440000';
const externalAccountId = 'eac_550e8400e29b41d4a716446655440000';
const transferId = 'trf_650e8400e29b41d4a716446655440000';
const transactionId = 'txn_650e8400e29b41d4a716446655440000';

const validInput = {
  amount: 12500,
  currency: 'USD' as const,
  externalAccountId,
  walletId,
  description: 'Payout transfer',
  idempotencyKey: 'withdraw-funds-1',
  confirm: true
};

afterEach(() => {
  vi.restoreAllMocks();
  axiosRequest.mockReset();
});

describe('withdraw_funds', () => {
  it('enforces documented withdrawal constraints and identifies the action as destructive', () => {
    expect(withdrawFunds.tags).toMatchObject({ destructive: true });
    expect(withdrawFunds.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      withdrawFunds.inputSchema.safeParse({ ...validInput, currency: 'EUR' }).success
    ).toBe(true);
    expect(
      withdrawFunds.inputSchema.safeParse({
        ...validInput,
        currency: undefined,
        walletId: undefined
      }).success
    ).toBe(true);

    for (const invalidInput of [
      { ...validInput, amount: 0 },
      { ...validInput, amount: 100.5 },
      { ...validInput, currency: '' },
      { ...validInput, currency: 123 },
      { ...validInput, externalAccountId: 'external-account-123' },
      { ...validInput, walletId: 'wallet-123' },
      { ...validInput, description: 'x'.repeat(256) }
    ]) {
      expect(withdrawFunds.inputSchema.safeParse(invalidInput).success).toBe(false);
    }
  });

  it('requires explicit confirmation and an idempotency key before requesting a withdrawal', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      withdrawFunds.handleInvocation({
        ...context,
        input: { ...validInput, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      withdrawFunds.handleInvocation({
        ...context,
        input: { ...validInput, idempotencyKey: undefined }
      } as never)
    ).rejects.toThrow(/idempotencyKey/);
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects an agent-key withdrawal without an instance ID before HTTP dispatch', async () => {
    const error = await withdrawFunds
      .handleInvocation({
        input: validInput,
        auth: { token: 'ak_ntl_test', keyType: 'agent_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_validation_error');
    expect(error.message).toMatch(/X-Instance-ID.+agent-attributed money movement/i);
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  it.each([
    {
      keyType: 'agent_key' as const,
      config: { instanceId: 'withdrawal-run-123' },
      expectedHeaders: {
        'Idempotency-Key': 'withdraw-funds-1',
        'X-Instance-ID': 'withdrawal-run-123'
      }
    },
    {
      keyType: 'party_key' as const,
      config: {},
      expectedHeaders: {
        'Idempotency-Key': 'withdraw-funds-1'
      }
    }
  ])('keeps the withdrawal contract for $keyType authentication', async ({
    keyType,
    config,
    expectedHeaders
  }) => {
    const transfer = {
      type: 'transfer',
      id: transferId,
      attributes: {
        type: 'withdrawal',
        amount: 12500,
        currency: 'USD',
        status: 'PROCESSING'
      },
      relationships: {}
    };
    axiosRequest.mockResolvedValue({ data: { data: transfer } });

    const result = await withdrawFunds.handleInvocation({
      input: validInput,
      auth: { token: `${keyType}_test`, keyType },
      config
    } as never);

    expect(axiosRequest).toHaveBeenCalledWith({
      method: 'post',
      url: '/transfers/withdraw',
      params: undefined,
      data: {
        data: {
          attributes: {
            amount: 12500,
            currency: 'USD',
            externalAccountId,
            walletId,
            description: 'Payout transfer'
          }
        }
      },
      headers: expectedHeaders
    });
    expect(result.output.transferId).toBe(transferId);
    expect(result.output.transfer).toEqual(transfer);
  });

  it('posts the documented JSON:API attributes and exposes withdrawal lifecycle metadata', async () => {
    const transfer = {
      type: 'transfer',
      id: transferId,
      attributes: {
        type: 'withdrawal',
        amount: 12500,
        currency: 'USD',
        status: 'PROCESSING',
        description: 'Payout transfer',
        externalAccountDisplayMask: '6789',
        expectedAvailableAt: '2026-01-06T15:30:00Z',
        failure: null,
        return: null,
        submittedAt: '2026-01-04T15:30:00Z',
        settledAt: null,
        createdAt: '2026-01-04T15:30:00Z',
        updatedAt: '2026-01-04T15:30:00Z'
      },
      relationships: {
        party: { data: { type: 'party', id: partyId } },
        wallet: { data: { type: 'wallet', id: walletId } },
        externalAccount: {
          data: { type: 'externalAccount', id: externalAccountId }
        },
        transaction: {
          data: { type: 'transaction', id: transactionId }
        }
      }
    };
    const request = vi
      .spyOn(NaturalClient.prototype, 'request')
      .mockResolvedValue({ data: transfer });

    const result = await withdrawFunds.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('withdraw funds', 'post', '/transfers/withdraw', {
      requiresAgentInstance: true,
      idempotencyKey: 'withdraw-funds-1',
      body: {
        data: {
          attributes: {
            amount: 12500,
            currency: 'USD',
            externalAccountId,
            walletId,
            description: 'Payout transfer'
          }
        }
      }
    });
    expect(withdrawFunds.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      transferId,
      transactionId,
      partyId,
      walletId,
      externalAccountId,
      type: 'transfer',
      transferType: 'withdrawal',
      status: 'PROCESSING',
      amount: 12500,
      currency: 'USD',
      description: 'Payout transfer',
      externalAccountDisplayMask: '6789',
      expectedAvailableAt: '2026-01-06T15:30:00Z',
      failure: null,
      return: null,
      submittedAt: '2026-01-04T15:30:00Z',
      settledAt: null,
      createdAt: '2026-01-04T15:30:00Z',
      updatedAt: '2026-01-04T15:30:00Z',
      transfer
    });
    expect(result.message).toBe(`Initiated Natural withdrawal **${transferId}**.`);
  });
});
