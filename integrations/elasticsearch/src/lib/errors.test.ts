import { ServiceError } from '@lowerdeck/error';
import { SlateError } from 'slates';
import { describe, expect, it } from 'vitest';
import { elasticsearchApiError } from './errors';

describe('elasticsearchApiError', () => {
  it('preserves structured Slate errors from the shared HTTP client', () => {
    let error = new SlateError({
      code: 'resource.not_found',
      message: 'no such index',
      kind: 'resource',
      retryable: false,
      status: 404,
      provider: {
        key: 'elasticsearch'
      },
      upstream: {
        status: 404,
        code: 'index_not_found_exception',
        type: 'index_not_found_exception',
        method: 'POST',
        url: 'https://example.test/logs-*/_search'
      },
      baggage: {
        response: {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index'
          },
          status: 404
        }
      }
    });

    let mapped = elasticsearchApiError(error, 'search documents');

    expect(mapped).toBe(error);
    expect(mapped.toResponse()).toMatchObject({
      code: 'resource.not_found',
      status: 404,
      retryable: false,
      upstream: {
        status: 404,
        code: 'index_not_found_exception',
        method: 'POST'
      },
      baggage: {
        response: {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index'
          }
        }
      }
    });
  });

  it('maps raw API failures to Elasticsearch ServiceErrors', () => {
    let error = new Error('Request failed');
    Object.assign(error, {
      response: {
        status: 400,
        statusText: 'Bad Request',
        data: {
          error: {
            type: 'query_shard_exception',
            reason: 'No mapping found for sort field'
          },
          status: 400
        }
      }
    });

    let mapped = elasticsearchApiError(error, 'search documents');

    expect(mapped).toBeInstanceOf(ServiceError);
    expect(mapped.data).toMatchObject({
      reason: 'elasticsearch_api_error',
      upstreamStatus: 400,
      upstreamCode: 'query_shard_exception'
    });
    expect(mapped.data.message).toContain('No mapping found for sort field');
  });
});
