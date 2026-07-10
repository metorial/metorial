import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import type { SlateAxiosErrorOptions } from 'slates';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provider } from './index';

let state = vi.hoisted(() => ({
  nextError: undefined as unknown,
  errorMapping: undefined as unknown
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  let request = async () => {
    if (state.nextError === undefined) {
      return { data: {} };
    }

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

    throw error;
  };

  return {
    ...actual,
    createAxios: (config?: Record<string, unknown>) => {
      state.errorMapping = config?.errorMapping;

      return {
        interceptors: {
          response: {
            use: () => {}
          }
        },
        get: request
      };
    }
  };
});

let createClient = () => createLocalSlateTestClient({ slate: provider });

let axiosError = (status: number, statusText: string, data: unknown) => {
  let error = new Error(`Request failed with status code ${status}`);
  Object.assign(error, {
    isAxiosError: true,
    config: { method: 'get', url: '/', baseURL: 'https://example.test:9243' },
    response: { status, statusText, data, headers: {} }
  });
  return error;
};

beforeEach(() => {
  state.nextError = undefined;
  state.errorMapping = undefined;
});

describe('elasticsearch auth contract', () => {
  it('returns the normalized auth output when credentials validate', async () => {
    let result = await createClient().getAuthOutput({
      authenticationMethodId: 'api_key',
      input: {
        elasticsearchUrl: 'https://example.test:9243/',
        token: 'encoded-key'
      }
    });

    expect(result.output).toMatchObject({
      baseUrl: 'https://example.test:9243',
      authHeader: 'ApiKey encoded-key'
    });
  });

  it('surfaces the Elasticsearch security reason when basic authentication fails', async () => {
    state.nextError = axiosError(401, 'Unauthorized', {
      error: {
        root_cause: [
          {
            type: 'security_exception',
            reason: 'unable to authenticate user [elastic] for REST request [/]'
          }
        ],
        type: 'security_exception',
        reason: 'unable to authenticate user [elastic] for REST request [/]'
      },
      status: 401
    });

    let error = await expectSlateError(
      () =>
        createClient().getAuthOutput({
          authenticationMethodId: 'basic_auth',
          input: {
            elasticsearchUrl: 'https://example.test:9243',
            username: 'elastic',
            password: 'wrong-password'
          }
        }),
      {
        code: 'auth.invalid',
        status: 401
      }
    );

    let data = (error as { data: { message: string; upstream?: { code?: string } } }).data;
    expect(data.message).toContain('unable to authenticate user [elastic]');
    expect(data.upstream?.code).toBe('security_exception');
  });

  it('surfaces the Elasticsearch security reason when an API key lacks permissions', async () => {
    state.nextError = axiosError(403, 'Forbidden', {
      error: {
        root_cause: [
          {
            type: 'security_exception',
            reason: 'action [cluster:monitor/main] is unauthorized for API key'
          }
        ],
        type: 'security_exception',
        reason: 'action [cluster:monitor/main] is unauthorized for API key'
      },
      status: 403
    });

    let error = await expectSlateError(
      () =>
        createClient().getAuthOutput({
          authenticationMethodId: 'api_key',
          input: {
            elasticsearchUrl: 'https://example.test:9243',
            token: 'restricted-key'
          }
        }),
      {
        code: 'permission.denied',
        status: 403
      }
    );

    let data = (error as { data: { message: string } }).data;
    expect(data.message).toContain(
      'action [cluster:monitor/main] is unauthorized for API key'
    );
  });
});
