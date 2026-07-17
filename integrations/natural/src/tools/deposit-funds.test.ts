import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { depositFunds } from './money-movement';

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
const transferId = 'trf_550e8400e29b41d4a716446655440000';
const transactionId = 'txn_550e8400e29b41d4a716446655440000';

const validInput = {
  amount: 50000,
  currency: 'USD' as const,
  externalAccountId,
  walletId,
  description: 'Wallet top-up',
  idempotencyKey: 'deposit-funds-1',
  confirm: true
};

afterEach(() => {
  vi.restoreAllMocks();
  axiosRequest.mockReset();
});

describe('deposit_funds', () => {
  it('enforces documented deposit constraints and identifies the action as destructive', () => {
    expect(depositFunds.tags).toMatchObject({ destructive: true });
    expect(depositFunds.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      depositFunds.inputSchema.safeParse({
        ...validInput,
        currency: undefined,
        walletId: undefined
      }).success
    ).toBe(true);

    for (const invalidInput of [
      { ...validInput, amount: 99 },
      { ...validInput, amount: 100.5 },
      { ...validInput, currency: 'EUR' },
      { ...validInput, externalAccountId: 'external-account-123' },
      { ...validInput, walletId: 'wallet-123' },
      { ...validInput, description: 'x'.repeat(256) }
    ]) {
      expect(depositFunds.inputSchema.safeParse(invalidInput).success).toBe(false);
    }
  });

  it('requires explicit confirmation and an idempotency key before requesting a deposit', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      depositFunds.handleInvocation({
        ...context,
        input: { ...validInput, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      depositFunds.handleInvocation({
        ...context,
        input: { ...validInput, idempotencyKey: undefined }
      } as never)
    ).rejects.toThrow(/idempotencyKey/);
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects an agent-key deposit without an instance ID before HTTP dispatch', async () => {
    const error = await depositFunds
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
      config: { instanceId: 'deposit-run-123' },
      expectedHeaders: {
        'Idempotency-Key': 'deposit-funds-1',
        'X-Instance-ID': 'deposit-run-123'
      }
    },
    {
      keyType: 'party_key' as const,
      config: {},
      expectedHeaders: {
        'Idempotency-Key': 'deposit-funds-1'
      }
    }
  ])('keeps the deposit contract for $keyType authentication', async ({
    keyType,
    config,
    expectedHeaders
  }) => {
    const transfer = {
      type: 'transfer',
      id: transferId,
      attributes: {
        type: 'deposit',
        amount: 50000,
        currency: 'USD',
        status: 'PROCESSING'
      },
      relationships: {}
    };
    axiosRequest.mockResolvedValue({ data: { data: transfer } });

    const result = await depositFunds.handleInvocation({
      input: validInput,
      auth: { token: `${keyType}_test`, keyType },
      config
    } as never);

    expect(axiosRequest).toHaveBeenCalledWith({
      method: 'post',
      url: '/transfers/deposit',
      params: undefined,
      data: {
        data: {
          attributes: {
            amount: 50000,
            currency: 'USD',
            externalAccountId,
            walletId,
            description: 'Wallet top-up'
          }
        }
      },
      headers: expectedHeaders
    });
    expect(result.output.transferId).toBe(transferId);
    expect(result.output.transfer).toEqual(transfer);
  });

  it('posts the documented JSON:API attributes and exposes transfer lifecycle metadata', async () => {
    const transfer = {
      type: 'transfer',
      id: transferId,
      attributes: {
        type: 'deposit',
        amount: 50000,
        currency: 'USD',
        status: 'PROCESSING',
        description: 'Wallet top-up',
        externalAccountDisplayMask: '6789',
        expectedAvailableAt: null,
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

    const result = await depositFunds.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('deposit funds', 'post', '/transfers/deposit', {
      requiresAgentInstance: true,
      idempotencyKey: 'deposit-funds-1',
      body: {
        data: {
          attributes: {
            amount: 50000,
            currency: 'USD',
            externalAccountId,
            walletId,
            description: 'Wallet top-up'
          }
        }
      }
    });
    expect(depositFunds.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      transferId,
      transactionId,
      partyId,
      walletId,
      externalAccountId,
      type: 'transfer',
      transferType: 'deposit',
      status: 'PROCESSING',
      amount: 50000,
      currency: 'USD',
      description: 'Wallet top-up',
      externalAccountDisplayMask: '6789',
      expectedAvailableAt: null,
      failure: null,
      return: null,
      submittedAt: '2026-01-04T15:30:00Z',
      settledAt: null,
      createdAt: '2026-01-04T15:30:00Z',
      updatedAt: '2026-01-04T15:30:00Z',
      transfer
    });
    expect(result.message).toBe(`Initiated Natural deposit **${transferId}**.`);
  });
});
