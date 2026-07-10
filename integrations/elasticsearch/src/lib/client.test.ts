import type { SlateAxiosErrorOptions } from 'slates';
import { SlateError } from 'slates';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ElasticsearchClient } from './client';

let state = vi.hoisted(() => ({
  rejectionHandlers: [] as Array<(error: unknown) => unknown>,
  nextError: undefined as unknown,
  errorMapping: undefined as unknown
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  let request = async () => {
    let error = state.nextError;

    // Mirror the shared slates response interceptor, which converts axios
    // failures into SlateErrors using the instance's errorMapping.
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { isAxiosError?: unknown }).isAxiosError === true
    ) {
      error = actual.SlateError.fromAxios(
        error,
        state.errorMapping as SlateAxiosErrorOptions | undefined
      );
    }

    for (let handler of state.rejectionHandlers) {
      try {
        return await handler(error);
      } catch (chainedError) {
        error = chainedError;
      }
    }

    throw error;
  };

  return {
    ...actual,
    createAxios: (config?: Record<string, unknown>) => {
      state.errorMapping = config?.errorMapping;

      return {
        interceptors: {
          response: {
            use: (_onFulfilled: unknown, onRejected: (error: unknown) => unknown) => {
              state.rejectionHandlers.push(onRejected);
            }
          }
        },
        head: request,
        get: request,
        post: request
      };
    }
  };
});

let createClient = () =>
  new ElasticsearchClient({
    baseUrl: 'https://example.test',
    authHeader: 'ApiKey test-key'
  });

let axiosError = (status: number, statusText: string, data: unknown) => {
  let error = new Error(`Request failed with status code ${status}`);
  Object.assign(error, {
    isAxiosError: true,
    config: { method: 'post', url: '/logs/_search', baseURL: 'https://example.test' },
    response: { status, statusText, data, headers: {} }
  });
  return error;
};

beforeEach(() => {
  state.rejectionHandlers.length = 0;
  state.nextError = undefined;
  state.errorMapping = undefined;
});

describe('ElasticsearchClient.indexExists', () => {
  it('returns false when the shared HTTP client reports a 404 Slate error', async () => {
    state.nextError = new SlateError({
      code: 'resource.not_found',
      message: 'no such index',
      status: 404,
      upstream: {
        status: 404,
        code: 'index_not_found_exception'
      }
    });

    await expect(createClient().indexExists('missing-index')).resolves.toBe(false);
  });

  it('rethrows non-404 Slate errors unchanged', async () => {
    let error = new SlateError({
      code: 'upstream.error',
      message: 'shard failure',
      status: 502,
      upstream: {
        status: 502
      }
    });
    state.nextError = error;

    await expect(createClient().indexExists('logs')).rejects.toBe(error);
  });

  it('returns false for legacy 404 errors carried on mapped ServiceError data', async () => {
    let error = new Error('Request failed');
    Object.assign(error, {
      response: {
        status: 404,
        statusText: 'Not Found',
        data: {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index'
          },
          status: 404
        }
      }
    });
    state.nextError = error;

    await expect(createClient().indexExists('missing-index')).resolves.toBe(false);
  });
});

describe('ElasticsearchClient error message mapping', () => {
  it('surfaces the Elasticsearch reason in mapped Slate error messages', async () => {
    state.nextError = axiosError(400, 'Bad Request', {
      error: {
        type: 'query_shard_exception',
        reason: 'No mapping found for [missing_field] in order to sort on'
      },
      status: 400
    });

    let error: unknown = await createClient()
      .search('logs', { query: { match_all: {} } })
      .catch(caught => caught);

    expect(SlateError.is(error)).toBe(true);
    let slateError = error as SlateError;
    expect(slateError.message).toContain(
      'No mapping found for [missing_field] in order to sort on'
    );
    expect(slateError.status).toBe(400);
    expect(slateError.data.upstream?.code).toBe('query_shard_exception');
    expect(slateError.data.baggage?.response).toMatchObject({
      error: {
        reason: 'No mapping found for [missing_field] in order to sort on'
      }
    });
  });

  it('falls back to root_cause and caused_by reasons when the top-level reason is missing', async () => {
    state.nextError = axiosError(400, 'Bad Request', {
      error: {
        type: 'search_phase_execution_exception',
        root_cause: [
          {
            type: 'illegal_argument_exception',
            reason: 'Text fields are not optimised for aggregations'
          }
        ],
        caused_by: {
          type: 'illegal_argument_exception',
          reason: 'Fielddata is disabled on [message]'
        }
      },
      status: 400
    });

    let error: unknown = await createClient()
      .search('logs', { aggs: {} })
      .catch(caught => caught);

    expect(SlateError.is(error)).toBe(true);
    let slateError = error as SlateError;
    expect(slateError.message).toContain('Text fields are not optimised for aggregations');
    expect(slateError.message).toContain('Fielddata is disabled on [message]');
    expect(slateError.status).toBe(400);
  });

  it('degrades to a generic status message for non-JSON error bodies', async () => {
    state.nextError = axiosError(
      502,
      'Bad Gateway',
      '<html><body><h1>502 Bad Gateway</h1></body></html>'
    );

    let error: unknown = await createClient()
      .search('logs', { query: { match_all: {} } })
      .catch(caught => caught);

    expect(SlateError.is(error)).toBe(true);
    let slateError = error as SlateError;
    expect(slateError.message).toBe('Bad Gateway');
    expect(slateError.message).not.toContain('<html');
    expect(slateError.status).toBe(502);
  });
});
