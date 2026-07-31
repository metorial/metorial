import { createLocalSlateTestClient } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('Item API key auth contract', () => {
  it('trims a non-empty API key without requiring a key prefix', async () => {
    let client = createLocalSlateTestClient({ slate: provider });

    let result = await client.getAuthOutput({
      authenticationMethodId: 'api_key',
      input: { apiKey: '  arbitrary-key-format  ' }
    });

    expect(result.output).toEqual({ token: 'arbitrary-key-format' });
  });

  it('rejects an API key containing only whitespace', async () => {
    let client = createLocalSlateTestClient({ slate: provider });

    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'api_key',
        input: { apiKey: '   ' }
      })
    ).rejects.toThrow();
  });

  it('publishes a profile capability so an unusable key fails at connect time', async () => {
    let client = createLocalSlateTestClient({ slate: provider });

    let result = await client.getAuthMethod('api_key');

    expect(result.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
  });

  it('links the API key documentation on the auth method', async () => {
    let client = createLocalSlateTestClient({ slate: provider });

    let result = await client.getAuthMethod('api_key');

    expect(result.authenticationMethod.docs).toEqual([
      expect.objectContaining({
        type: 'docs.auth.token',
        url: 'https://docs.item.app/index#authentication'
      })
    ]);
  });
});
