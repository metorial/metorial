import { messageReceived as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { mapMessageEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';

export let chatMessageReceived = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.messageEvents)
  .matches(payload => {
    let event = payload as { type?: unknown; subtype?: unknown };
    return (
      event.type === 'message' &&
      !['message_changed', 'message_deleted'].includes(String(event.subtype))
    );
  })
  .map(async ctx => {
    let event = ctx.input as Record<string, any>;

    let message = await mapMessageEvent(new SlackClient(ctx.auth.token), event, event);
    let id = getEventId(event, `${message.channelId}:${message.id}`);

    return {
      type: 'chat.message.received',
      id,
      output: {
        type: 'chat.message.received' as const,
        id,
        message,
        channel: message.channel,
        thread: message.thread,
        raw: event
      }
    };
  })
  .build();
