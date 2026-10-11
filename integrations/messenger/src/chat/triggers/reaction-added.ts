import { reactionAdded as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { messengerEventsTriggerGroup } from '../../triggers/events-trigger-group';
import { isMessengerReactionAction, mapMessengerReactionEvent } from '../lib/reactions';

export let chatReactionAdded = contract
  .implement(spec, messengerEventsTriggerGroup)
  .matches(payload => isMessengerReactionAction(payload, 'react'))
  .map(async ctx => {
    let { id, ...rest } = await mapMessengerReactionEvent(ctx, ctx.input, contract.key);
    return {
      type: 'chat.reaction.added',
      id,
      output: { type: 'chat.reaction.added' as const, id, ...rest }
    };
  })
  .build();
