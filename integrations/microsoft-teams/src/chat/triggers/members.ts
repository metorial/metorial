import {
  memberJoined as memberJoinedContract,
  memberLeft as memberLeftContract
} from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import {
  type TeamsActivityEvent,
  teamsBotTriggerGroup
} from '../../triggers/botFrameworkTriggerGroup';
import { asTeamsEvent, isTeamsEventKind, resolveEventAppId } from '../lib/events';
import { mapActivityChannel, mapTeamsAuthor } from '../lib/mappers';

// One event per member; the bot itself appears when installed or removed.
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events#members-added
let mapMember = (event: TeamsActivityEvent, auth: { appId?: string }) => {
  let { activity } = event;
  let appId = resolveEventAppId(auth, activity);
  let channel = mapActivityChannel(activity, appId);
  let member = event.member ?? { id: 'unknown' };
  return {
    channelId: channel.id,
    author: mapTeamsAuthor(member as any, appId),
    channel,
    raw: activity,
    memberId: member.id
  };
};

export let chatMemberJoined = memberJoinedContract
  .implement(spec, teamsBotTriggerGroup)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .matches(payload => isTeamsEventKind(payload, 'member_added'))
  .map(async ctx => {
    let { memberId, ...member } = mapMember(asTeamsEvent(ctx.input), ctx.auth);
    let id = `${member.channelId}:${member.raw.id ?? ''}:${memberId}:joined`;
    return {
      type: 'chat.member.joined',
      id,
      output: { type: 'chat.member.joined' as const, id, ...member }
    };
  })
  .build();

export let chatMemberLeft = memberLeftContract
  .implement(spec, teamsBotTriggerGroup)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .matches(payload => isTeamsEventKind(payload, 'member_removed'))
  .map(async ctx => {
    let { memberId, ...member } = mapMember(asTeamsEvent(ctx.input), ctx.auth);
    let id = `${member.channelId}:${member.raw.id ?? ''}:${memberId}:left`;
    return {
      type: 'chat.member.left',
      id,
      output: { type: 'chat.member.left' as const, id, ...member }
    };
  })
  .build();
