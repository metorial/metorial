import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  createSsoEmbedUrl: vi.fn(),
  instanceUrl: 'https://example.looker.com'
}));

vi.mock('../lib/client', () => ({
  createLookerClient: vi.fn(() => clientMocks)
}));

import { createEmbedUrl } from './create-embed-url';

describe('create_embed_url compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes legacy root-relative targets and preserves the 3600-second default', async () => {
    clientMocks.createSsoEmbedUrl.mockResolvedValueOnce({
      url: 'https://example.looker.com/login/embed/signed'
    });

    await createEmbedUrl.handleInvocation({
      auth: { token: 'test-token' },
      config: { instanceUrl: 'https://example.looker.com/' },
      input: {
        targetUrl: '/embed/dashboards/42',
        externalUserId: 'external-7',
        permissions: ['access_data'],
        models: ['commerce']
      }
    } as never);

    expect(clientMocks.createSsoEmbedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        target_url: 'https://example.looker.com/embed/dashboards/42',
        session_length: 3600
      })
    );
  });
});
