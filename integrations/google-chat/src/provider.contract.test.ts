import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import {
  googleChatActionAuthMethods,
  googleChatActionScopes,
  googleChatScopes
} from './scopes';
import { tools } from './tools';

const toolContracts = [
  { id: 'send_message', readOnly: false, destructive: false },
  { id: 'list_messages', readOnly: true, destructive: false },
  { id: 'search_messages', readOnly: true, destructive: false },
  { id: 'search_conversations', readOnly: true, destructive: false },
  { id: 'manage_space', readOnly: false, destructive: true },
  { id: 'manage_member', readOnly: false, destructive: true },
  { id: 'manage_message', readOnly: false, destructive: true },
  { id: 'manage_reaction', readOnly: false, destructive: true },
  { id: 'find_direct_message', readOnly: true, destructive: false },
  { id: 'get_attachment', readOnly: true, destructive: false },
  { id: 'download_attachment', readOnly: true, destructive: false },
  { id: 'upload_attachment', readOnly: false, destructive: false },
  { id: 'list_space_events', readOnly: true, destructive: false }
] as const;

const toolIds = toolContracts.map(tool => tool.id);

const expectedScopes = {
  send_message: {
    AND: [
      {
        OR: [googleChatScopes.messages, googleChatScopes.messagesCreate, googleChatScopes.bot]
      }
    ]
  },
  list_messages: {
    AND: [{ OR: [googleChatScopes.messages, googleChatScopes.messagesReadonly] }]
  },
  search_messages: {
    AND: [{ OR: [googleChatScopes.messages, googleChatScopes.messagesReadonly] }]
  },
  search_conversations: {
    AND: [
      {
        OR: [googleChatScopes.spaces, googleChatScopes.spacesReadonly, googleChatScopes.bot]
      }
    ]
  },
  manage_space: {
    AND: [{ OR: [googleChatScopes.spaces, googleChatScopes.spacesReadonly] }]
  },
  manage_member: {
    AND: [{ OR: [googleChatScopes.memberships, googleChatScopes.membershipsApp] }]
  },
  manage_message: {
    AND: [
      {
        OR: [
          googleChatScopes.messages,
          googleChatScopes.messagesReadonly,
          googleChatScopes.bot
        ]
      }
    ]
  },
  manage_reaction: {
    AND: [{ OR: [googleChatScopes.messageReactions, googleChatScopes.messages] }]
  },
  find_direct_message: {
    AND: [
      {
        OR: [googleChatScopes.spaces, googleChatScopes.spacesReadonly, googleChatScopes.bot]
      }
    ]
  },
  get_attachment: {
    AND: [{ OR: [googleChatScopes.bot] }]
  },
  download_attachment: {
    AND: [
      {
        OR: [
          googleChatScopes.messages,
          googleChatScopes.messagesReadonly,
          googleChatScopes.bot
        ]
      }
    ]
  },
  upload_attachment: {
    AND: [
      {
        OR: [googleChatScopes.messages, googleChatScopes.messagesCreate, googleChatScopes.bot]
      }
    ]
  },
  list_space_events: {
    AND: [
      {
        OR: [
          googleChatScopes.messages,
          googleChatScopes.messagesReadonly,
          googleChatScopes.messageReactions,
          googleChatScopes.memberships,
          googleChatScopes.membershipsReadonly,
          googleChatScopes.spaces,
          googleChatScopes.spacesReadonly
        ]
      }
    ]
  }
} as const;

const expectedAuthMethods = {
  send_message: ['oauth', 'service_account'],
  list_messages: ['oauth'],
  search_messages: ['oauth'],
  search_conversations: ['oauth', 'service_account'],
  manage_space: ['oauth'],
  manage_member: ['oauth'],
  manage_message: ['oauth', 'service_account'],
  manage_reaction: ['oauth'],
  find_direct_message: ['oauth', 'service_account'],
  get_attachment: ['service_account'],
  download_attachment: ['oauth', 'service_account'],
  upload_attachment: ['oauth', 'service_account'],
  list_space_events: ['oauth']
} as const;

describe('google-chat provider contract', () => {
  it('exposes the exact 13-tool surface with tags, scopes, auth gating, and config', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-chat',
        name: 'Google Chat',
        description:
          'Google Chat integration for spaces, memberships, messages, reactions, attachments, and space events.'
      },
      toolIds: [...toolIds],
      triggerIds: [],
      authMethodIds: ['oauth', 'service_account'],
      tools: [...toolContracts]
    });

    expect(contract.actions).toHaveLength(13);
    expect(tools.map(tool => tool.key)).toEqual(toolIds);
    expect(new Set(tools.map(tool => tool.key)).size).toBe(13);
    expect(provider.actions.map(action => action.key)).toEqual(toolIds);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual(['defaultSpace']);
    expect(contract.configSchema.required ?? []).toEqual([]);
    expect(contract.configSchema.properties?.defaultSpace).toMatchObject({
      type: 'string',
      minLength: 1
    });
    expect(contract.configSchema.properties?.defaultSpace).not.toHaveProperty('default');

    for (let tool of toolContracts) {
      let action = contract.actions.find(candidate => candidate.id === tool.id);
      expect(action?.scopes).toEqual(expectedScopes[tool.id]);
      expect(action?.authMethods).toEqual(expectedAuthMethods[tool.id]);
      expect(`google-chat-${tool.id}`.length).toBeLessThan(60);
    }
  });

  it('exposes exact OAuth consent defaults and Chat app auth capabilities', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
    expect(
      (oauth.authenticationMethod.scopes ?? []).map(scope => [scope.id, scope.defaultChecked])
    ).toEqual([
      [googleChatScopes.messages, true],
      [googleChatScopes.messagesReadonly, undefined],
      [googleChatScopes.messagesCreate, undefined],
      [googleChatScopes.spaces, undefined],
      [googleChatScopes.spacesReadonly, undefined],
      [googleChatScopes.delete, undefined],
      [googleChatScopes.memberships, undefined],
      [googleChatScopes.membershipsReadonly, undefined],
      [googleChatScopes.membershipsApp, undefined],
      [googleChatScopes.messageReactions, undefined],
      [googleChatScopes.userInfoEmail, true],
      [googleChatScopes.userInfoProfile, true]
    ]);

    let serviceAccount = await client.getAuthMethod('service_account');
    expect(serviceAccount.authenticationMethod.type).toBe('auth.custom');
    expect(serviceAccount.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(
      true
    );
    expect(serviceAccount.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
  });

  it('keeps user-only and Chat-app-only endpoint gates explicit', () => {
    expect(googleChatActionScopes).toEqual({
      sendMessage: expectedScopes.send_message,
      listMessages: expectedScopes.list_messages,
      searchMessages: expectedScopes.search_messages,
      searchConversations: expectedScopes.search_conversations,
      manageSpace: expectedScopes.manage_space,
      manageMember: expectedScopes.manage_member,
      manageMessage: expectedScopes.manage_message,
      manageReaction: expectedScopes.manage_reaction,
      findDirectMessage: expectedScopes.find_direct_message,
      getAttachment: expectedScopes.get_attachment,
      downloadAttachment: expectedScopes.download_attachment,
      uploadAttachment: expectedScopes.upload_attachment,
      listSpaceEvents: expectedScopes.list_space_events
    });
    expect(googleChatActionAuthMethods).toEqual({
      sendMessage: expectedAuthMethods.send_message,
      listMessages: expectedAuthMethods.list_messages,
      searchMessages: expectedAuthMethods.search_messages,
      searchConversations: expectedAuthMethods.search_conversations,
      manageSpace: expectedAuthMethods.manage_space,
      manageMember: expectedAuthMethods.manage_member,
      manageMessage: expectedAuthMethods.manage_message,
      manageReaction: expectedAuthMethods.manage_reaction,
      findDirectMessage: expectedAuthMethods.find_direct_message,
      getAttachment: expectedAuthMethods.get_attachment,
      downloadAttachment: expectedAuthMethods.download_attachment,
      uploadAttachment: expectedAuthMethods.upload_attachment,
      listSpaceEvents: expectedAuthMethods.list_space_events
    });
  });
});
