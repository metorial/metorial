import {
  ChatErrors,
  getAuthenticatedUser as getAuthenticatedUserContract,
  getWorkspace as getWorkspaceContract,
  listWorkspaces as listWorkspacesContract
} from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { requireTeamsBotIdentity } from '../lib/client';
import { mapTeamsBotAuthor, mapTeamsWorkspace } from '../lib/mappers';

// Teams bots have no workspace object; the bot app is exposed as one stable
// synthetic workspace whose id is stamped on every conversation.

export let chatListWorkspaces = listWorkspacesContract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let identity = requireTeamsBotIdentity(ctx.auth, listWorkspacesContract.key);
    let workspace = mapTeamsWorkspace(identity.appId, identity.botName);
    let query = ctx.input.query?.trim().toLowerCase();
    let matches =
      !query ||
      workspace.id.toLowerCase().includes(query) ||
      (workspace.name ?? '').toLowerCase().includes(query);
    let workspaces = ctx.input.cursor || !matches ? [] : [workspace];
    return {
      output: { workspaces, raw: { appId: identity.appId } },
      message: `Listed ${workspaces.length} Teams bot workspace.`
    };
  })
  .build();

export let chatGetWorkspace = getWorkspaceContract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let identity = requireTeamsBotIdentity(ctx.auth, getWorkspaceContract.key);
    let workspace = mapTeamsWorkspace(identity.appId, identity.botName);
    if (ctx.input.workspaceId !== workspace.id) {
      throw ChatErrors.workspaceNotFound({
        action: getWorkspaceContract.key,
        workspaceId: ctx.input.workspaceId
      });
    }
    return {
      output: { workspace, raw: { appId: identity.appId } },
      message: `Retrieved Teams bot workspace \`${workspace.id}\`.`
    };
  })
  .build();

export let chatGetAuthenticatedUser = getAuthenticatedUserContract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let identity = requireTeamsBotIdentity(ctx.auth, getAuthenticatedUserContract.key);
    let author = mapTeamsBotAuthor(identity.appId, identity.botName);
    return {
      output: {
        author,
        workspace: mapTeamsWorkspace(identity.appId, identity.botName),
        raw: {
          appId: identity.appId,
          ...(identity.tenantId ? { tenantId: identity.tenantId } : {})
        }
      },
      message: `Connected as Teams bot \`${author.userId}\`.`
    };
  })
  .build();
