import { getUser as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { mapMessengerPageAuthor, mapMessengerUserAuthor } from '../lib/mappers';

export let chatGetUser = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    if (ctx.input.userId === client.pageId) {
      let page = await client.getPage();
      return {
        output: { author: mapMessengerPageAuthor(client.pageId, page), raw: page },
        message: `Retrieved Facebook Page **${page.name ?? client.pageId}**.`
      };
    }

    // The User Profile API returns an empty object when the person has not
    // granted profile access; the author then falls back to the PSID.
    let profile = await client.getUserProfile(ctx.input.userId);
    let author = mapMessengerUserAuthor(
      ctx.input.userId,
      profile && Object.keys(profile).length > 0 ? profile : undefined
    );
    return {
      output: { author, raw: profile },
      message: `Retrieved Messenger user **${author.fullName}**.`
    };
  })
  .build();
