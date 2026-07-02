import { allOf, anyOf } from 'slates';

export let parseSlackGrantedScopes = (value?: string | null) =>
  (value ?? '')
    .split(/[,\s]+/)
    .map(scope => scope.trim())
    .filter(Boolean);

export let slackBotOAuthScopes = [
  { title: 'Send Messages', description: 'Send messages as the app', scope: 'chat:write' },
  {
    title: 'Send Public Messages',
    description: 'Send messages to channels the app is not a member of',
    scope: 'chat:write.public'
  },
  {
    title: 'Read Channels',
    description: 'View basic information about public channels',
    scope: 'channels:read'
  },
  {
    title: 'Manage Channels',
    description: 'Manage public channels and create new ones',
    scope: 'channels:manage'
  },
  {
    title: 'Channel History',
    description: 'View messages and content in public channels',
    scope: 'channels:history'
  },
  {
    title: 'Join Channels',
    description: 'Join public channels in a workspace',
    scope: 'channels:join'
  },
  {
    title: 'Read Private Channels',
    description: 'View basic information about private channels',
    scope: 'groups:read'
  },
  {
    title: 'Private Channel History',
    description: 'View messages and content in private channels',
    scope: 'groups:history'
  },
  {
    title: 'Write Private Channels',
    description: 'Manage private channels and create new ones',
    scope: 'groups:write'
  },
  {
    title: 'Read DMs',
    description: 'View basic information about direct messages',
    scope: 'im:read'
  },
  {
    title: 'DM History',
    description: 'View messages and content in direct messages',
    scope: 'im:history'
  },
  { title: 'Write DMs', description: 'Start direct messages with people', scope: 'im:write' },
  {
    title: 'Read Group DMs',
    description: 'View basic information about group direct messages',
    scope: 'mpim:read'
  },
  {
    title: 'Group DM History',
    description: 'View messages and content in group direct messages',
    scope: 'mpim:history'
  },
  {
    title: 'Write Group DMs',
    description: 'Start group direct messages with people',
    scope: 'mpim:write'
  },
  { title: 'Read Users', description: 'View people in a workspace', scope: 'users:read' },
  {
    title: 'Read User Emails',
    description: 'View email addresses of people in a workspace',
    scope: 'users:read.email'
  },
  {
    title: 'Read User Profile',
    description: 'View profile details about people in a workspace',
    scope: 'users.profile:read'
  },
  {
    title: 'Read Files',
    description: 'View files shared in channels and conversations',
    scope: 'files:read'
  },
  {
    title: 'Write Files',
    description: 'Upload, edit, and delete files',
    scope: 'files:write'
  },
  {
    title: 'Read Reactions',
    description: 'View emoji reactions and their associated content',
    scope: 'reactions:read'
  },
  {
    title: 'Write Reactions',
    description: 'Add and edit emoji reactions',
    scope: 'reactions:write'
  },
  { title: 'Read Pins', description: 'View pinned content in channels', scope: 'pins:read' },
  {
    title: 'Write Pins',
    description: 'Add and remove pinned messages in channels',
    scope: 'pins:write'
  },
  {
    title: 'Read Bookmarks',
    description: 'List bookmarks in channels',
    scope: 'bookmarks:read'
  },
  {
    title: 'Write Bookmarks',
    description: 'Add, edit, and remove bookmarks in channels',
    scope: 'bookmarks:write'
  },
  {
    title: 'Read User Groups',
    description: 'View user groups in a workspace',
    scope: 'usergroups:read'
  },
  {
    title: 'Write User Groups',
    description: 'Create and manage user groups',
    scope: 'usergroups:write'
  },
  {
    title: 'Read Team Info',
    description: 'View the name, email domain, and icon for workspaces',
    scope: 'team:read'
  },
  {
    title: 'Commands',
    description: 'Add shortcuts and slash commands that people can use',
    scope: 'commands'
  },
  {
    title: 'Incoming Webhooks',
    description: 'Post messages to specific channels',
    scope: 'incoming-webhook'
  }
];

export let slackUserOAuthScopes = [
  {
    title: 'Send Messages',
    description: 'Send messages as the authorized user',
    scope: 'chat:write'
  },
  {
    title: 'Read Channels',
    description: 'View basic information about public channels',
    scope: 'channels:read'
  },
  {
    title: 'Manage Public Channels',
    description: "Create, join, rename, and archive public channels on the user's behalf",
    scope: 'channels:write'
  },
  {
    title: 'Channel History',
    description: 'View messages and content in public channels',
    scope: 'channels:history'
  },
  {
    title: 'Read Private Channels',
    description: 'View basic information about private channels',
    scope: 'groups:read'
  },
  {
    title: 'Private Channel History',
    description: 'View messages and content in private channels',
    scope: 'groups:history'
  },
  {
    title: 'Write Private Channels',
    description: 'Manage private channels and create new ones',
    scope: 'groups:write'
  },
  {
    title: 'Read DMs',
    description: 'View basic information about direct messages',
    scope: 'im:read'
  },
  {
    title: 'DM History',
    description: 'View messages and content in direct messages',
    scope: 'im:history'
  },
  { title: 'Write DMs', description: 'Start direct messages with people', scope: 'im:write' },
  {
    title: 'Read Group DMs',
    description: 'View basic information about group direct messages',
    scope: 'mpim:read'
  },
  {
    title: 'Group DM History',
    description: 'View messages and content in group direct messages',
    scope: 'mpim:history'
  },
  {
    title: 'Write Group DMs',
    description: 'Start group direct messages with people',
    scope: 'mpim:write'
  },
  { title: 'Read Users', description: 'View people in a workspace', scope: 'users:read' },
  {
    title: 'Read User Emails',
    description: 'View email addresses of people in a workspace',
    scope: 'users:read.email'
  },
  {
    title: 'Read User Profile',
    description: 'View profile details about people in a workspace',
    scope: 'users.profile:read'
  },
  {
    title: 'Write User Profile',
    description: "Set and clear the authorized user's Slack status",
    scope: 'users.profile:write'
  },
  {
    title: 'Read Files',
    description: 'View files shared in channels and conversations',
    scope: 'files:read'
  },
  {
    title: 'Write Files',
    description: 'Upload, edit, and delete files',
    scope: 'files:write'
  },
  {
    title: 'Read Reactions',
    description: 'View emoji reactions and their associated content',
    scope: 'reactions:read'
  },
  {
    title: 'Write Reactions',
    description: 'Add and edit emoji reactions',
    scope: 'reactions:write'
  },
  { title: 'Read Pins', description: 'View pinned content in channels', scope: 'pins:read' },
  {
    title: 'Write Pins',
    description: 'Add and remove pinned messages in channels',
    scope: 'pins:write'
  },
  {
    title: 'Read Bookmarks',
    description: 'List bookmarks in channels',
    scope: 'bookmarks:read'
  },
  {
    title: 'Write Bookmarks',
    description: 'Add, edit, and remove bookmarks in channels',
    scope: 'bookmarks:write'
  },
  {
    title: 'Read User Groups',
    description: 'View user groups in a workspace',
    scope: 'usergroups:read'
  },
  {
    title: 'Write User Groups',
    description: 'Create and manage user groups',
    scope: 'usergroups:write'
  },
  { title: 'Read Reminders', description: 'View reminders', scope: 'reminders:read' },
  {
    title: 'Write Reminders',
    description: 'Add, remove, and mark reminders as complete',
    scope: 'reminders:write'
  },
  {
    title: 'Read Team Info',
    description: 'View the name, email domain, and icon for workspaces',
    scope: 'team:read'
  },
  {
    title: 'Search Workspace',
    description: 'Search messages and files with user-token search APIs',
    scope: 'search:read'
  }
];

let slackConversationReadScopes = allOf(
  'channels:read',
  'groups:read',
  'im:read',
  'mpim:read'
);
let slackConversationHistoryScopes = allOf(
  'channels:history',
  'groups:history',
  'im:history',
  'mpim:history'
);
let slackPublicPrivateConversationReadScopes = allOf('channels:read', 'groups:read');
let slackPublicPrivateConversationHistoryScopes = allOf('channels:history', 'groups:history');
let slackUserInfoScopes = allOf('users:read', 'users:read.email');

export let slackActionScopes = {
  chatWrite: anyOf('chat:write'),
  conversationRead: slackConversationReadScopes,
  conversationHistory: slackConversationHistoryScopes,
  channelManagement: allOf(['channels:manage', 'channels:write'], 'groups:write'),
  channelMembership: allOf(
    'channels:read',
    'groups:read',
    'im:read',
    'mpim:read',
    ['channels:manage', 'channels:write'],
    ['channels:join', 'channels:write'],
    'groups:write',
    'im:write',
    'mpim:write'
  ),
  openConversation: allOf('im:write', 'mpim:write'),
  userInfo: slackUserInfoScopes,
  reactions: allOf('reactions:read', 'reactions:write'),
  pins: allOf('pins:read', 'pins:write'),
  files: allOf('files:read', 'files:write'),
  userGroups: allOf('usergroups:read', 'usergroups:write'),
  bookmarks: allOf('bookmarks:read', 'bookmarks:write'),
  teamInfo: anyOf('team:read'),
  search: anyOf('search:read'),
  userStatus: allOf('users.profile:read', 'users.profile:write'),
  reminders: allOf('reminders:read', 'reminders:write'),
  messagePolling: allOf(slackConversationReadScopes, slackConversationHistoryScopes),
  messageEvents: slackConversationHistoryScopes,
  channelActivity: slackPublicPrivateConversationReadScopes,
  fileEvents: anyOf('files:read'),
  reactionEvents: allOf(
    slackPublicPrivateConversationReadScopes,
    slackPublicPrivateConversationHistoryScopes,
    'reactions:read'
  ),
  userChange: slackUserInfoScopes
};
