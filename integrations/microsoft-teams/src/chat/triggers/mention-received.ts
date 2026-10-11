import { mentionReceived as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { teamsBotTriggerGroup } from '../../triggers/botFrameworkTriggerGroup';
import { asTeamsEvent, isTeamsEventKind, resolveEventAppId } from '../lib/events';
import { isBotMentioned, mapActivityMessage, stripMessageRelations } from '../lib/mappers';

// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations#retrieve-mentions
export let chatMentionReceived = contract
  .implement(spec, teamsBotTriggerGroup)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .matches(
    payload =>
      isTeamsEventKind(payload, 'message') &&
      isBotMentioned((payload as { activity: any }).activity)
  )
  .map(async ctx => {
    let { activity } = asTeamsEvent(ctx.input);
    let mapped = mapActivityMessage(activity, resolveEventAppId(ctx.auth, activity));
    let id = `${mapped.channelId}:${mapped.id}:mention`;
    return {
      type: 'chat.mention.received',
      id,
      output: {
        type: 'chat.mention.received' as const,
        id,
        message: stripMessageRelations(mapped),
        channel: mapped.channel,
        ...(mapped.thread ? { thread: mapped.thread } : {}),
        raw: activity
      }
    };
  })
  .build();
