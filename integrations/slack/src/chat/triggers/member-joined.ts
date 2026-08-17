import { memberJoined as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { hydrateMemberEvent } from '../lib/event-mappers';
import { getEventId } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatMemberJoined = contract
  .implement(spec)
  .scopes(slackActionScopes.channelActivity)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (request.kind !== 'event' || request.event.type !== 'member_joined_channel') return;
        return hydrateMemberEvent(
          new SlackClient(ctx.auth.token),
          request.body,
          request.event
        );
      }),
    handleEvent: async ctx => {
      let id = getEventId(
        ctx.input.raw,
        `${ctx.input.channelId}:${ctx.input.author.userId}:joined`
      );
      return {
        type: 'chat.member.joined',
        id,
        output: { type: 'chat.member.joined' as const, id, ...ctx.input }
      };
    }
  })
  .build();
