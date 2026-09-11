import { memberJoined as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { hydrateMemberEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';

export let chatMemberJoined = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.channelEvents)
  .matches(payload => (payload as { type?: unknown }).type === 'member_joined_channel')
  .map(async ctx => {
    let event = ctx.input as Record<string, any>;

    let input = await hydrateMemberEvent(new SlackClient(ctx.auth.token), event, event);

    let id = getEventId(event, `${input.channelId}:${input.author.userId}:joined`);

    return {
      type: 'chat.member.joined',
      id,
      output: { type: 'chat.member.joined' as const, id, ...input }
    };
  })
  .build();
