import { ServiceError } from '@lowerdeck/error';
import { expectMcpCompatibleToolSchema } from '@slates/test';
import { createApiServiceError } from 'slates';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleChatClient } from './lib/client';
import { googleChatActionAuthMethods, googleChatActionScopes } from './scopes';
import { listMessages } from './tools/list-messages';
import { buildManageMessageRequest, manageMessage } from './tools/manage-message';
import { searchConversations } from './tools/search-conversations';
import { buildSearchMessagesFallbackPlan, searchMessages } from './tools/search-messages';
import { buildSendMessageRequest, sendMessage } from './tools/send-message';

let coreTools = [
  sendMessage,
  listMessages,
  searchMessages,
  searchConversations,
  manageMessage
] as const;

let createContext = <T extends Record<string, unknown>>(input: T) =>
  ({
    input,
    auth: { token: 'test-token' },
    config: { defaultSpace: 'spaces/default-space' },
    progress: vi.fn()
  }) as any;

let requestSpy = vi.spyOn(GoogleChatClient.prototype, 'request');

beforeEach(() => {
  requestSpy.mockReset();
});

describe('google-chat core A tool family', () => {
  it('exports the assigned keys with compatible object schemas, short IDs, scopes, auth, and tags', () => {
    expect(coreTools.map(tool => tool.key)).toEqual([
      'send_message',
      'list_messages',
      'search_messages',
      'search_conversations',
      'manage_message'
    ]);

    let expectedMetadata = [
      [
        googleChatActionScopes.sendMessage,
        googleChatActionAuthMethods.sendMessage,
        false,
        false
      ],
      [
        googleChatActionScopes.listMessages,
        googleChatActionAuthMethods.listMessages,
        true,
        false
      ],
      [
        googleChatActionScopes.searchMessages,
        googleChatActionAuthMethods.searchMessages,
        true,
        false
      ],
      [
        googleChatActionScopes.searchConversations,
        googleChatActionAuthMethods.searchConversations,
        true,
        false
      ],
      [
        googleChatActionScopes.manageMessage,
        googleChatActionAuthMethods.manageMessage,
        false,
        true
      ]
    ] as const;

    coreTools.forEach((tool, index) => {
      expectMcpCompatibleToolSchema(tool);
      expect(`google-chat-${tool.key}`.length).toBeLessThan(60);
      expect(tool.scopes).toEqual(expectedMetadata[index]?.[0]);
      expect(tool.authMethods).toEqual(expectedMetadata[index]?.[1]);
      expect(tool.tags?.readOnly).toBe(expectedMetadata[index]?.[2]);
      expect(tool.tags?.destructive ?? false).toBe(expectedMetadata[index]?.[3]);
    });
  });

  it('sends messages through spaces.messages.create with threadKey and messageReplyOption', async () => {
    requestSpy.mockResolvedValueOnce({
      name: 'spaces/default-space/messages/message-1',
      text: 'Hello team',
      thread: {
        name: 'spaces/default-space/threads/thread-1',
        threadKey: 'release-thread'
      },
      createTime: '2026-07-14T10:00:00Z',
      threadReply: true,
      sender: {
        name: 'users/123',
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        type: 'HUMAN'
      }
    });

    let result = await sendMessage.handleInvocation(
      createContext({
        messageText: 'Hello team',
        threadKey: 'release-thread',
        messageReplyOption: 'REPLY_MESSAGE_OR_FAIL',
        attachmentResourceNames: ['spaces/default-space/attachments/upload-1']
      })
    );

    expect(requestSpy).toHaveBeenCalledWith('spaces/default-space/messages', {
      method: 'post',
      params: { messageReplyOption: 'REPLY_MESSAGE_OR_FAIL' },
      data: {
        text: 'Hello team',
        thread: { threadKey: 'release-thread' },
        attachment: [
          {
            attachmentDataRef: {
              resourceName: 'spaces/default-space/attachments/upload-1'
            }
          }
        ]
      },
      operation: 'send message'
    });
    expect(result.output.message).toMatchObject({
      messageId: 'spaces/default-space/messages/message-1',
      spaceName: 'spaces/default-space',
      threadId: 'spaces/default-space/threads/thread-1',
      threadKey: 'release-thread',
      plaintextBody: 'Hello team',
      threadedReply: true,
      sender: {
        userId: 'users/123',
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        userType: 'HUMAN'
      }
    });
  });

  it('replies by threadId and consumes attachment upload tokens', async () => {
    requestSpy.mockResolvedValueOnce({
      name: 'spaces/default-space/messages/message-2',
      text: 'Attached report',
      thread: { name: 'spaces/default-space/threads/thread-2' },
      threadReply: true
    });

    await sendMessage.handleInvocation(
      createContext({
        messageText: 'Attached report',
        threadId: 'spaces/default-space/threads/thread-2',
        attachmentUploadTokens: ['opaque-upload-token']
      })
    );

    expect(requestSpy).toHaveBeenCalledWith('spaces/default-space/messages', {
      method: 'post',
      params: { messageReplyOption: 'REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD' },
      data: {
        text: 'Attached report',
        thread: { name: 'spaces/default-space/threads/thread-2' },
        attachment: [
          {
            attachmentDataRef: {
              attachmentUploadToken: 'opaque-upload-token'
            }
          }
        ]
      },
      operation: 'send message'
    });
  });

  it('uses ServiceError for incompatible send-message thread and attachment inputs', () => {
    expect(() =>
      buildSendMessageRequest(
        {
          messageText: 'Hello',
          threadId: 'thread-1',
          threadKey: 'application-thread'
        },
        'spaces/space-1'
      )
    ).toThrow(ServiceError);
    expect(() =>
      buildSendMessageRequest(
        {
          messageText: 'Hello',
          attachmentResourceNames: ['spaces/space-1/attachments/attachment-1'],
          attachmentUploadTokens: ['opaque-upload-token']
        },
        'spaces/space-1'
      )
    ).toThrow(ServiceError);
  });

  it('allows MESSAGE_REPLY_OPTION_UNSPECIFIED with threadKey to start a new keyed thread', () => {
    expect(
      buildSendMessageRequest(
        {
          messageText: 'Hello',
          threadKey: 'application-thread',
          messageReplyOption: 'MESSAGE_REPLY_OPTION_UNSPECIFIED'
        },
        'spaces/space-1'
      )
    ).toEqual({
      parent: 'spaces/space-1',
      data: {
        text: 'Hello',
        thread: { threadKey: 'application-thread' }
      },
      params: { messageReplyOption: 'MESSAGE_REPLY_OPTION_UNSPECIFIED' }
    });
  });

  it('lists messages with exact thread/time filters, ordering, and pagination', async () => {
    requestSpy.mockResolvedValueOnce({
      messages: [
        {
          name: 'spaces/space-1/messages/message-1',
          text: 'Latest update',
          thread: { name: 'spaces/space-1/threads/thread-1' }
        }
      ],
      nextPageToken: 'message-page-2'
    });

    let result = await listMessages.handleInvocation(
      createContext({
        conversationId: 'spaces/space-1',
        threadId: 'thread-1',
        startTime: '2026-07-01T00:00:00Z',
        endTime: '2026-08-01T00:00:00Z',
        orderBy: 'DESC',
        pageSize: 25,
        pageToken: 'message-page-1'
      })
    );

    expect(requestSpy).toHaveBeenCalledWith('spaces/space-1/messages', {
      method: 'get',
      params: {
        filter:
          'thread.name = spaces/space-1/threads/thread-1 AND createTime > "2026-07-01T00:00:00Z" AND createTime < "2026-08-01T00:00:00Z"',
        orderBy: 'createTime DESC',
        pageSize: 25,
        pageToken: 'message-page-1'
      },
      operation: 'list messages'
    });
    expect(result.output).toMatchObject({
      messages: [{ messageId: 'spaces/space-1/messages/message-1' }],
      nextPageToken: 'message-page-2',
      returnedCount: 1
    });
  });

  it('uses the official Developer Preview messages.search endpoint and exact body fields', async () => {
    requestSpy.mockResolvedValueOnce({
      results: [
        {
          message: {
            name: 'spaces/space-2/messages/message-2',
            text: 'Release is ready'
          }
        }
      ],
      nextPageToken: 'search-page-2'
    });

    let result = await searchMessages.handleInvocation(
      createContext({
        query: '"release" AND space.name = "spaces/space-2"',
        orderBy: 'relevance desc',
        pageSize: 50,
        pageToken: 'search-page-1'
      })
    );

    expect(requestSpy).toHaveBeenCalledWith('spaces/-/messages:search', {
      method: 'post',
      data: {
        filter: '"release" AND space.name = "spaces/space-2"',
        orderBy: 'relevance desc',
        pageSize: 50,
        pageToken: 'search-page-1'
      },
      operation: 'search messages'
    });
    expect(result.output).toMatchObject({
      messages: [{ messageId: 'spaces/space-2/messages/message-2' }],
      nextPageToken: 'search-page-2',
      returnedCount: 1,
      searchMethod: 'search_api'
    });
    expect(result.message).toContain('search API');
  });

  it('falls back to spaces.messages.list keyword matching when the search API is unavailable', async () => {
    requestSpy
      .mockRejectedValueOnce(
        createApiServiceError(
          'Google Chat API search messages failed: HTTP 403 Forbidden: PERMISSION_DENIED',
          { reason: 'google_chat_api_error', upstreamStatus: 403 }
        )
      )
      .mockResolvedValueOnce({
        messages: [
          {
            name: 'spaces/space-2/messages/message-1',
            text: 'Release ready — the update shipped'
          },
          {
            name: 'spaces/space-2/messages/message-2',
            text: 'Unrelated note'
          }
        ]
      });

    let result = await searchMessages.handleInvocation(
      createContext({
        query:
          '"release ready" update AND space.name = "spaces/space-2" AND createTime > "2026-07-01T00:00:00Z"',
        conversationId: 'spaces/space-2',
        pageSize: 25
      })
    );

    expect(requestSpy.mock.calls).toEqual([
      [
        'spaces/-/messages:search',
        expect.objectContaining({ method: 'post', operation: 'search messages' })
      ],
      [
        'spaces/space-2/messages',
        {
          method: 'get',
          params: {
            filter: 'createTime > "2026-07-01T00:00:00Z"',
            orderBy: 'createTime DESC',
            pageSize: 50
          },
          operation: 'search messages (list fallback)'
        }
      ]
    ]);
    expect(result.output).toMatchObject({
      messages: [{ messageId: 'spaces/space-2/messages/message-1' }],
      returnedCount: 1,
      searchMethod: 'list_fallback'
    });
    expect(result.message).toContain('spaces.messages.list fallback');
    expect(result.message).toContain('Developer Preview');
  });

  it('explains the Developer Preview requirement when the fallback lacks a conversationId', async () => {
    requestSpy.mockRejectedValueOnce(
      createApiServiceError('Google Chat API search messages failed: HTTP 404 Not Found', {
        reason: 'google_chat_api_error',
        upstreamStatus: 404
      })
    );

    await expect(
      searchMessages.handleInvocation(createContext({ query: 'release' }))
    ).rejects.toThrow(/Developer Preview.*conversationId/s);
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('rethrows search API errors that are not preview-availability failures', async () => {
    requestSpy.mockRejectedValueOnce(
      createApiServiceError(
        'Google Chat API search messages failed: HTTP 500: backend error',
        {
          reason: 'google_chat_api_error',
          upstreamStatus: 500
        }
      )
    );

    await expect(
      searchMessages.handleInvocation(
        createContext({ query: 'release', conversationId: 'spaces/space-2' })
      )
    ).rejects.toThrow(/HTTP 500/);
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('uses ServiceError for fallback searches that the list API cannot approximate', () => {
    expect(() =>
      buildSearchMessagesFallbackPlan({
        query: 'space.name = "spaces/space-2" AND has_link()',
        conversationId: 'spaces/space-2'
      })
    ).toThrow(ServiceError);
    expect(() =>
      buildSearchMessagesFallbackPlan({
        query: 'release',
        conversationId: 'spaces/space-2',
        pageToken: 'search-page-2'
      })
    ).toThrow(ServiceError);
  });

  it('uses spaces.list and preserves pagination after client-side name filtering', async () => {
    requestSpy.mockResolvedValueOnce({
      spaces: [
        {
          name: 'spaces/release-room',
          displayName: 'Release Coordination',
          spaceType: 'SPACE',
          lastActiveTime: '2026-07-14T11:00:00Z'
        },
        {
          name: 'spaces/general',
          displayName: 'General',
          spaceType: 'SPACE'
        }
      ],
      nextPageToken: 'spaces-page-2'
    });

    let result = await searchConversations.handleInvocation(
      createContext({
        spaceNameQuery: 'RELEASE',
        spaceType: 'SPACE',
        pageSize: 10,
        pageToken: 'spaces-page-1'
      })
    );

    expect(requestSpy).toHaveBeenCalledWith('spaces', {
      method: 'get',
      params: {
        filter: 'spaceType = "SPACE"',
        pageSize: 10,
        pageToken: 'spaces-page-1'
      },
      operation: 'search conversations'
    });
    expect(result.output).toEqual({
      conversations: [
        {
          conversationId: 'spaces/release-room',
          displayName: 'Release Coordination',
          conversationType: 'NAMED_SPACE',
          spaceType: 'SPACE',
          lastActiveTimestamp: '2026-07-14T11:00:00Z',
          spaceUri: undefined
        }
      ],
      nextPageToken: 'spaces-page-2',
      returnedCount: 1
    });
  });

  it('gets, patches, and deletes messages with canonical names and exact controls', async () => {
    requestSpy
      .mockResolvedValueOnce({
        name: 'spaces/space-1/messages/message-1',
        text: 'Before'
      })
      .mockResolvedValueOnce({
        name: 'spaces/space-1/messages/message-1',
        text: 'After'
      })
      .mockResolvedValueOnce({});

    await manageMessage.handleInvocation(
      createContext({ action: 'get', message: 'message-1', space: 'space-1' })
    );
    let updated = await manageMessage.handleInvocation(
      createContext({
        action: 'update',
        message: 'spaces/space-1/messages/message-1',
        text: 'After',
        updateMask: 'text'
      })
    );
    let deleted = await manageMessage.handleInvocation(
      createContext({
        action: 'delete',
        message: 'spaces/space-1/messages/message-1',
        force: true
      })
    );

    expect(requestSpy.mock.calls).toEqual([
      ['spaces/space-1/messages/message-1', { method: 'get', operation: 'get message' }],
      [
        'spaces/space-1/messages/message-1',
        {
          method: 'patch',
          params: { updateMask: 'text' },
          data: { name: 'spaces/space-1/messages/message-1', text: 'After' },
          operation: 'update message'
        }
      ],
      [
        'spaces/space-1/messages/message-1',
        { method: 'delete', params: { force: true }, operation: 'delete message' }
      ]
    ]);
    expect(updated.output).toMatchObject({
      action: 'update',
      messageName: 'spaces/space-1/messages/message-1',
      message: { messageId: 'spaces/space-1/messages/message-1', plaintextBody: 'After' }
    });
    expect(deleted.output).toEqual({
      action: 'delete',
      messageName: 'spaces/space-1/messages/message-1',
      deleted: true
    });
  });

  it('uses ServiceError for invalid cross-field message operations', () => {
    expect(() =>
      buildManageMessageRequest(
        {
          action: 'update',
          message: 'message-1',
          force: true
        },
        'spaces/space-1'
      )
    ).toThrow(ServiceError);
    expect(() =>
      buildManageMessageRequest(
        {
          action: 'get',
          message: 'message-1',
          text: 'not allowed'
        },
        'spaces/space-1'
      )
    ).toThrow(ServiceError);
  });
});
