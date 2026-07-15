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
  membershipsApp: 'https://www.googleapis.com/auth/chat.memberships.app',
  messageReactions: 'https://www.googleapis.com/auth/chat.messages.reactions',
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
  spaceManage: anyOf(googleChatScopes.spaces, googleChatScopes.spacesReadonly),
  membershipManage: anyOf(googleChatScopes.memberships, googleChatScopes.membershipsApp),
  reactionWrite: anyOf(googleChatScopes.messageReactions, googleChatScopes.messages),
  appAttachmentRead: anyOf(googleChatScopes.bot),
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
  manageMember: googleChatScopeClauses.membershipManage,
  manageMessage: googleChatScopeClauses.messageReadAsUserOrApp,
  manageReaction: googleChatScopeClauses.reactionWrite,
  findDirectMessage: googleChatScopeClauses.spaceRead,
  getAttachment: googleChatScopeClauses.appAttachmentRead,
  downloadAttachment: googleChatScopeClauses.messageReadAsUserOrApp,
  uploadAttachment: googleChatScopeClauses.messageCreate,
  listSpaceEvents: googleChatScopeClauses.spaceEventRead
} as const;

export let googleChatActionAuthMethods = {
  sendMessage: ['oauth', 'service_account'],
  listMessages: ['oauth'],
  searchMessages: ['oauth'],
  searchConversations: ['oauth', 'service_account'],
  manageSpace: ['oauth'],
  manageMember: ['oauth'],
  manageMessage: ['oauth', 'service_account'],
  manageReaction: ['oauth'],
  findDirectMessage: ['oauth', 'service_account'],
  getAttachment: ['service_account'],
  downloadAttachment: ['oauth', 'service_account'],
  uploadAttachment: ['oauth', 'service_account'],
  listSpaceEvents: ['oauth']
};
