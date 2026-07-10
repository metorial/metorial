import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let gmailClientMocks = vi.hoisted(() => ({
  deleteLabel: vi.fn(),
  getLabel: vi.fn(),
  updateDraft: vi.fn(),
  updateLabel: vi.fn()
}));

vi.mock('./lib/client', () => ({
  Client: class {
    deleteLabel(...args: unknown[]) {
      return gmailClientMocks.deleteLabel(...args);
    }

    getLabel(...args: unknown[]) {
      return gmailClientMocks.getLabel(...args);
    }

    updateDraft(...args: unknown[]) {
      return gmailClientMocks.updateDraft(...args);
    }

    updateLabel(...args: unknown[]) {
      return gmailClientMocks.updateLabel(...args);
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
});
