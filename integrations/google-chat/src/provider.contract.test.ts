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
  { id: 'manage_message', readOnly: false, destructive: true },
  { id: 'manage_reaction', readOnly: false, destructive: true },
  { id: 'find_direct_message', readOnly: true, destructive: false },
  { id: 'get_attachment', readOnly: true, destructive: false },
  { id: 'download_attachment', readOnly: true, destructive: false },
  { id: 'upload_attachment', readOnly: false, destructive: false },
  { id: 'list_space_events', readOnly: true, destructive: false },
  { id: 'get_space_read_state', readOnly: true, destructive: false },
  { id: 'get_thread_read_state', readOnly: true, destructive: false },
  { id: 'update_space_read_state', readOnly: false, destructive: false },
  { id: 'get_space_notification_setting', readOnly: true, destructive: false },
  { id: 'update_space_notification_setting', readOnly: false, destructive: false },
  { id: 'list_sections', readOnly: true, destructive: false },
  { id: 'list_section_items', readOnly: true, destructive: false },
  { id: 'manage_section', readOnly: false, destructive: true },
  { id: 'move_section_item', readOnly: false, destructive: false },
  { id: 'list_custom_emojis', readOnly: true, destructive: false },
  { id: 'get_custom_emoji', readOnly: true, destructive: false },
  { id: 'manage_custom_emoji', readOnly: false, destructive: true },
  { id: 'search_spaces_admin', readOnly: true, destructive: false }
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
    AND: [
      {
        OR: [googleChatScopes.spaces, googleChatScopes.spacesReadonly, googleChatScopes.delete]
      }
    ]
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
  },
  get_space_read_state: {
    AND: [{ OR: [googleChatScopes.usersReadstateReadonly, googleChatScopes.usersReadstate] }]
  },
  get_thread_read_state: {
    AND: [{ OR: [googleChatScopes.usersReadstateReadonly, googleChatScopes.usersReadstate] }]
  },
  update_space_read_state: { AND: [{ OR: [googleChatScopes.usersReadstate] }] },
  get_space_notification_setting: { AND: [{ OR: [googleChatScopes.usersSpacesettings] }] },
  update_space_notification_setting: { AND: [{ OR: [googleChatScopes.usersSpacesettings] }] },
  list_sections: {
    AND: [{ OR: [googleChatScopes.usersSectionsReadonly, googleChatScopes.usersSections] }]
  },
  list_section_items: {
    AND: [{ OR: [googleChatScopes.usersSectionsReadonly, googleChatScopes.usersSections] }]
  },
  manage_section: { AND: [{ OR: [googleChatScopes.usersSections] }] },
  move_section_item: { AND: [{ OR: [googleChatScopes.usersSections] }] },
  list_custom_emojis: {
    AND: [{ OR: [googleChatScopes.customEmojisReadonly, googleChatScopes.customEmojis] }]
  },
  get_custom_emoji: {
    AND: [{ OR: [googleChatScopes.customEmojisReadonly, googleChatScopes.customEmojis] }]
  },
  manage_custom_emoji: { AND: [{ OR: [googleChatScopes.customEmojis] }] },
  search_spaces_admin: {
    AND: [{ OR: [googleChatScopes.adminSpacesReadonly, googleChatScopes.adminSpaces] }]
  }
} as const;

const expectedAuthMethods = {
  send_message: ['oauth', 'service_account'],
  list_messages: ['oauth'],
  search_messages: ['oauth'],
  search_conversations: ['oauth', 'service_account'],
  manage_space: ['oauth'],
  manage_message: ['oauth', 'service_account'],
  manage_reaction: ['oauth'],
  find_direct_message: ['oauth', 'service_account'],
  get_attachment: ['service_account'],
  download_attachment: ['oauth', 'service_account'],
  upload_attachment: ['oauth', 'service_account'],
  list_space_events: ['oauth'],
  get_space_read_state: ['oauth'],
  get_thread_read_state: ['oauth'],
  update_space_read_state: ['oauth'],
  get_space_notification_setting: ['oauth'],
  update_space_notification_setting: ['oauth'],
  list_sections: ['oauth'],
  list_section_items: ['oauth'],
  manage_section: ['oauth'],
  move_section_item: ['oauth'],
  list_custom_emojis: ['oauth'],
  get_custom_emoji: ['oauth'],
  manage_custom_emoji: ['oauth'],
  search_spaces_admin: ['oauth']
} as const;

describe('google-chat provider contract', () => {
  it('exposes the exact 25-tool surface with tags, scopes, auth gating, and config', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-chat',
        name: 'Google Chat',
        description:
          'Google Chat integration for spaces, memberships, messages, reactions, attachments, space events, read state, notification settings, sidebar sections, custom emoji, and admin space search.'
      },
      toolIds: [...toolIds],
      triggerIds: [],
      authMethodIds: ['oauth', 'service_account'],
      tools: [...toolContracts]
    });

    expect(contract.actions).toHaveLength(25);
    expect(tools.map(tool => tool.key)).toEqual(toolIds);
    expect(new Set(tools.map(tool => tool.key)).size).toBe(25);
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

  it('exposes the exact OAuth consent scope list and Chat app auth capabilities', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
    expect((oauth.authenticationMethod.scopes ?? []).map(scope => scope.id)).toEqual([
      googleChatScopes.messages,
      googleChatScopes.messagesReadonly,
      googleChatScopes.messagesCreate,
      googleChatScopes.spaces,
      googleChatScopes.spacesReadonly,
      googleChatScopes.delete,
      googleChatScopes.memberships,
      googleChatScopes.membershipsReadonly,
      googleChatScopes.messageReactions,
      googleChatScopes.usersReadstate,
      googleChatScopes.usersSpacesettings,
      googleChatScopes.usersSections,
      googleChatScopes.customEmojis,
      googleChatScopes.adminSpacesReadonly,
      googleChatScopes.userInfoEmail,
      googleChatScopes.userInfoProfile
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
      manageMessage: expectedScopes.manage_message,
      manageReaction: expectedScopes.manage_reaction,
      findDirectMessage: expectedScopes.find_direct_message,
      getAttachment: expectedScopes.get_attachment,
      downloadAttachment: expectedScopes.download_attachment,
      uploadAttachment: expectedScopes.upload_attachment,
      listSpaceEvents: expectedScopes.list_space_events,
      getSpaceReadState: expectedScopes.get_space_read_state,
      getThreadReadState: expectedScopes.get_thread_read_state,
      updateSpaceReadState: expectedScopes.update_space_read_state,
      getSpaceNotificationSetting: expectedScopes.get_space_notification_setting,
      updateSpaceNotificationSetting: expectedScopes.update_space_notification_setting,
      listSections: expectedScopes.list_sections,
      listSectionItems: expectedScopes.list_section_items,
      manageSection: expectedScopes.manage_section,
      moveSectionItem: expectedScopes.move_section_item,
      listCustomEmojis: expectedScopes.list_custom_emojis,
      getCustomEmoji: expectedScopes.get_custom_emoji,
      manageCustomEmoji: expectedScopes.manage_custom_emoji,
      searchSpacesAdmin: expectedScopes.search_spaces_admin
    });
    expect(googleChatActionAuthMethods).toEqual({
      sendMessage: expectedAuthMethods.send_message,
      listMessages: expectedAuthMethods.list_messages,
      searchMessages: expectedAuthMethods.search_messages,
      searchConversations: expectedAuthMethods.search_conversations,
      manageSpace: expectedAuthMethods.manage_space,
      manageMessage: expectedAuthMethods.manage_message,
      manageReaction: expectedAuthMethods.manage_reaction,
      findDirectMessage: expectedAuthMethods.find_direct_message,
      getAttachment: expectedAuthMethods.get_attachment,
      downloadAttachment: expectedAuthMethods.download_attachment,
      uploadAttachment: expectedAuthMethods.upload_attachment,
      listSpaceEvents: expectedAuthMethods.list_space_events,
      getSpaceReadState: expectedAuthMethods.get_space_read_state,
      getThreadReadState: expectedAuthMethods.get_thread_read_state,
      updateSpaceReadState: expectedAuthMethods.update_space_read_state,
      getSpaceNotificationSetting: expectedAuthMethods.get_space_notification_setting,
      updateSpaceNotificationSetting: expectedAuthMethods.update_space_notification_setting,
      listSections: expectedAuthMethods.list_sections,
      listSectionItems: expectedAuthMethods.list_section_items,
      manageSection: expectedAuthMethods.manage_section,
      moveSectionItem: expectedAuthMethods.move_section_item,
      listCustomEmojis: expectedAuthMethods.list_custom_emojis,
      getCustomEmoji: expectedAuthMethods.get_custom_emoji,
      manageCustomEmoji: expectedAuthMethods.manage_custom_emoji,
      searchSpacesAdmin: expectedAuthMethods.search_spaces_admin
    });
  });
});
