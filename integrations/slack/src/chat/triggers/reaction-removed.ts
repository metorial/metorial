import { reactionRemoved as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { mapReactionEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';

export let chatReactionRemoved = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.reactionEvents)
  .matches(payload => {
    let event = payload as { type?: unknown; item?: { type?: unknown } };
    return event.type === 'reaction_removed' && event.item?.type === 'message';
  })
  .map(async ctx => {
    let event = ctx.input as Record<string, any>;

    let input = await mapReactionEvent(new SlackClient(ctx.auth.token), event, event);
    let id = getEventId(event, `${input.channelId}:${input.messageId}:reaction-removed`);

    return {
      type: 'chat.reaction.removed',
      id,
      output: { type: 'chat.reaction.removed' as const, id, ...input }
    };
  })
  .build();
