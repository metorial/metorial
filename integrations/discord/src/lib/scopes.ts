import { allOf, anyOf } from '@slates/provider';

let bot = 'bot';
let guilds = 'guilds';
let guildMembersRead = 'guilds.members.read';
let applicationsCommands = 'applications.commands';
let webhookIncoming = 'webhook.incoming';

let botAccess = allOf(bot);

export let discordActionScopes = {
  sendMessage: botAccess,
  manageMessages: botAccess,
  manageGuild: anyOf(guilds, bot),
  manageChannels: botAccess,
  manageMembers: anyOf(guildMembersRead, bot),
  manageInvites: botAccess,
  manageThreads: botAccess,
  manageRoles: botAccess,
  manageReactions: botAccess,
  manageWebhooks: anyOf(webhookIncoming, bot),
  getAuditLog: botAccess,
  manageScheduledEvents: botAccess,
  manageAutoModeration: botAccess,
  manageApplicationCommands: anyOf(applicationsCommands, bot),
  manageEmojis: botAccess,
  newMessage: botAccess,
  memberUpdate: anyOf(guildMembersRead, bot),
  guildUpdate: anyOf(guilds, bot),
  channelUpdate: botAccess
};
