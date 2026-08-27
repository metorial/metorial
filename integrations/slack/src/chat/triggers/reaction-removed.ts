import { reactionRemoved as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { mapReactionEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatReactionRemoved = contract
  .implement(spec)
  .scopes(slackActionScopes.reactionEvents)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (
          request.kind !== 'event' ||
          request.event.type !== 'reaction_removed' ||
          request.event.item?.type !== 'message'
        )
          return;
        return mapReactionEvent(new SlackClient(ctx.auth.token), request.body, request.event);
      }),
    handleEvent: async ctx => {
      let id = getEventId(
        ctx.input.raw,
        `${ctx.input.channelId}:${ctx.input.messageId}:reaction-removed`
      );
      return {
        type: 'chat.reaction.removed',
        id,
        output: { type: 'chat.reaction.removed' as const, id, ...ctx.input }
      };
    }
  })
  .build();
