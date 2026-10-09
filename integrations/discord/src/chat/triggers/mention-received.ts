import { mentionReceived as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type DiscordGatewayEventPayload,
  discordGatewayTriggerGroup
} from '../../triggers/gateway';
import { mapMessageEvent, mentionsBot } from '../lib/events';

// A message that @-mentions the bot user. The same message also fires message.received.
// https://docs.discord.com/developers/events/gateway-events#message-create
export let chatMentionReceived = contract
  .implement(spec, discordGatewayTriggerGroup)
  .authMethods(['bot_token'])
  .matches(payload => {
    let event = payload as DiscordGatewayEventPayload;
    return event.eventType === 'MESSAGE_CREATE' && mentionsBot(event);
  })
  .map(async ctx => {
    let payload = ctx.input as DiscordGatewayEventPayload;
    let { message, channel } = mapMessageEvent(payload);
    let id = `MENTION:${message.id}`;

    return {
      type: 'chat.mention.received',
      id,
      output: {
        type: 'chat.mention.received' as const,
        id,
        message,
        channel,
        raw: payload.data
      }
    };
  })
  .build();
