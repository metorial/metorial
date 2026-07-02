import { ServiceError } from '@lowerdeck/error';
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

import { getVendor, listCustomers, listVendors } from './contacts';

let invokeListCustomers = (input: Record<string, unknown>) =>
  listCustomers.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

let invokeListVendors = (input: Record<string, unknown>) =>
  listVendors.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

let invokeGetVendor = (input: Record<string, unknown>) =>
  getVendor.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReturnValue(axiosMocks.api);
});

describe('Business Central list customers', () => {
  it('uses the Business Central environment stored by auth', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: []
      }
    });

    await listCustomers.handleInvocation({
      auth: {
        businessCentralToken: 'token',
        businessCentralTenantId: 'tenant-123',
        businessCentralEnvironmentName: 'sandbox'
      },
      config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
      input: { limit: 5 }
    } as any);

    expect(axiosMocks.createAuthenticatedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.businesscentral.dynamics.com/v2.0/tenant-123/sandbox/api/v2.0'
      })
    );
  });

  it('uses schema version 2.1 for nested search filters', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: []
      }
    });

    await invokeListCustomers({
      search: '  Adatum  ',
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/customers',
      {
        params: {
          $top: 5,
          $skip: 0,
          $filter:
            "(contains(tolower(displayName),'adatum') or contains(tolower(number),'adatum') or contains(tolower(email),'adatum') or contains(tolower(phoneNumber),'adatum'))",
          $schemaversion: '2.1'
        }
      }
    );
  });

  it('does not request schema version 2.1 without a search filter', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: []
      }
    });

    await invokeListCustomers({
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/customers',
      {
        params: {
          $top: 5,
          $skip: 0
        }
      }
    );
  });
});

describe('Business Central list vendors', () => {
  it('uses documented displayName search with schema version 2.1', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [
          {
            id: '22222222-2222-2222-2222-222222222222',
            number: 'V10000',
            displayName: 'Wide World Importers',
            irs1099Code: 'MISC',
            paymentMethodId: '33333333-3333-3333-3333-333333333333',
            taxLiable: true
          }
        ]
      }
    });

    let result = await invokeListVendors({
      search: '  Wide  ',
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/vendors',
      {
        params: {
          $top: 5,
          $skip: 0,
          $filter: "(contains(tolower(displayName),'wide'))",
          $schemaversion: '2.1'
        }
      }
    );
    expect(result.output.vendors[0]).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      number: 'V10000',
      displayName: 'Wide World Importers',
      irs1099Code: 'MISC',
      paymentMethodId: '33333333-3333-3333-3333-333333333333',
      taxLiable: true
    });
  });

  it('rejects vendor blocked filters outside documented values', async () => {
    await expect(invokeListVendors({ blocked: 'Invoice' })).rejects.toBeInstanceOf(
      ServiceError
    );
    await expect(invokeListVendors({ blocked: 'Invoice' })).rejects.toThrow(
      'Business Central vendor blocked filter must be one of'
    );
    expect(axiosMocks.api.get).not.toHaveBeenCalled();
  });
});

describe('Business Central get vendor', () => {
  it('uses the documented vendor entity path and maps vendor-specific fields', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        number: 'V10000',
        displayName: 'Wide World Importers',
        irs1099Code: 'MISC',
        paymentMethodId: '33333333-3333-3333-3333-333333333333',
        taxLiable: true
      }
    });

    let result = await invokeGetVendor({
      vendorId: '22222222-2222-2222-2222-222222222222'
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/vendors(22222222-2222-2222-2222-222222222222)',
      { params: undefined }
    );
    expect(result.output).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      number: 'V10000',
      displayName: 'Wide World Importers',
      irs1099Code: 'MISC',
      paymentMethodId: '33333333-3333-3333-3333-333333333333',
      taxLiable: true
    });
  });
});
