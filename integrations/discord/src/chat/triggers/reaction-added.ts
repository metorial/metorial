import { reactionAdded as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type DiscordGatewayEventPayload,
  discordGatewayTriggerGroup
} from '../../triggers/gateway';
import { mapReactionEvent, reactionEventId } from '../lib/events';

// https://docs.discord.com/developers/events/gateway-events#message-reaction-add
export let chatReactionAdded = contract
  .implement(spec, discordGatewayTriggerGroup)
  .authMethods(['bot_token'])
  .matches(
    payload => (payload as DiscordGatewayEventPayload).eventType === 'MESSAGE_REACTION_ADD'
  )
  .map(async ctx => {
    let payload = ctx.input as DiscordGatewayEventPayload;
    let id = reactionEventId(payload, 'added');

    return {
      type: 'chat.reaction.added',
      id,
      output: {
        type: 'chat.reaction.added' as const,
        id,
        ...mapReactionEvent(payload),
        raw: payload.data
      }
    };
  })
  .build();
