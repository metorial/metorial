import { messageDeleted as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { teamsBotTriggerGroup } from '../../triggers/botFrameworkTriggerGroup';
import { asTeamsEvent, isTeamsEventKind, resolveEventAppId } from '../lib/events';
import { mapActivityChannel, mapActivityThread } from '../lib/mappers';

// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/build-conversational-capability#receive-soft-delete-message-activity
export let chatMessageDeleted = contract
  .implement(spec, teamsBotTriggerGroup)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .matches(payload => isTeamsEventKind(payload, 'message_delete'))
  .map(async ctx => {
    let { activity } = asTeamsEvent(ctx.input);
    let channel = mapActivityChannel(activity, resolveEventAppId(ctx.auth, activity));
    let thread = mapActivityThread(activity, channel);
    let messageId = activity.id ?? '';
    let id = `${channel.id}:${messageId}:deleted`;
    return {
      type: 'chat.message.deleted',
      id,
      output: {
        type: 'chat.message.deleted' as const,
        id,
        channelId: channel.id,
        messageId,
        ...(thread ? { threadId: thread.id, thread } : {}),
        channel,
        raw: activity
      }
    };
  })
  .build();
