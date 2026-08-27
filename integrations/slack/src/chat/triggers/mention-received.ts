import { mentionReceived as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { mapMessageEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatMentionReceived = contract
  .implement(spec)
  .scopes(slackActionScopes.appMentions)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (request.kind !== 'event' || request.event.type !== 'app_mention') return;
        return mapMessageEvent(
          new SlackClient(ctx.auth.token),
          request.body,
          request.event,
          true
        );
      }),
    handleEvent: async ctx => {
      let raw = ctx.input.raw as Record<string, any>;
      let enriched = await mapMessageEvent(
        new SlackClient(ctx.auth.token),
        raw,
        raw.event,
        true
      );
      let id = getEventId(raw, `${ctx.input.channelId}:${ctx.input.id}:mention`);
      return {
        type: 'chat.mention.received',
        id,
        output: {
          type: 'chat.mention.received' as const,
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
