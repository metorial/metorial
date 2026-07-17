import { ServiceError } from '@lowerdeck/error';
import { SlateError } from 'slates';
import { describe, expect, it } from 'vitest';
import { naturalApiError, naturalAxiosErrorMapping } from './errors';

const rawNaturalError = (
  status: number,
  errors: unknown[],
  headers: Record<string, string> = {}
) => ({
  response: {
    status,
    statusText: status === 401 ? 'Unauthorized' : undefined,
    headers,
    data: { errors }
  }
});

describe('naturalApiError', () => {
  it('captures Natural details before Axios normalization discards response headers', () => {
    const mapped = naturalAxiosErrorMapping.mapAxiosError?.(
      {
        response: {
          data: {
            errors: [
              {
                status: '429',
                code: 'rate_limited',
                detail: 'Slow down',
                meta: { supportId: 'support_mapping', provider: 'stripe' }
              }
            ]
          },
          headers: {
            'x-request-id': 'req_mapping',
            'retry-after': '15'
          }
        }
      } as never,
      {
        code: 'upstream.rate_limited',
        message: 'Slow down',
        kind: 'upstream',
        retryable: true,
        status: 429,
        upstream: { status: 429 }
      }
    );

    expect(mapped).toMatchObject({
      issues: [
        {
          status: '429',
          code: 'rate_limited',
          detail: 'Slow down',
          meta: { supportId: 'support_mapping', provider: 'stripe' }
        }
      ],
      upstream: {
        status: 429,
        code: 'rate_limited',
        requestId: 'req_mapping'
      },
      baggage: {
        natural: {
          supportId: 'support_mapping',
          requestId: 'req_mapping',
          providerIdentifiers: { provider: 'stripe' },
          rateLimit: { retryAfter: '15' }
        }
      }
    });
  });

  it.each([
    [401, 'invalid_api_key'],
    [422, 'invalid_request'],
    [429, 'rate_limited'],
    [500, 'internal_error']
  ])('preserves Natural status and code for an HTTP %i response', (status, code) => {
    const error = naturalApiError(
      rawNaturalError(status, [{ status: String(status), code, detail: `Failure ${status}` }]),
      'test operation'
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.reason).toBe('natural_api_error');
    expect(error.data.upstreamStatus).toBe(status);
    expect(error.data.upstreamCode).toBe(code);
    expect(error.data.message).toContain(`Natural API test operation failed: HTTP ${status}`);
    expect(error.data.message).toContain(`Failure ${status}`);
  });

  it('preserves JSON:API issues and Natural diagnostic metadata', () => {
    const source = { pointer: '/data/attributes/amount' };
    const meta = {
      supportId: 'support_123',
      connectionStatus: 'action_required',
      provider: 'plaid',
      providerId: 'provider_123'
    };
    const error = naturalApiError(
      rawNaturalError(
        422,
        [
          {
            status: '422',
            code: 'invalid_amount',
            detail: 'Amount is invalid',
            source,
            meta
          }
        ],
        { 'x-request-id': 'req_123' }
      )
    );

    expect(error.data.errors).toEqual([
      {
        message: 'Amount is invalid',
        detail: 'Amount is invalid',
        code: 'invalid_amount',
        status: '422',
        source,
        meta
      }
    ]);
    expect(error.data.issues).toEqual(error.data.errors);
    expect(error.data.supportId).toBe('support_123');
    expect(error.data.requestId).toBe('req_123');
    expect(error.data.connectionStatus).toBe('action_required');
    expect(error.data.providerIdentifiers).toEqual({
      provider: 'plaid',
      providerId: 'provider_123'
    });
  });

  it('preserves retry and rate-limit headers', () => {
    const error = naturalApiError(
      rawNaturalError(429, [{ code: 'rate_limited', detail: 'Slow down' }], {
        'retry-after': '30',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1720000000'
      })
    );

    expect(error.data.rateLimit).toEqual({
      retryAfter: '30',
      limit: '100',
      remaining: '0',
      reset: '1720000000'
    });
    expect(error.data.retryable).toBe(true);
  });

  it('recovers Natural details from an already-normalized SlateError', () => {
    const issue = {
      message: 'Connection needs attention',
      detail: 'Connection needs attention',
      code: 'provider_connection_error',
      status: '422',
      source: { pointer: '/data/relationships/provider' },
      meta: {
        supportId: 'support_normalized',
        connectionStatus: 'disconnected',
        provider: 'stripe',
        providerConnectionId: 'connection_123'
      }
    };
    const normalized = new SlateError({
      code: 'upstream.invalid_request',
      message: 'Connection needs attention',
      status: 422,
      retryable: false,
      issues: [issue],
      provider: { key: 'natural', service: 'natural' },
      upstream: {
        status: 422,
        code: 'provider_connection_error',
        requestId: 'req_normalized'
      },
      baggage: {
        response: { errors: [issue] },
        natural: {
          supportId: 'support_normalized',
          requestId: 'req_normalized',
          connectionStatus: 'disconnected',
          providerIdentifiers: {
            provider: 'stripe',
            providerConnectionId: 'connection_123'
          },
          rateLimit: { retryAfter: '5' }
        }
      }
    });

    const mapped = naturalApiError(normalized, 'create payment');

    expect(mapped.data.upstreamStatus).toBe(422);
    expect(mapped.data.upstreamCode).toBe('provider_connection_error');
    expect(mapped.data.errors).toEqual([issue]);
    expect(mapped.data.supportId).toBe('support_normalized');
    expect(mapped.data.requestId).toBe('req_normalized');
    expect(mapped.data.connectionStatus).toBe('disconnected');
    expect(mapped.data.providerIdentifiers).toEqual({
      provider: 'stripe',
      providerConnectionId: 'connection_123'
    });
    expect(mapped.data.rateLimit).toEqual({ retryAfter: '5' });
    expect(mapped.data.retryable).toBe(false);
  });

  it('does not wrap a mapped ServiceError again', () => {
    const mapped = naturalApiError(
      rawNaturalError(401, [{ code: 'invalid_api_key', detail: 'Invalid key' }])
    );

    expect(naturalApiError(mapped, 'second adapter pass')).toBe(mapped);
  });
});
