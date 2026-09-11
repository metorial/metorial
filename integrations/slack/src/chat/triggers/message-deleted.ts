import { messageDeleted as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { getEventId, getSlackIdentity, mapSlackChannel, mapSlackThread } from '../lib/mappers';

export let chatMessageDeleted = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.messageEvents)
  .matches(payload => {
    let event = payload as { type?: unknown; subtype?: unknown };
    return event.type === 'message' && event.subtype === 'message_deleted';
  })
  .map(async ctx => {
    let event = ctx.input as Record<string, any>;
    let previous = event.previous_message ?? event.message ?? {};

    let client = new SlackClient(ctx.auth.token);

    let [identity, rawChannel] = await Promise.all([
      getSlackIdentity(client),
      client.getConversationInfo(event.channel).catch(() => undefined)
    ]);

    let input = {
      channelId: event.channel,
      messageId: event.deleted_ts ?? previous.ts,
      threadId: previous.thread_ts,
      channel: rawChannel ? mapSlackChannel(rawChannel, identity.team_id) : undefined,
      thread: previous.thread_ts
        ? mapSlackThread(event.channel, previous.thread_ts, previous)
        : undefined,
      raw: event
    };

    let id = getEventId(event, `${input.channelId}:${input.messageId}:deleted`);

    return {
      type: 'chat.message.deleted',
      id,
      output: { type: 'chat.message.deleted' as const, id, ...input }
    };
  })
  .build();
