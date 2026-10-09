import {
  reactionAdded as reactionAddedContract,
  reactionRemoved as reactionRemovedContract
} from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import {
  type TeamsActivityEvent,
  teamsBotTriggerGroup
} from '../../triggers/botFrameworkTriggerGroup';
import { asTeamsEvent, isTeamsEventKind, resolveEventAppId } from '../lib/events';
import {
  mapActivityChannel,
  mapActivityThread,
  mapTeamsAuthor,
  mapTeamsReaction
} from '../lib/mappers';

// `messageReaction` activity; Teams sends it only for reactions to messages
// the bot sent, with `replyToId` naming that message:
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events#message-reaction-events
let mapReaction = (event: TeamsActivityEvent, auth: { appId?: string }) => {
  let { activity } = event;
  let appId = resolveEventAppId(auth, activity);
  let channel = mapActivityChannel(activity, appId);
  let thread = mapActivityThread(activity, channel);
  let reactionType = event.reaction?.type ?? 'unknown';
  return {
    messageId: typeof activity.replyToId === 'string' ? activity.replyToId : '',
    channelId: channel.id,
    emoji: mapTeamsReaction(reactionType),
    author: activity.from
      ? mapTeamsAuthor(activity.from as any, appId)
      : {
          userId: 'unknown',
          userName: 'unknown',
          fullName: 'unknown',
          type: 'unknown' as const,
          isMe: false
        },
    channel,
    ...(thread ? { thread } : {}),
    raw: activity,
    reactionType
  };
};

export let chatReactionAdded = reactionAddedContract
  .implement(spec, teamsBotTriggerGroup)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .matches(payload => isTeamsEventKind(payload, 'reaction_added'))
  .map(async ctx => {
    let { reactionType, ...reaction } = mapReaction(asTeamsEvent(ctx.input), ctx.auth);
    let id = `${reaction.channelId}:${reaction.raw.id ?? ''}:${reactionType}:added`;
    return {
      type: 'chat.reaction.added',
      id,
      output: { type: 'chat.reaction.added' as const, id, ...reaction }
    };
  })
  .build();

export let chatReactionRemoved = reactionRemovedContract
  .implement(spec, teamsBotTriggerGroup)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .matches(payload => isTeamsEventKind(payload, 'reaction_removed'))
  .map(async ctx => {
    let { reactionType, ...reaction } = mapReaction(asTeamsEvent(ctx.input), ctx.auth);
    let id = `${reaction.channelId}:${reaction.raw.id ?? ''}:${reactionType}:removed`;
    return {
      type: 'chat.reaction.removed',
      id,
      output: { type: 'chat.reaction.removed' as const, id, ...reaction }
    };
  })
  .build();
