import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { describe, it } from 'vitest';
import { provider } from '../../index';

let createClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'commerce_access_token',
        output: {
          commerceToken: 'test-token',
          retailServerUrl: 'https://scaleunit.example.com/RetailServer'
        }
      }
    }
  });

describe('manage_customers', () => {
  it('rejects empty customer updates before calling Retail Server', async () => {
    let client = createClient();

    await expectSlateError(
      () =>
        client.invokeTool('commerce_manage_customers', {
          action: 'update',
          accountNumber: 'C-100',
          confirmWrite: true,
          customer: {}
        }),
      'customer or additionalFields must include at least one field'
    );

    await expectSlateError(
      () =>
        client.invokeTool('commerce_manage_customers', {
          action: 'update',
          accountNumber: 'C-100',
          confirmWrite: true,
          additionalFields: {}
        }),
      'customer or additionalFields must include at least one field'
    );
  });
});
