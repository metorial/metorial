import { openGroupDm as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getSlackIdentity, mapSlackChannel } from '../lib/mappers';

export let chatOpenGroupDm = contract
  .implement(spec)
  .scopes(slackActionScopes.openConversation)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let result = await client.openConversation({ users: ctx.input.userIds.join(',') });
    let raw = result.channel;
    let identity = await getSlackIdentity(client);
    return {
      output: { channel: mapSlackChannel(raw, identity.team_id), raw },
      message: `Opened Slack group DM \`${raw.id}\`.`
    };
  })
  .build();
