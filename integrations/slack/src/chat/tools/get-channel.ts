import { getChannel as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getSlackIdentity, mapSlackChannel } from '../lib/mappers';

export let chatGetChannel = contract
  .implement(spec)
  .scopes(slackActionScopes.conversationRead)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let [raw, identity] = await Promise.all([
      client.getConversationInfo(ctx.input.channelId),
      getSlackIdentity(client)
    ]);
    return {
      output: { channel: mapSlackChannel(raw, identity.team_id), raw },
      message: `Retrieved Slack conversation \`${ctx.input.channelId}\`.`
    };
  })
  .build();
