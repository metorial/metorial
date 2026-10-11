import { messageDeleted as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type DiscordGatewayEventPayload,
  discordGatewayTriggerGroup
} from '../../triggers/gateway';
import { mapEventChannel } from '../lib/mappers';

// MESSAGE_DELETE, and each id of MESSAGE_DELETE_BULK (expanded by the gateway group).
export let chatMessageDeleted = contract
  .implement(spec, discordGatewayTriggerGroup)
  .authMethods(['bot_token'])
  .matches(payload => (payload as DiscordGatewayEventPayload).eventType === 'MESSAGE_DELETE')
  .map(async ctx => {
    let payload = ctx.input as DiscordGatewayEventPayload;
    let data = payload.data;
    let channelId = String(data.channel_id);
    let messageId = String(data.id);
    let id = `MESSAGE_DELETE:${channelId}:${messageId}`;

    return {
      type: 'chat.message.deleted',
      id,
      output: {
        type: 'chat.message.deleted' as const,
        id,
        channelId,
        messageId,
        channel: mapEventChannel({ channelId, guildId: data.guild_id }),
        raw: data
      }
    };
  })
  .build();
