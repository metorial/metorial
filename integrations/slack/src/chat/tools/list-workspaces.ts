import { listWorkspaces as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { mapSlackWorkspace } from '../lib/mappers';

export let chatListWorkspaces = contract
  .implement(spec)
  .scopes(slackActionScopes.teamInfo)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    let raw = await client.getTeamInfo();
    let workspace = mapSlackWorkspace(raw);
    let workspaces =
      !ctx.input.query || workspace.name?.toLowerCase().includes(ctx.input.query.toLowerCase())
        ? [workspace]
        : [];
    return {
      output: { workspaces, raw },
      message: `Retrieved ${workspaces.length} Slack workspace.`
    };
  })
  .build();
