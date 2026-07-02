import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import {
  createPerson,
  manageHelpdeskArticle,
  manageMessageStatus,
  sendMessage,
  updateConversation,
  updatePerson
} from './tools';

let baseContext = {
  auth: { token: 'token' },
  config: { websiteId: 'website-id' }
};

let invoke = (tool: any, input: unknown) =>
  tool.handleInvocation({
    ...baseContext,
    input
  });

describe('Crisp tool validation', () => {
  it('requires identity data when creating a person', async () => {
    await expect(invoke(createPerson, {})).rejects.toBeInstanceOf(ServiceError);
  });

  it('rejects empty person updates', async () => {
    await expect(invoke(updatePerson, { peopleId: 'people-id' })).rejects.toBeInstanceOf(
      ServiceError
    );
  });

  it('rejects empty and conflicting conversation updates', async () => {
    await expect(
      invoke(updateConversation, { sessionId: 'session-id' })
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(
      invoke(updateConversation, {
        sessionId: 'session-id',
        assignToOperatorId: 'operator-id',
        unassign: true
      })
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(
      invoke(updateConversation, {
        sessionId: 'session-id',
        inboxId: 'inbox-id',
        moveToMainInbox: true
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('validates helpdesk article action-specific requirements', async () => {
    await expect(
      invoke(manageHelpdeskArticle, { localeId: 'en', delete: true })
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(invoke(manageHelpdeskArticle, { localeId: 'en' })).rejects.toBeInstanceOf(
      ServiceError
    );

    await expect(
      invoke(manageHelpdeskArticle, { localeId: 'en', articleId: 'article-id' })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('validates message status action-specific requirements', async () => {
    await expect(
      invoke(manageMessageStatus, {
        sessionId: 'session-id',
        action: 'mark_delivered',
        origin: 'chat'
      })
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(
      invoke(manageMessageStatus, {
        sessionId: 'session-id',
        action: 'mark_unread',
        fingerprints: [123],
        origin: 'chat'
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('validates basic message content shapes', async () => {
    await expect(
      invoke(sendMessage, {
        sessionId: 'session-id',
        type: 'text',
        from: 'operator',
        origin: 'chat',
        content: { text: 'not a string' }
      })
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(
      invoke(sendMessage, {
        sessionId: 'session-id',
        type: 'file',
        from: 'operator',
        origin: 'chat',
        content: { url: 'https://example.com/file.txt' }
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });
});
