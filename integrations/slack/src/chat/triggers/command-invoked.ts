import { commandInvoked as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { slackEventsTriggerGroup } from '../../triggers/eventsTriggerGroup';
import { getEventId, getSlackIdentity, mapSlackAuthor, mapSlackChannel } from '../lib/mappers';

export let chatCommandInvoked = contract
  .implement(spec, slackEventsTriggerGroup)
  .scopes(slackActionScopes.chatWrite)
  .matches(payload => typeof (payload as { command?: unknown }).command === 'string')
  .map(async ctx => {
    let payload = ctx.input as Record<string, any>;
    let client = new SlackClient(ctx.auth.token);

    let [identity, user, rawChannel] = await Promise.all([
      getSlackIdentity(client),
      client.getUserInfo(payload.user_id).catch(() => undefined),
      client.getConversationInfo(payload.channel_id).catch(() => undefined)
    ]);

    let input = {
      name: payload.command.replace(/^\//, ''),
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

    let id = getEventId(payload, `${input.channelId}:${input.triggerId ?? input.name}`);

    return {
      type: 'chat.command.invoked',
      id,
      output: { type: 'chat.command.invoked' as const, id, ...input }
    };
  })
  .build();
