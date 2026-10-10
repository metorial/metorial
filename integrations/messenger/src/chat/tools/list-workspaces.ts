import { listWorkspaces as contract, matchesChatQuery } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { mapMessengerWorkspace } from '../lib/mappers';

export let chatListWorkspaces = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    let page = await client.getPage();
    let workspace = mapMessengerWorkspace(client.pageId, page);
    let workspaces = matchesChatQuery(ctx.input.query, [workspace.name, workspace.id])
      ? [workspace]
      : [];
    return {
      output: { workspaces, raw: page },
      message: `Retrieved ${workspaces.length} Facebook Page workspace${workspaces.length === 1 ? '' : 's'}.`
    };
  })
  .build();
