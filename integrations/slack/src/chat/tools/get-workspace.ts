import { ChatErrors, getWorkspace as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { mapSlackWorkspace } from '../lib/mappers';

export let chatGetWorkspace = contract
  .implement(spec)
  .scopes(slackActionScopes.teamInfo)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    let raw = await client.getTeamInfo();
    if (raw.id !== ctx.input.workspaceId)
      throw ChatErrors.workspaceNotFound({
        action: contract.key,
        workspaceId: ctx.input.workspaceId
      });
    return {
      output: { workspace: mapSlackWorkspace(raw), raw },
      message: `Retrieved Slack workspace \`${raw.id}\`.`
    };
  })
  .build();
