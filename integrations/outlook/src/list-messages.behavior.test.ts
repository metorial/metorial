import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  listMessages: vi.fn()
}));

vi.mock('./lib/client', () => ({
  Client: class {
    listMessages(...args: unknown[]) {
      return clientMocks.listMessages(...args);
    }
  }
}));

import { listMessages } from './tools/list-messages';

describe('List Emails behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests only the fields exposed by the summary output', async () => {
    clientMocks.listMessages.mockResolvedValue({ value: [] });

    await listMessages.handleInvocation({
      auth: { token: 'test-token' },
      input: {
        folderId: 'inbox',
        top: 30,
        orderby: 'receivedDateTime desc'
      }
    } as any);

    expect(clientMocks.listMessages).toHaveBeenCalledWith({
      folderId: 'inbox',
      search: undefined,
      filter: undefined,
      orderby: 'receivedDateTime desc',
      top: 30,
      skip: undefined,
      select: [
        'id',
        'subject',
        'bodyPreview',
        'from',
        'toRecipients',
        'receivedDateTime',
        'isRead',
        'isDraft',
        'importance',
        'hasAttachments',
        'conversationId',
        'webLink',
        'categories'
      ]
    });
  });
});
