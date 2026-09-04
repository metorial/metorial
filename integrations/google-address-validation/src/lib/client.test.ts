import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  http: { post: vi.fn() },
  createAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return { ...actual, createAxios: mocks.createAxios };
});

import { Client } from './client';

beforeEach(() => {
  mocks.http.post.mockReset();
  mocks.createAxios.mockReset();
  mocks.createAxios.mockReturnValue(mocks.http);
});

describe('Google Address Validation client auth', () => {
  it('uses bearer auth and the configured quota project for OAuth', async () => {
    mocks.http.post.mockResolvedValue({
      data: { result: { verdict: {}, address: {} }, responseId: 'response-1' }
    });

    let client = new Client({
      token: 'oauth-token',
      authMethod: 'oauth',
      projectId: 'billing-project'
    });
    await client.validateAddress({ address: { addressLines: ['1600 Amphitheatre Pkwy'] } });

    expect(mocks.createAxios).toHaveBeenCalledWith({
      baseURL: 'https://addressvalidation.googleapis.com/v1',
      headers: {
        Authorization: 'Bearer oauth-token',
        'Content-Type': 'application/json',
        'X-Goog-User-Project': 'billing-project'
      }
    });
  });

  it('keeps API-key authentication query-based without a quota-project header', async () => {
    mocks.http.post.mockResolvedValue({
      data: { result: { verdict: {}, address: {} }, responseId: 'response-1' }
    });

    let client = new Client({ token: 'maps-key', authMethod: 'api_key' });
    await client.validateAddress({ address: { addressLines: ['1600 Amphitheatre Pkwy'] } });

    expect(mocks.createAxios).toHaveBeenCalledWith({
      baseURL: 'https://addressvalidation.googleapis.com/v1',
      params: { key: 'maps-key' },
      headers: { 'Content-Type': 'application/json' }
    });
  });

  it('rejects OAuth locally when the quota project is missing', () => {
    let error: unknown;
    try {
      new Client({ token: 'oauth-token', authMethod: 'oauth' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      data: { reason: 'google_address_validation_quota_project_missing' }
    });
    expect(mocks.createAxios).not.toHaveBeenCalled();
  });
});
