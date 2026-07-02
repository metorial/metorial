import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { finagoListCustomers } from './tools/customers';

let invokeListCustomers = (input: unknown) =>
  finagoListCustomers.handleInvocation({
    input,
    auth: { token: 'token' },
    config: {}
  } as any);

describe('Finago list customers validation', () => {
  it('rejects sortBy values outside the documented Customer SortInput pattern', async () => {
    await expect(invokeListCustomers({ sortBy: 'phone:asc' })).rejects.toBeInstanceOf(
      ServiceError
    );

    await expect(invokeListCustomers({ sortBy: 'phone:asc' })).rejects.toThrow(
      'sortBy must be one of'
    );
  });

  it('rejects list-only parameters when reading a customer by ID', async () => {
    await expect(
      invokeListCustomers({
        customerId: 123,
        limit: 10,
        maxPages: 1
      })
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(
      invokeListCustomers({
        customerId: 123,
        sortBy: 'id:asc'
      })
    ).rejects.toThrow('Do not provide sortBy');
  });
});
