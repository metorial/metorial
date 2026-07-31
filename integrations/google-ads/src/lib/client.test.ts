import { beforeEach, describe, expect, it, vi } from 'vitest';

let { createAxiosMock, getMock } = vi.hoisted(() => ({
  createAxiosMock: vi.fn(),
  getMock: vi.fn()
}));

vi.mock('slates', () => ({
  createAxios: createAxiosMock
}));

import { GoogleAdsClient } from './client';

describe('GoogleAdsClient API version', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAxiosMock.mockReturnValue({
      get: getMock
    });
  });

  it('lists accessible customers through the supported v24 endpoint', async () => {
    getMock.mockResolvedValue({
      data: { resourceNames: ['customers/1234567890'] }
    });

    let client = new GoogleAdsClient({
      token: 'access-token',
      developerToken: 'developer-token',
      loginCustomerId: '123-456-7890'
    });

    await expect(client.listAccessibleCustomers()).resolves.toEqual(['customers/1234567890']);
    expect(createAxiosMock).toHaveBeenCalledWith({
      baseURL: 'https://googleads.googleapis.com/v24',
      headers: {
        Authorization: 'Bearer access-token',
        'developer-token': 'developer-token',
        'Content-Type': 'application/json',
        'login-customer-id': '1234567890'
      }
    });
    expect(getMock).toHaveBeenCalledWith('/customers:listAccessibleCustomers');
  });
});
