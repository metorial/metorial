import { beforeEach, describe, expect, it, vi } from 'vitest';

let { http, createAxiosMock } = vi.hoisted(() => {
  let http = {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn()
      }
    }
  };
  return { http, createAxiosMock: vi.fn(() => http) };
});

vi.mock('slates', () => ({
  buildApiServiceError: (error: unknown, options: unknown) => ({ error, options }),
  createApiServiceError: (message: string, data: unknown) => ({ message, data }),
  createAxios: createAxiosMock
}));

import {
  LAUNCHDARKLY_API_BASE_URLS,
  LAUNCHDARKLY_API_VERSION,
  LaunchDarklyClient
} from './client';

describe('LaunchDarkly client request contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pins the current stable API version and honors the authenticated region', () => {
    new LaunchDarklyClient('api-token', LAUNCHDARKLY_API_BASE_URLS.eu);

    expect(createAxiosMock).toHaveBeenCalledWith({
      baseURL: 'https://app.eu.launchdarkly.com/api/v2',
      headers: {
        Authorization: 'api-token',
        'Content-Type': 'application/json',
        'LD-API-Version': LAUNCHDARKLY_API_VERSION
      }
    });
    expect(http.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  it('sends feature flag clone as a query parameter', async () => {
    http.post.mockResolvedValueOnce({ data: { key: 'new-flag' } });
    let client = new LaunchDarklyClient('api-token');

    await client.createFeatureFlag(
      'project-key',
      { key: 'new-flag', name: 'New flag' },
      { clone: 'source-flag' }
    );

    expect(http.post).toHaveBeenCalledWith(
      '/flags/project-key',
      { key: 'new-flag', name: 'New flag' },
      { params: { clone: 'source-flag' } }
    );
  });

  it('puts the environment at the semantic patch body root for flags', async () => {
    http.patch.mockResolvedValueOnce({ data: { key: 'checkout' } });
    let client = new LaunchDarklyClient('api-token');
    let instructions = [{ kind: 'turnFlagOn' }];

    await client.updateFeatureFlag('project-key', 'checkout', instructions, {
      environmentKey: 'production',
      comment: 'Enable checkout'
    });

    expect(http.patch).toHaveBeenCalledWith(
      '/flags/project-key/checkout',
      {
        environmentKey: 'production',
        comment: 'Enable checkout',
        instructions
      },
      {
        headers: {
          'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch'
        }
      }
    );
  });

  it('puts the environment at the semantic patch body root for segments', async () => {
    http.patch.mockResolvedValueOnce({ data: { key: 'beta-users' } });
    let client = new LaunchDarklyClient('api-token');
    let instructions = [{ kind: 'addIncludedTargets', values: ['user-1'] }];

    await client.updateSegment('project-key', 'production', 'beta-users', instructions, {
      comment: 'Add beta user'
    });

    expect(http.patch).toHaveBeenCalledWith(
      '/segments/project-key/production/beta-users',
      {
        environmentKey: 'production',
        comment: 'Add beta user',
        instructions
      },
      {
        headers: {
          'Content-Type': 'application/json; domain-model=launchdarkly.semanticpatch'
        }
      }
    );
  });

  it('uses the documented caller identity endpoint', async () => {
    http.get.mockResolvedValueOnce({ data: { accountId: 'account-1' } });
    let client = new LaunchDarklyClient('api-token');

    await client.getCallerIdentity();

    expect(http.get).toHaveBeenCalledWith('/caller-identity');
  });
});
