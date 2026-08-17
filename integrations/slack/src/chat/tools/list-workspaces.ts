import { listWorkspaces as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { mapSlackWorkspace } from '../lib/mappers';

export let chatListWorkspaces = contract
  .implement(spec)
  .scopes(slackActionScopes.teamInfo)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
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
