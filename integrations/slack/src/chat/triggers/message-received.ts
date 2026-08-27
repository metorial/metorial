import { messageReceived as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { mapMessageEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatMessageReceived = contract
  .implement(spec)
  .scopes(slackActionScopes.messageEvents)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (request.kind !== 'event') return;
        let event = request.event;
        if (
          event.type !== 'message' ||
          ['message_changed', 'message_deleted'].includes(event.subtype)
        )
          return;
        return mapMessageEvent(new SlackClient(ctx.auth.token), request.body, event);
      }),
    handleEvent: async ctx => {
      let raw = ctx.input.raw as Record<string, any>;
      let enriched = await mapMessageEvent(new SlackClient(ctx.auth.token), raw, raw.event);
      let id = getEventId(raw, `${ctx.input.channelId}:${ctx.input.id}`);
      return {
        type: 'chat.message.received',
        id,
        output: {
          type: 'chat.message.received' as const,
          id,
          message: ctx.input,
          channel: enriched.channel,
          thread: enriched.thread,
          raw
        }
      };
    }
  })
  .build();
