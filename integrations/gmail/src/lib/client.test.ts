import { beforeEach, describe, expect, it, vi } from 'vitest';

let gmailAxiosMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn()
}));

vi.mock('slates', async () => {
  let actual = await vi.importActual<typeof import('slates')>('slates');
  return {
    ...actual,
    createAxios: vi.fn(() => gmailAxiosMocks)
  };
});

import { Client } from './client';

describe('Gmail client Phase 2 endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gmailAxiosMocks.get.mockResolvedValue({ data: {} });
    gmailAxiosMocks.post.mockResolvedValue({ data: {} });
    gmailAxiosMocks.put.mockResolvedValue({ data: {} });
  });

  it('uses the exact IMAP, POP, and language settings resources', async () => {
    let client = new Client({ token: 'token', userId: 'me' });
    let headers = { headers: { Authorization: 'Bearer token' } };

    await client.getImapSettings();
    await client.updateImapSettings({
      enabled: true,
      autoExpunge: false,
      expungeBehavior: 'archive',
      maxFolderSize: 5000
    });
    await client.getPopSettings();
    await client.updatePopSettings({
      accessWindow: 'fromNowOn',
      disposition: 'leaveInInbox'
    });
    await client.getLanguageSettings();
    await client.updateLanguageSettings({ displayLanguage: 'en-GB' });

    expect(gmailAxiosMocks.get).toHaveBeenNthCalledWith(1, 'users/me/settings/imap', headers);
    expect(gmailAxiosMocks.put).toHaveBeenNthCalledWith(
      1,
      'users/me/settings/imap',
      {
        enabled: true,
        autoExpunge: false,
        expungeBehavior: 'archive',
        maxFolderSize: 5000
      },
      headers
    );
    expect(gmailAxiosMocks.get).toHaveBeenNthCalledWith(2, 'users/me/settings/pop', headers);
    expect(gmailAxiosMocks.put).toHaveBeenNthCalledWith(
      2,
      'users/me/settings/pop',
      { accessWindow: 'fromNowOn', disposition: 'leaveInInbox' },
      headers
    );
    expect(gmailAxiosMocks.get).toHaveBeenNthCalledWith(
      3,
      'users/me/settings/language',
      headers
    );
    expect(gmailAxiosMocks.put).toHaveBeenNthCalledWith(
      3,
      'users/me/settings/language',
      { displayLanguage: 'en-GB' },
      headers
    );
  });

  it('sends a rebuilt raw MIME message through messages.send', async () => {
    let client = new Client({ token: 'token', userId: 'me' });
    let raw = 'To: recipient@example.com\r\nSubject: Fwd: Example\r\n\r\nbody';

    await client.sendRawMessage(raw);

    expect(gmailAxiosMocks.post).toHaveBeenCalledWith(
      'users/me/messages/send',
      { raw: expect.any(String) },
      { headers: { Authorization: 'Bearer token' } }
    );
  });
});
