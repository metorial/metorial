import { createLocalSlateTestClient } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('GoSquared auth ownership', () => {
  it('persists the project token with the API key instead of config', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let result = await client.getAuthOutput({
      authenticationMethodId: 'api_key',
      input: { apiKey: 'api-key', siteToken: 'GSN-123456-A' }
    });

    expect(result.output).toEqual({ token: 'api-key', siteToken: 'GSN-123456-A' });

    let config = await client.getConfigSchema();
    expect(config.schema.properties).toEqual({});
  });
});
