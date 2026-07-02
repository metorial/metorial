import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  api: {
    get: vi.fn()
  },
  createAuthenticatedAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAuthenticatedAxios: axiosMocks.createAuthenticatedAxios
  };
});

import { BusinessCentralClient } from './client';

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReturnValue(axiosMocks.api);
});

describe('BusinessCentralClient retry behavior', () => {
  it('retries documented gateway timeout responses for OData list requests', async () => {
    axiosMocks.api.get
      .mockRejectedValueOnce({
        response: {
          status: 504,
          headers: {
            'Retry-After': '0'
          },
          data: {
            error: {
              code: 'GatewayTimeout',
              message: 'Gateway Timeout'
            }
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          value: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              name: 'CRONUS'
            }
          ]
        }
      });

    let client = new BusinessCentralClient({ token: 'token' });
    let result = await client.getList('list companies', '/companies', { $top: 1 });

    expect(result.value).toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'CRONUS'
      }
    ]);
    expect(axiosMocks.api.get).toHaveBeenCalledTimes(2);
    expect(axiosMocks.api.get).toHaveBeenNthCalledWith(1, '/companies', {
      params: { $top: 1 }
    });
  });
});
