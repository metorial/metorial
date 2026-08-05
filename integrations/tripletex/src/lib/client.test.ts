import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  authenticatedHttp: {
    put: vi.fn()
  },
  createAuthenticatedAxios: vi.fn(),
  createAxios: vi.fn(),
  sessionHttp: {
    post: vi.fn()
  }
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAuthenticatedAxios: axiosMocks.createAuthenticatedAxios,
    createAxios: axiosMocks.createAxios
  };
});

import { TRIPLETEX_BASE_URLS, TripletexClient } from './client';

beforeEach(() => {
  vi.clearAllMocks();
  axiosMocks.createAxios.mockReturnValue(axiosMocks.sessionHttp);
  axiosMocks.createAuthenticatedAxios.mockReturnValue(axiosMocks.authenticatedHttp);
  axiosMocks.sessionHttp.post.mockResolvedValue({
    data: { value: { token: 'session-token' } }
  });
  axiosMocks.authenticatedHttp.put.mockResolvedValue({ data: {} });
});

describe('TripletexClient actions', () => {
  it('sends update actions without a request body', async () => {
    let client = new TripletexClient({
      authMethod: 'consumer_employee_token',
      environment: 'test',
      baseUrl: TRIPLETEX_BASE_URLS.test,
      consumerToken: 'consumer-token',
      employeeToken: 'employee-token'
    });
    let params = {
      sendType: 'MANUAL',
      overrideEmailAddress: undefined
    };

    await client.updateAction('/invoice/123/:send', params, '0');

    expect(axiosMocks.authenticatedHttp.put).toHaveBeenCalledWith(
      '/invoice/123/:send',
      undefined,
      { params }
    );
  });
});
