import { ChatErrors, getWorkspace as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { mapMessengerWorkspace } from '../lib/mappers';

export let chatGetWorkspace = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    if (ctx.input.workspaceId !== client.pageId) {
      throw ChatErrors.workspaceNotFound({
        action: contract.key,
        workspaceId: ctx.input.workspaceId,
        message: 'This Messenger connection only covers its connected Facebook Page.'
      });
    }
    let page = await client.getPage();
    return {
      output: { workspace: mapMessengerWorkspace(client.pageId, page), raw: page },
      message: `Retrieved Facebook Page **${page.name ?? client.pageId}**.`
    };
  })
  .build();
