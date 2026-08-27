import { commandInvoked as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getEventId, getSlackIdentity, mapSlackAuthor, mapSlackChannel } from '../lib/mappers';
import { handleSlackWebhook, slackWebhookHttp } from '../lib/webhook';

export let chatCommandInvoked = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .webhook({
    http: slackWebhookHttp,
    handleRequest: ctx =>
      handleSlackWebhook(ctx, async request => {
        if (request.kind !== 'command') return;
        let payload = request.body;
        if (!payload.user_id || !payload.channel_id || !payload.command) return;
        let client = new SlackClient(ctx.auth.token);
        let [identity, user, rawChannel] = await Promise.all([
          getSlackIdentity(client),
          client.getUserInfo(payload.user_id).catch(() => undefined),
          client.getConversationInfo(payload.channel_id).catch(() => undefined)
        ]);
        return {
          name: (payload.command ?? '').replace(/^\//, ''),
          commandId: payload.api_app_id,
          text: payload.text || undefined,
          author: mapSlackAuthor(user, identity, { user: payload.user_id }),
          channelId: payload.channel_id,
          triggerId: payload.trigger_id,
          responseToken: payload.response_url,
          channel: rawChannel
            ? mapSlackChannel(rawChannel, identity.team_id ?? payload.team_id)
            : undefined,
          raw: payload
        };
      }),
    handleEvent: async ctx => {
      let id = getEventId(
        ctx.input.raw,
        `${ctx.input.channelId}:${ctx.input.triggerId ?? ctx.input.name}`
      );
      return {
        type: 'chat.command.invoked',
        id,
        output: { type: 'chat.command.invoked' as const, id, ...ctx.input }
      };
    }
  })
  .build();
