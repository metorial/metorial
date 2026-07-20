import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock('slates', () => ({
  createAxios: () => axiosMocks
}));

import { Client } from './lib/client';

describe('Outlook message request construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosMocks.get.mockResolvedValue({ data: { value: [] } });
  });

  it('quotes search text safely and omits orderby from Graph search requests', async () => {
    let client = new Client({ token: 'test-token' });

    await client.listMessages({
      folderId: 'inbox',
      top: 15,
      search: 'subject:"Quarterly" \\ update',
      orderby: 'receivedDateTime desc'
    });

    expect(axiosMocks.get).toHaveBeenCalledWith('/me/mailFolders/inbox/messages', {
      params: {
        $top: '15',
        $search: '"subject:\\"Quarterly\\" \\\\ update"'
      },
      headers: {
        ConsistencyLevel: 'eventual'
      }
    });
  });
});
