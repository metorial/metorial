import {
  ChatErrors,
  getWorkspace as getWorkspaceContract,
  listWorkspaces as listWorkspacesContract,
  matchesChatQuery
} from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { ZoomChatbotClient } from '../lib/client';
import { mapZoomWorkspace } from '../lib/mappers';

// The chatbot's one account is the workspace; its token cannot read account details.
export let chatListWorkspaces = listWorkspacesContract
  .implement(spec)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .handleInvocation(async ctx => {
    let client = new ZoomChatbotClient(ctx.auth, listWorkspacesContract.key);
    let workspaces = matchesChatQuery(ctx.input.query, [client.accountId])
      ? [mapZoomWorkspace(client.accountId)]
      : [];
    return {
      output: { workspaces, raw: { accountId: client.accountId } },
      message: `Found ${workspaces.length} Zoom account workspace${workspaces.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let chatGetWorkspace = getWorkspaceContract
  .implement(spec)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .handleInvocation(async ctx => {
    let action = getWorkspaceContract.key;
    let client = new ZoomChatbotClient(ctx.auth, action);
    if (ctx.input.workspaceId !== client.accountId) {
      throw ChatErrors.workspaceNotFound({ action, workspaceId: ctx.input.workspaceId });
    }
    return {
      output: {
        workspace: mapZoomWorkspace(client.accountId),
        raw: { accountId: client.accountId }
      },
      message: `Retrieved Zoom account workspace \`${client.accountId}\`.`
    };
  })
  .build();
