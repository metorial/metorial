import {
  ChatErrors,
  getWorkspace as getWorkspaceContract,
  listWorkspaces as listWorkspacesContract
} from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { ZoomChatbotClient } from '../lib/client';
import { mapZoomWorkspace } from '../lib/mappers';

/**
 * The chatbot is installed in one Zoom account, which is the chat workspace.
 * The chatbot token cannot read account details, so only the account ID is returned.
 */
export let chatListWorkspaces = listWorkspacesContract
  .implement(spec)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .handleInvocation(async ctx => {
    let client = new ZoomChatbotClient(ctx.auth, listWorkspacesContract.key);
    let query = ctx.input.query?.trim().toLowerCase();
    let workspaces =
      !query || client.accountId.toLowerCase().includes(query)
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
