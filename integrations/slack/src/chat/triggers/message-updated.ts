import { messageUpdated as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { mapMessageEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';

export let chatMessageUpdated = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.messageEvents)
  .matches(payload => {
    let event = payload as { type?: unknown; subtype?: unknown };
    return event.type === 'message' && event.subtype === 'message_changed';
  })
  .map(async ctx => {
    let event = ctx.input as Record<string, any>;
    let rawMessage = { ...event.message, channel: event.channel };

    let message = await mapMessageEvent(new SlackClient(ctx.auth.token), event, rawMessage);
    let id = getEventId(event, `${message.channelId}:${message.id}:updated`);

    return {
      type: 'chat.message.updated',
      id,
      output: {
        type: 'chat.message.updated' as const,
        id,
        message,
        channel: message.channel,
        thread: message.thread,
        raw: event
      }
    };
  })
  .build();
