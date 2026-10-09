import { getAuthenticatedUser as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { mapMessengerPageAuthor, mapMessengerWorkspace } from '../lib/mappers';

/** Messenger acts as the Facebook Page, which is also the connection's workspace. */
export let chatGetAuthenticatedUser = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    let page = await client.getPage();
    return {
      output: {
        author: mapMessengerPageAuthor(client.pageId, page),
        workspace: mapMessengerWorkspace(client.pageId, page),
        raw: page
      },
      message: `Connected as Facebook Page **${page.name ?? client.pageId}**.`
    };
  })
  .build();
