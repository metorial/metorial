import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn()
}));

vi.mock('../lib/helpers', () => ({
  createClientFromContext: vi.fn(() => clientMocks)
}));

import { finagoUpsertCustomer } from './customers';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'token', baseUrl: 'https://rest.api.24sevenoffice.com/v1' },
    config: {}
  }) as any;

beforeEach(() => {
  clientMocks.post.mockReset();
  clientMocks.patch.mockReset();
  clientMocks.post.mockResolvedValue({ id: 1001, name: 'Acme AS', isCompany: true });
  clientMocks.patch.mockResolvedValue({ id: 1001, name: 'Updated Acme AS' });
});

describe('Finago upsert customer', () => {
  it('creates a company customer without person fields', async () => {
    await finagoUpsertCustomer.handleInvocation(
      createCtx({
        operation: 'create',
        isCompany: true,
        name: 'Acme AS',
        organizationNumber: '123456789',
        externalReference: 'crm-1',
        isSupplier: false,
        visitAddress: {
          street: 'Hovedgata 1',
          postalCode: '0123',
          postalArea: 'Fornebu',
          countrySubdivision: 'Viken',
          countryCode: 'NO'
        },
        emailContact: 'contact@example.com',
        phone: '+47-12345678'
      })
    );

    expect(clientMocks.post).toHaveBeenCalledWith(
      '/customers',
      {
        externalReference: 'crm-1',
        isSupplier: false,
        phone: '+47-12345678',
        isCompany: true,
        name: 'Acme AS',
        organizationNumber: '123456789',
        address: {
          visit: {
            street: 'Hovedgata 1',
            postalCode: '0123',
            postalArea: 'Fornebu',
            countrySubdivision: 'Viken',
            countryCode: 'NO'
          }
        },
        email: {
          contact: 'contact@example.com'
        }
      },
      undefined,
      'create customer'
    );
  });

  it('creates a person customer without company-only fields', async () => {
    await finagoUpsertCustomer.handleInvocation(
      createCtx({
        operation: 'create',
        isCompany: false,
        firstName: 'Jane',
        lastName: 'Doe',
        mobilePhone: '+47-98765432',
        additionalFields: {
          id: 321
        }
      })
    );

    expect(clientMocks.post).toHaveBeenCalledWith(
      '/customers',
      {
        mobilePhone: '+47-98765432',
        isCompany: false,
        person: {
          firstName: 'Jane',
          lastName: 'Doe'
        },
        id: 321
      },
      undefined,
      'create customer'
    );
  });

  it('rejects create payloads that mix company and person variants', async () => {
    await expect(
      finagoUpsertCustomer.handleInvocation(
        createCtx({
          operation: 'create',
          isCompany: true,
          name: 'Acme AS',
          firstName: 'Jane',
          lastName: 'Doe'
        })
      )
    ).rejects.toThrow(ServiceError);

    await expect(
      finagoUpsertCustomer.handleInvocation(
        createCtx({
          operation: 'create',
          isCompany: false,
          name: 'Jane Doe',
          firstName: 'Jane',
          lastName: 'Doe'
        })
      )
    ).rejects.toThrow(ServiceError);
  });

  it('requires both firstName and lastName for person customer creation', async () => {
    await expect(
      finagoUpsertCustomer.handleInvocation(
        createCtx({
          operation: 'create',
          isCompany: false,
          firstName: 'Jane'
        })
      )
    ).rejects.toThrow(ServiceError);
  });

  it('updates customers with documented patch fields and nullable clears', async () => {
    await finagoUpsertCustomer.handleInvocation(
      createCtx({
        operation: 'update',
        customerId: 1001,
        name: 'Updated Acme AS',
        externalReference: null,
        emailBilling: null,
        billingAddress: {
          name: 'Billing',
          street: 'Billinggata 2',
          countryCode: 'NO'
        }
      })
    );

    expect(clientMocks.patch).toHaveBeenCalledWith(
      '/customers/1001',
      {
        externalReference: null,
        name: 'Updated Acme AS',
        address: {
          billing: {
            name: 'Billing',
            street: 'Billinggata 2',
            countryCode: 'NO'
          }
        },
        email: {
          billing: null
        }
      },
      undefined,
      'update customer'
    );
  });

  it('rejects isCompany updates because Finago PATCH does not support changing customer type', async () => {
    await expect(
      finagoUpsertCustomer.handleInvocation(
        createCtx({
          operation: 'update',
          customerId: 1001,
          isCompany: false,
          name: 'Jane Doe'
        })
      )
    ).rejects.toThrow(ServiceError);
  });
});
