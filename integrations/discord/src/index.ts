import { Slate } from '@slates/provider';
import { discordChatAdapter, discordGetFileUrl } from './chat';
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
import { discordGatewayTriggerGroup } from './triggers/gateway';
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
    manageEmojis,
    discordGetFileUrl
  ],
  adapters: [discordChatAdapter],
  triggers: [],
  triggerGroups: [discordGatewayTriggerGroup]
});
