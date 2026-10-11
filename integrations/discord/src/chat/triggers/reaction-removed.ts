import { reactionRemoved as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type DiscordGatewayEventPayload,
  discordGatewayTriggerGroup
} from '../../triggers/gateway';
import { mapReactionEvent, reactionEventId } from '../lib/events';

// The remove event carries only `user_id`, so the actor has no name.
export let chatReactionRemoved = contract
  .implement(spec, discordGatewayTriggerGroup)
  .authMethods(['bot_token'])
  .matches(
    payload => (payload as DiscordGatewayEventPayload).eventType === 'MESSAGE_REACTION_REMOVE'
  )
  .map(async ctx => {
    let payload = ctx.input as DiscordGatewayEventPayload;
    let id = reactionEventId(payload, 'removed');

    return {
      type: 'chat.reaction.removed',
      id,
      output: {
        type: 'chat.reaction.removed' as const,
        id,
        ...mapReactionEvent(payload),
        raw: payload.data
      }
    };
  })
  .build();
