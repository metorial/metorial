import { messageUpdated as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { teamsBotTriggerGroup } from '../../triggers/botFrameworkTriggerGroup';
import { asTeamsEvent, isTeamsEventKind, resolveEventAppId } from '../lib/events';
import { mapActivityMessage, stripMessageRelations } from '../lib/mappers';

// Also sent as `undeleteMessage` when a deleted message is restored.
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/build-conversational-capability#receive-edit-message-activity
export let chatMessageUpdated = contract
  .implement(spec, teamsBotTriggerGroup)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .matches(payload => isTeamsEventKind(payload, 'message_update'))
  .map(async ctx => {
    let { activity } = asTeamsEvent(ctx.input);
    let mapped = mapActivityMessage(activity, resolveEventAppId(ctx.auth, activity), {
      edited: activity.channelData?.eventType !== 'undeleteMessage'
    });
    // Edits reuse the message id; the timestamp keeps them distinct.
    let id = `${mapped.channelId}:${mapped.id}:updated:${activity.timestamp ?? ''}`;
    return {
      type: 'chat.message.updated',
      id,
      output: {
        type: 'chat.message.updated' as const,
        id,
        message: stripMessageRelations(mapped),
        channel: mapped.channel,
        ...(mapped.thread ? { thread: mapped.thread } : {}),
        raw: activity
      }
    };
  })
  .build();
