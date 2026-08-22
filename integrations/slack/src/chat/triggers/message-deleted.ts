import { messageDeleted as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getEventId, getSlackIdentity, mapSlackChannel, mapSlackThread } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatMessageDeleted = contract
  .implement(spec)
  .scopes(slackActionScopes.messageEvents)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (
          request.kind !== 'event' ||
          request.event.type !== 'message' ||
          request.event.subtype !== 'message_deleted'
        )
          return;
        let event = request.event;
        let previous = event.previous_message ?? event.message ?? {};
        let client = new SlackClient(ctx.auth.token);
        let [identity, rawChannel] = await Promise.all([
          getSlackIdentity(client),
          client.getConversationInfo(event.channel).catch(() => undefined)
        ]);
        return {
          channelId: event.channel,
          messageId: event.deleted_ts ?? previous.ts,
          threadId: previous.thread_ts,
          channel: rawChannel
            ? mapSlackChannel(rawChannel, identity.team_id ?? request.body.team_id)
            : undefined,
          thread: previous.thread_ts
            ? mapSlackThread(event.channel, previous.thread_ts, previous)
            : undefined,
          raw: request.body
        };
      }),
    handleEvent: async ctx => {
      let id = getEventId(
        ctx.input.raw,
        `${ctx.input.channelId}:${ctx.input.messageId}:deleted`
      );
      return {
        type: 'chat.message.deleted',
        id,
        output: { type: 'chat.message.deleted' as const, id, ...ctx.input }
      };
    }
  })
  .build();
