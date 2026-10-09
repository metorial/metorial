import { messageUpdated as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type DiscordGatewayEventPayload,
  discordGatewayTriggerGroup
} from '../../triggers/gateway';
import { mapMessageEvent } from '../lib/events';

// MESSAGE_UPDATE also fires when Discord resolves link embeds; only real edits carry
// `edited_timestamp`. https://docs.discord.com/developers/events/gateway-events#message-update
export let chatMessageUpdated = contract
  .implement(spec, discordGatewayTriggerGroup)
  .authMethods(['bot_token'])
  .matches(payload => {
    let event = payload as DiscordGatewayEventPayload;
    return (
      event.eventType === 'MESSAGE_UPDATE' &&
      typeof event.data.edited_timestamp === 'string' &&
      typeof event.data.channel_id === 'string'
    );
  })
  .map(async ctx => {
    let payload = ctx.input as DiscordGatewayEventPayload;
    let { message, channel } = mapMessageEvent(payload);
    let id = `MESSAGE_UPDATE:${message.id}:${payload.data.edited_timestamp}`;

    return {
      type: 'chat.message.updated',
      id,
      output: {
        type: 'chat.message.updated' as const,
        id,
        message,
        channel,
        raw: payload.data
      }
    };
  })
  .build();
