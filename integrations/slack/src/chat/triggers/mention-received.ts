import { mentionReceived as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { mapMessageEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';

export let chatMentionReceived = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.appMentions)
  .matches(payload => (payload as { type?: unknown }).type === 'app_mention')
  .map(async ctx => {
    let event = ctx.input as Record<string, any>;

    let message = await mapMessageEvent(new SlackClient(ctx.auth.token), event, event, true);

    let id = getEventId(event, `${message.channelId}:${message.id}:mention`);

    return {
      type: 'chat.mention.received',
      id,
      output: {
        type: 'chat.mention.received' as const,
        id,
        message,
        channel: message.channel,
        thread: message.thread,
        raw: event
      }
    };
  })
  .build();
