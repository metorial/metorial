import { messageReceived as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { teamsBotTriggerGroup } from '../../triggers/botFrameworkTriggerGroup';
import { asTeamsEvent, isTeamsEventKind, resolveEventAppId } from '../lib/events';
import { mapActivityMessage, stripMessageRelations } from '../lib/mappers';

// `message` activity:
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/build-conversational-capability#receive-a-message-activity
export let chatMessageReceived = contract
  .implement(spec, teamsBotTriggerGroup)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .matches(payload => isTeamsEventKind(payload, 'message'))
  .map(async ctx => {
    let { activity } = asTeamsEvent(ctx.input);
    let mapped = mapActivityMessage(activity, resolveEventAppId(ctx.auth, activity));
    let id = `${mapped.channelId}:${mapped.id}`;
    return {
      type: 'chat.message.received',
      id,
      output: {
        type: 'chat.message.received' as const,
        id,
        message: stripMessageRelations(mapped),
        channel: mapped.channel,
        ...(mapped.thread ? { thread: mapped.thread } : {}),
        raw: activity
      }
    };
  })
  .build();
