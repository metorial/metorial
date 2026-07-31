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
});
