import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { manageContact } from './tools/manage-contact';
import { manageEstimate } from './tools/manage-estimate';

let rejectedError = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    error => error
  );

let context = {
  auth: { token: 'test-token', apiDomain: 'https://www.zohoapis.com' },
  config: { organizationId: 'test-org' }
};

describe('Zoho Invoice tool validation errors', () => {
  it('returns ServiceError when a new contact has no contactName', async () => {
    let error = await rejectedError(
      manageContact.handleInvocation({ ...context, input: {} } as never)
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect((error as Error).message).toContain(
      'contactName is required when creating a new contact'
    );
  });

  it('returns ServiceError when a new estimate has no customerId', async () => {
    let error = await rejectedError(
      manageEstimate.handleInvocation({ ...context, input: {} } as never)
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect((error as Error).message).toContain(
      'customerId is required when creating a new estimate'
    );
  });
});
