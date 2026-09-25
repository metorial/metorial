import { anyOf } from 'slates';

export let googleChatScopes = {
  bot: 'https://www.googleapis.com/auth/chat.bot',
  delete: 'https://www.googleapis.com/auth/chat.delete',
  messages: 'https://www.googleapis.com/auth/chat.messages',
  messagesReadonly: 'https://www.googleapis.com/auth/chat.messages.readonly',
  messagesCreate: 'https://www.googleapis.com/auth/chat.messages.create',
  spaces: 'https://www.googleapis.com/auth/chat.spaces',
  spacesReadonly: 'https://www.googleapis.com/auth/chat.spaces.readonly',
  memberships: 'https://www.googleapis.com/auth/chat.memberships',
  membershipsReadonly: 'https://www.googleapis.com/auth/chat.memberships.readonly',
  messageReactions: 'https://www.googleapis.com/auth/chat.messages.reactions',
  usersReadstate: 'https://www.googleapis.com/auth/chat.users.readstate',
  usersReadstateReadonly: 'https://www.googleapis.com/auth/chat.users.readstate.readonly',
  usersSpacesettings: 'https://www.googleapis.com/auth/chat.users.spacesettings',
  usersSections: 'https://www.googleapis.com/auth/chat.users.sections',
  usersSectionsReadonly: 'https://www.googleapis.com/auth/chat.users.sections.readonly',
  customEmojis: 'https://www.googleapis.com/auth/chat.customemojis',
  customEmojisReadonly: 'https://www.googleapis.com/auth/chat.customemojis.readonly',
  adminSpaces: 'https://www.googleapis.com/auth/chat.admin.spaces',
  adminSpacesReadonly: 'https://www.googleapis.com/auth/chat.admin.spaces.readonly',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
} as const;

export let googleChatScopeClauses = {
  messageRead: anyOf(googleChatScopes.messages, googleChatScopes.messagesReadonly),
  messageReadAsUserOrApp: anyOf(
    googleChatScopes.messages,
    googleChatScopes.messagesReadonly,
    googleChatScopes.bot
  ),
  messageCreate: anyOf(
    googleChatScopes.messages,
    googleChatScopes.messagesCreate,
    googleChatScopes.bot
  ),
  spaceRead: anyOf(
    googleChatScopes.spaces,
    googleChatScopes.spacesReadonly,
    googleChatScopes.bot
  ),
  // manage_space covers several spaces.* methods with different requirements:
  // create/setup/update need chat.spaces, get accepts chat.spaces or
  // chat.spaces.readonly, and delete (spaces.delete, user auth) needs chat.delete.
  // Clauses gate the whole tool, so this OR lists every scope that unlocks at
  // least one action; the delete action reports a missing chat.delete grant at
  // runtime instead of blocking the other actions.
  spaceManage: anyOf(
    googleChatScopes.spaces,
    googleChatScopes.spacesReadonly,
    googleChatScopes.delete
  ),
  reactionWrite: anyOf(googleChatScopes.messageReactions, googleChatScopes.messages),
  appAttachmentRead: anyOf(googleChatScopes.bot),
  readStateRead: anyOf(
    googleChatScopes.usersReadstateReadonly,
    googleChatScopes.usersReadstate
  ),
  readStateWrite: anyOf(googleChatScopes.usersReadstate),
  spaceNotificationSetting: anyOf(googleChatScopes.usersSpacesettings),
  sectionRead: anyOf(googleChatScopes.usersSectionsReadonly, googleChatScopes.usersSections),
  sectionWrite: anyOf(googleChatScopes.usersSections),
  customEmojiRead: anyOf(googleChatScopes.customEmojisReadonly, googleChatScopes.customEmojis),
  customEmojiWrite: anyOf(googleChatScopes.customEmojis),
  // spaces.search with useAdminAccess=true accepts only the admin space scopes.
  adminSpaceSearch: anyOf(googleChatScopes.adminSpacesReadonly, googleChatScopes.adminSpaces),
  spaceEventRead: anyOf(
    googleChatScopes.messages,
    googleChatScopes.messagesReadonly,
    googleChatScopes.messageReactions,
    googleChatScopes.memberships,
    googleChatScopes.membershipsReadonly,
    googleChatScopes.spaces,
    googleChatScopes.spacesReadonly
  )
} as const;

export let googleChatActionScopes = {
  sendMessage: googleChatScopeClauses.messageCreate,
  listMessages: googleChatScopeClauses.messageRead,
  searchMessages: googleChatScopeClauses.messageRead,
  searchConversations: googleChatScopeClauses.spaceRead,
  manageSpace: googleChatScopeClauses.spaceManage,
  manageMessage: googleChatScopeClauses.messageReadAsUserOrApp,
  manageReaction: googleChatScopeClauses.reactionWrite,
  findDirectMessage: googleChatScopeClauses.spaceRead,
  getAttachment: googleChatScopeClauses.appAttachmentRead,
  downloadAttachment: googleChatScopeClauses.messageReadAsUserOrApp,
  uploadAttachment: googleChatScopeClauses.messageCreate,
  listSpaceEvents: googleChatScopeClauses.spaceEventRead,
  getSpaceReadState: googleChatScopeClauses.readStateRead,
  getThreadReadState: googleChatScopeClauses.readStateRead,
  updateSpaceReadState: googleChatScopeClauses.readStateWrite,
  getSpaceNotificationSetting: googleChatScopeClauses.spaceNotificationSetting,
  updateSpaceNotificationSetting: googleChatScopeClauses.spaceNotificationSetting,
  listSections: googleChatScopeClauses.sectionRead,
  listSectionItems: googleChatScopeClauses.sectionRead,
  manageSection: googleChatScopeClauses.sectionWrite,
  moveSectionItem: googleChatScopeClauses.sectionWrite,
  listCustomEmojis: googleChatScopeClauses.customEmojiRead,
  getCustomEmoji: googleChatScopeClauses.customEmojiRead,
  manageCustomEmoji: googleChatScopeClauses.customEmojiWrite,
  searchSpacesAdmin: googleChatScopeClauses.adminSpaceSearch
} as const;

export let googleChatActionAuthMethods = {
  sendMessage: ['oauth', 'service_account'],
  listMessages: ['oauth'],
  searchMessages: ['oauth'],
  searchConversations: ['oauth', 'service_account'],
  manageSpace: ['oauth'],
  manageMessage: ['oauth', 'service_account'],
  manageReaction: ['oauth'],
  findDirectMessage: ['oauth', 'service_account'],
  getAttachment: ['service_account'],
  downloadAttachment: ['oauth', 'service_account'],
  uploadAttachment: ['oauth', 'service_account'],
  listSpaceEvents: ['oauth'],
  // Read state, notification settings, sections, custom emoji, and admin space
  // search support user authentication only.
  getSpaceReadState: ['oauth'],
  getThreadReadState: ['oauth'],
  updateSpaceReadState: ['oauth'],
  getSpaceNotificationSetting: ['oauth'],
  updateSpaceNotificationSetting: ['oauth'],
  listSections: ['oauth'],
  listSectionItems: ['oauth'],
  manageSection: ['oauth'],
  moveSectionItem: ['oauth'],
  listCustomEmojis: ['oauth'],
  getCustomEmoji: ['oauth'],
  manageCustomEmoji: ['oauth'],
  searchSpacesAdmin: ['oauth']
};
