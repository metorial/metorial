import { messageUpdated as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { mapMessageEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatMessageUpdated = contract
  .implement(spec)
  .scopes(slackActionScopes.messageEvents)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (
          request.kind !== 'event' ||
          request.event.type !== 'message' ||
          request.event.subtype !== 'message_changed'
        )
          return;
        let message = { ...request.event.message, channel: request.event.channel };
        return mapMessageEvent(new SlackClient(ctx.auth.token), request.body, message);
      }),
    handleEvent: async ctx => {
      let raw = ctx.input.raw as Record<string, any>;
      let message = { ...raw.event.message, channel: raw.event.channel };
      let enriched = await mapMessageEvent(new SlackClient(ctx.auth.token), raw, message);
      let id = getEventId(raw, `${ctx.input.channelId}:${ctx.input.id}:updated`);
      return {
        type: 'chat.message.updated',
        id,
        output: {
          type: 'chat.message.updated' as const,
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
