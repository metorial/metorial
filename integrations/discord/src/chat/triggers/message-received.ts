import { messageReceived as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type DiscordGatewayEventPayload,
  discordGatewayTriggerGroup
} from '../../triggers/gateway';
import { mapMessageEvent } from '../lib/events';

// https://docs.discord.com/developers/events/gateway-events#message-create
export let chatMessageReceived = contract
  .implement(spec, discordGatewayTriggerGroup)
  .authMethods(['bot_token'])
  .matches(payload => (payload as DiscordGatewayEventPayload).eventType === 'MESSAGE_CREATE')
  .map(async ctx => {
    let payload = ctx.input as DiscordGatewayEventPayload;
    let { message, channel } = mapMessageEvent(payload);
    let id = `MESSAGE_CREATE:${message.id}`;

    return {
      type: 'chat.message.received',
      id,
      output: {
        type: 'chat.message.received' as const,
        id,
        message,
        channel,
        raw: payload.data
      }
    };
  })
  .build();
