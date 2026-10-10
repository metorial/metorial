import { listWorkspaces as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { getGoogleChatAppIdentity, mapGoogleChatWorkspace } from '../lib/identity';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

export let chatListWorkspaces = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let workspace = mapGoogleChatWorkspace(getGoogleChatAppIdentity(ctx.auth, contract.key));
    let query = ctx.input.query?.trim().toLowerCase();
    let workspaces =
      !query ||
      workspace.name?.toLowerCase().includes(query) ||
      workspace.id.toLowerCase().includes(query)
        ? [workspace]
        : [];
    return {
      output: { workspaces, raw: workspace.raw },
      message: `Retrieved ${workspaces.length} Google Chat workspace(s).`
    };
  })
  .build();
