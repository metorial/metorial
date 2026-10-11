import { reactionRemoved as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { messengerEventsTriggerGroup } from '../../triggers/events-trigger-group';
import { isMessengerReactionAction, mapMessengerReactionEvent } from '../lib/reactions';

export let chatReactionRemoved = contract
  .implement(spec, messengerEventsTriggerGroup)
  .matches(payload => isMessengerReactionAction(payload, 'unreact'))
  .map(async ctx => {
    let { id, ...rest } = await mapMessengerReactionEvent(ctx, ctx.input, contract.key);
    return {
      type: 'chat.reaction.removed',
      id,
      output: { type: 'chat.reaction.removed' as const, id, ...rest }
    };
  })
  .build();
