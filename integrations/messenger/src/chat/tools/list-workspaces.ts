import { listWorkspaces as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { mapMessengerWorkspace } from '../lib/mappers';

/** The connected Facebook Page is the single workspace for this connection. */
export let chatListWorkspaces = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    let page = await client.getPage();
    let workspace = mapMessengerWorkspace(client.pageId, page);
    let query = ctx.input.query?.toLowerCase();
    let workspaces =
      !query ||
      workspace.name?.toLowerCase().includes(query) ||
      workspace.id.toLowerCase().includes(query)
        ? [workspace]
        : [];
    return {
      output: { workspaces, raw: page },
      message: `Retrieved ${workspaces.length} Facebook Page workspace${workspaces.length === 1 ? '' : 's'}.`
    };
  })
  .build();
