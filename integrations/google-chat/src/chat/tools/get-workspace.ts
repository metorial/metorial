import { ChatErrors, getWorkspace as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { getGoogleChatAppIdentity, mapGoogleChatWorkspace } from '../lib/identity';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

export let chatGetWorkspace = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let workspace = mapGoogleChatWorkspace(getGoogleChatAppIdentity(ctx.auth, contract.key));
    if (ctx.input.workspaceId !== workspace.id) {
      throw ChatErrors.workspaceNotFound({
        action: contract.key,
        workspaceId: ctx.input.workspaceId,
        message: `This connection only serves the workspace ${workspace.id}.`
      });
    }
    return {
      output: { workspace, raw: workspace.raw },
      message: `Retrieved workspace **${workspace.name}**.`
    };
  })
  .build();
