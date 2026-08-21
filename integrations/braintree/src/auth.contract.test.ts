import { createLocalSlateTestClient, getSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('Braintree auth ownership', () => {
  it('persists the environment and credentials together in auth output', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let result = await client.getAuthOutput({
      authenticationMethodId: 'api_keys',
      input: {
        environment: 'sandbox',
        merchantId: 'merchant-id',
        publicKey: 'public-key',
        privateKey: 'private-key'
      }
    });

    expect(result.output).toEqual({
      environment: 'sandbox',
      merchantId: 'merchant-id',
      publicKey: 'public-key',
      privateKey: 'private-key',
      token: btoa('public-key:private-key')
    });

    let config = await client.getConfigSchema();
    expect(config.schema.properties).toEqual({});

    let contract = await getSlateContract(client);
    let trigger = contract.triggers.find(action => action.id === 'webhook_events');
    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        ingress: {
          verification: {
            allowedSecretRefs: [
              { source: 'auth_config', credentialKey: 'environment' },
              { source: 'auth_config', credentialKey: 'merchantId' },
              { source: 'auth_config', credentialKey: 'publicKey' },
              { source: 'auth_config', credentialKey: 'privateKey' }
            ]
          }
        }
      }
    });
  });
});
