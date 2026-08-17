import { getUser as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getSlackIdentity, mapSlackAuthor } from '../lib/mappers';

export let chatGetUser = contract
  .implement(spec)
  .scopes(slackActionScopes.userInfo)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let [raw, identity] = await Promise.all([
      client.getUserInfo(ctx.input.userId),
      getSlackIdentity(client)
    ]);
    return {
      output: { author: mapSlackAuthor(raw, identity), raw },
      message: `Retrieved Slack user \`${ctx.input.userId}\`.`
    };
  })
  .build();
