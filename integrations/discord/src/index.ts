import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  getAuditLogTool,
  manageApplicationCommands,
  manageAutoModerationTool,
  manageChannels,
  manageEmojis,
  manageGuild,
  manageInvites,
  manageMembers,
  manageMessages,
  manageReactions,
  manageRoles,
  manageScheduledEventsTool,
  manageThreads,
  manageWebhooks,
  sendMessage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    manageMessages,
    manageGuild,
    manageChannels,
    manageMembers,
    manageInvites,
    manageThreads,
    manageRoles,
    manageReactions,
    manageWebhooks,
    getAuditLogTool,
    manageScheduledEventsTool,
    manageAutoModerationTool,
    manageApplicationCommands,
    manageEmojis
  ],
  triggers: []
});
