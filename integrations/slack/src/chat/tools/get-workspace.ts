import { getWorkspace as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { mapSlackWorkspace } from '../lib/mappers';

export let chatGetWorkspace = contract
  .implement(spec)
  .scopes(slackActionScopes.teamInfo)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let raw = await client.getTeamInfo();
    if (raw.id !== ctx.input.workspaceId)
      throw new Error(`Slack workspace ${ctx.input.workspaceId} is not connected`);
    return {
      output: { workspace: mapSlackWorkspace(raw), raw },
      message: `Retrieved Slack workspace \`${raw.id}\`.`
    };
  })
  .build();
