import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let gmailClientMocks = vi.hoisted(() => ({
  deleteLabel: vi.fn(),
  getImapSettings: vi.fn(),
  getLabel: vi.fn(),
  getLanguageSettings: vi.fn(),
  getMessage: vi.fn(),
  getPopSettings: vi.fn(),
  getProfile: vi.fn(),
  sendRawMessage: vi.fn(),
  updateImapSettings: vi.fn(),
  updateDraft: vi.fn(),
  updateLabel: vi.fn(),
  updateLanguageSettings: vi.fn(),
  updatePopSettings: vi.fn()
}));

vi.mock('./lib/client', () => ({
  Client: class {
    deleteLabel(...args: unknown[]) {
      return gmailClientMocks.deleteLabel(...args);
    }

    getImapSettings(...args: unknown[]) {
      return gmailClientMocks.getImapSettings(...args);
    }

    getLabel(...args: unknown[]) {
      return gmailClientMocks.getLabel(...args);
    }

    getLanguageSettings(...args: unknown[]) {
      return gmailClientMocks.getLanguageSettings(...args);
    }

    getMessage(...args: unknown[]) {
      return gmailClientMocks.getMessage(...args);
    }

    getPopSettings(...args: unknown[]) {
      return gmailClientMocks.getPopSettings(...args);
    }

    getProfile(...args: unknown[]) {
      return gmailClientMocks.getProfile(...args);
    }

    sendRawMessage(...args: unknown[]) {
      return gmailClientMocks.sendRawMessage(...args);
    }

    updateImapSettings(...args: unknown[]) {
      return gmailClientMocks.updateImapSettings(...args);
    }

    updateDraft(...args: unknown[]) {
      return gmailClientMocks.updateDraft(...args);
    }

    updateLabel(...args: unknown[]) {
      return gmailClientMocks.updateLabel(...args);
    }

    updateLanguageSettings(...args: unknown[]) {
      return gmailClientMocks.updateLanguageSettings(...args);
    }

    updatePopSettings(...args: unknown[]) {
      return gmailClientMocks.updatePopSettings(...args);
    }
  },
  parseMessage: vi.fn()
}));

import { provider } from './index';

let createGmailToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: { userId: 'me' },
      auth: {
        authenticationMethodId: 'google_oauth',
        output: { token: 'test-token' }
      }
    }
  });

describe('Gmail tool validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects draft updates without a draft ID as a user-facing validation error', async () => {
    let client = createGmailToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('manage_draft', {
          action: 'update',
          to: ['recipient@example.com'],
          subject: 'Updated draft',
          body: 'Updated body',
          maxResults: 20
        }),
      'draftId is required for update action.'
    );
    expect(gmailClientMocks.updateDraft).not.toHaveBeenCalled();
  });

  it('rejects label deletion without a label ID as a user-facing validation error', async () => {
    let client = createGmailToolTestClient();

    await expectSlateError(
      () => client.invokeTool('manage_labels', { action: 'delete', name: 'SENT' }),
      'labelId is required for delete action.'
    );
    expect(gmailClientMocks.deleteLabel).not.toHaveBeenCalled();
  });

  it('rejects system-label deletion before sending a delete request to Gmail', async () => {
    gmailClientMocks.getLabel.mockResolvedValue({
      id: 'SENT',
      name: 'SENT',
      type: 'system'
    });
    let client = createGmailToolTestClient();

    await expectSlateError(
      () => client.invokeTool('manage_labels', { action: 'delete', labelId: 'SENT' }),
      'System label SENT cannot be deleted.'
    );
    expect(gmailClientMocks.getLabel).toHaveBeenCalledWith('SENT');
    expect(gmailClientMocks.deleteLabel).not.toHaveBeenCalled();
  });

  it('rejects system-label updates before sending a patch request to Gmail', async () => {
    gmailClientMocks.getLabel.mockResolvedValue({
      id: 'SENT',
      name: 'SENT',
      type: 'system'
    });
    let client = createGmailToolTestClient();

    await expectSlateError(
      () => client.invokeTool('manage_labels', { action: 'update', labelId: 'SENT' }),
      'System label SENT cannot be updated.'
    );
    expect(gmailClientMocks.updateLabel).not.toHaveBeenCalled();
  });

  it('forwards the full original MIME entity and attachments', async () => {
    let originalBody = [
      '--boundary',
      'Content-Type: text/plain',
      '',
      'body marker',
      '--boundary',
      'Content-Type: application/octet-stream; name="file.bin"',
      'Content-Transfer-Encoding: base64',
      '',
      'AAEC/w==',
      '--boundary--'
    ].join('\r\n');
    let original = [
      'From: sender@example.com',
      'To: mailbox@example.com',
      'Subject: Original',
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="boundary"',
      '',
      originalBody
    ].join('\r\n');
    gmailClientMocks.getMessage.mockResolvedValue({
      id: 'source-1',
      raw: btoa(original).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    });
    gmailClientMocks.sendRawMessage.mockResolvedValue({
      id: 'forwarded-1',
      threadId: 'thread-1',
      labelIds: ['SENT']
    });
    let client = createGmailToolTestClient();

    let result = await client.invokeTool('forward_message', {
      messageId: 'source-1',
      to: ['recipient@example.com']
    });
    let sentRaw = String(gmailClientMocks.sendRawMessage.mock.calls[0]?.[0]);

    expect(gmailClientMocks.getMessage).toHaveBeenCalledWith('source-1', 'raw');
    expect(sentRaw.slice(sentRaw.indexOf('\r\n\r\n') + 4)).toBe(originalBody);
    expect(result.output).toMatchObject({
      sourceMessageId: 'source-1',
      messageId: 'forwarded-1',
      threadId: 'thread-1',
      subject: 'Fwd: Original',
      labelIds: ['SENT']
    });
  });

  it('rejects recipient header injection before reading or sending a message', async () => {
    let client = createGmailToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('forward_message', {
          messageId: 'source-1',
          to: ['recipient@example.com\r\nBcc: injected@example.com']
        }),
      'Invalid input for tool ID: forward_message'
    );
    expect(gmailClientMocks.getMessage).not.toHaveBeenCalled();
    expect(gmailClientMocks.sendRawMessage).not.toHaveBeenCalled();
  });

  it('rejects malformed raw MIME before sending a forward', async () => {
    gmailClientMocks.getMessage.mockResolvedValue({
      id: 'source-1',
      raw: btoa('Subject: Missing body separator')
    });
    let client = createGmailToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('forward_message', {
          messageId: 'source-1',
          to: ['recipient@example.com']
        }),
      'Gmail returned malformed MIME content for message source-1.'
    );
    expect(gmailClientMocks.sendRawMessage).not.toHaveBeenCalled();
  });

  it('rejects invalid base64url raw MIME before sending a forward', async () => {
    gmailClientMocks.getMessage.mockResolvedValue({
      id: 'source-1',
      raw: '%%%'
    });
    let client = createGmailToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('forward_message', {
          messageId: 'source-1',
          to: ['recipient@example.com']
        }),
      'Gmail returned invalid base64url MIME content for message source-1.'
    );
    expect(gmailClientMocks.sendRawMessage).not.toHaveBeenCalled();
  });

  it('returns the current mailbox profile', async () => {
    gmailClientMocks.getProfile.mockResolvedValue({
      emailAddress: 'mailbox@example.com',
      messagesTotal: 42,
      threadsTotal: 17,
      historyId: 'history-1'
    });
    let client = createGmailToolTestClient();

    let result = await client.invokeTool('get_profile', {});

    expect(result.output).toEqual({
      emailAddress: 'mailbox@example.com',
      messagesTotal: 42,
      threadsTotal: 17,
      historyId: 'history-1'
    });
  });

  it('gets and safely merges IMAP, POP, and language settings updates', async () => {
    let imap = {
      enabled: true,
      autoExpunge: false,
      expungeBehavior: 'archive',
      maxFolderSize: 5000
    } as const;
    let pop = {
      accessWindow: 'fromNowOn',
      disposition: 'leaveInInbox'
    } as const;
    let language = { displayLanguage: 'en' };
    gmailClientMocks.getImapSettings.mockResolvedValue(imap);
    gmailClientMocks.updateImapSettings.mockResolvedValue({ ...imap, enabled: false });
    gmailClientMocks.getPopSettings.mockResolvedValue(pop);
    gmailClientMocks.updatePopSettings.mockResolvedValue({ ...pop, disposition: 'archive' });
    gmailClientMocks.getLanguageSettings.mockResolvedValue(language);
    gmailClientMocks.updateLanguageSettings.mockResolvedValue({ displayLanguage: 'fr' });
    let client = createGmailToolTestClient();

    let getImap = await client.invokeTool('manage_settings', { action: 'get_imap' });
    let updateImap = await client.invokeTool('manage_settings', {
      action: 'update_imap',
      imapEnabled: false
    });
    let getPop = await client.invokeTool('manage_settings', { action: 'get_pop' });
    let updatePop = await client.invokeTool('manage_settings', {
      action: 'update_pop',
      popDisposition: 'archive'
    });
    let getLanguage = await client.invokeTool('manage_settings', {
      action: 'get_language'
    });
    let updateLanguage = await client.invokeTool('manage_settings', {
      action: 'update_language',
      displayLanguage: 'fr'
    });

    expect(gmailClientMocks.updateImapSettings).toHaveBeenCalledWith({
      ...imap,
      enabled: false
    });
    expect(gmailClientMocks.updatePopSettings).toHaveBeenCalledWith({
      ...pop,
      disposition: 'archive'
    });
    expect(gmailClientMocks.updateLanguageSettings).toHaveBeenCalledWith({
      displayLanguage: 'fr'
    });
    expect(getImap.output.imap).toEqual(imap);
    expect(updateImap.output.imap).toEqual({ ...imap, enabled: false });
    expect(getPop.output.pop).toEqual(pop);
    expect(updatePop.output.pop).toEqual({ ...pop, disposition: 'archive' });
    expect(getLanguage.output.language).toEqual(language);
    expect(updateLanguage.output.language).toEqual({ displayLanguage: 'fr' });
  });

  it('rejects settings updates that do not include branch-specific fields', async () => {
    let client = createGmailToolTestClient();

    await expectSlateError(
      () => client.invokeTool('manage_settings', { action: 'update_imap' }),
      'Provide at least one IMAP setting for update_imap.'
    );
    await expectSlateError(
      () => client.invokeTool('manage_settings', { action: 'update_pop' }),
      'Provide at least one POP setting for update_pop.'
    );
    await expectSlateError(
      () => client.invokeTool('manage_settings', { action: 'update_language' }),
      'displayLanguage is required for update_language.'
    );
  });
});
