import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { buildApiServiceError, collectApiErrorDetails, createApiServiceError } from './api';

describe('API service error helpers', () => {
  it('collects unique nested API error details', () => {
    let details: string[] = [];

    collectApiErrorDetails(
      {
        message: 'Invalid request',
        code: 'bad_request',
        errors: [
          {
            detail: 'Missing name'
          },
          'Missing name'
        ]
      },
      details
    );

    expect(details).toEqual(['Invalid request', 'bad_request', 'Missing name']);
  });

  it('builds provider API ServiceErrors with upstream metadata', () => {
    let parent = new Error('Request failed');
    (parent as any).response = {
      status: 429,
      statusText: 'Too Many Requests',
      data: {
        title: 'Rate limit',
        details: [{ message: 'Retry later' }]
      }
    };

    let error = buildApiServiceError(parent, {
      providerLabel: 'Example',
      operation: 'list widgets',
      reason: 'example_api_error',
      detailKeys: ['title', 'message'],
      nestedKeys: ['details'],
      extractUpstreamCode: () => 'RATE_LIMITED'
    });

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toBe(
      'Example API list widgets failed: HTTP 429 Too Many Requests: Rate limit - Retry later'
    );
    expect(error.data.reason).toBe('example_api_error');
    expect(error.data.upstreamStatus).toBe(429);
    expect(error.data.upstreamCode).toBe('RATE_LIMITED');
  });

  it('allows provider-specific status and message extraction', () => {
    let error = buildApiServiceError(
      {
        status: 503,
        data: {
          message: 'Unavailable'
        }
      },
      {
        providerLabel: 'Example',
        reason: 'example_api_error',
        extractStatus: (input, _response, helpers) =>
          helpers.isRecord(input) && typeof input.status === 'number'
            ? input.status
            : undefined,
        extractMessage: (input, helpers) => {
          if (!helpers.isRecord(input) || !helpers.isRecord(input.data)) return undefined;
          return typeof input.data.message === 'string' ? input.data.message : undefined;
        }
      }
    );

    expect(error.data.message).toBe('Example API request failed: HTTP 503: Unavailable');
    expect(error.data.upstreamStatus).toBe(503);
  });

  it('passes through existing ServiceErrors', () => {
    let existing = createApiServiceError('Already normalized');

    expect(
      buildApiServiceError(existing, {
        providerLabel: 'Example',
        reason: 'example_api_error'
      })
    ).toBe(existing);
  });
});
