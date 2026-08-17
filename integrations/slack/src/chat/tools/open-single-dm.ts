import { openSingleDm as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getSlackIdentity, mapSlackChannel } from '../lib/mappers';

export let chatOpenSingleDm = contract
  .implement(spec)
  .scopes(slackActionScopes.openConversation)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let result = await client.openConversation({ users: ctx.input.userId });
    let raw = result.channel;
    let identity = await getSlackIdentity(client);
    return {
      output: { channel: mapSlackChannel(raw, identity.team_id), raw },
      message: `Opened Slack DM \`${raw.id}\`.`
    };
  })
  .build();
