import { getAuthenticatedUser as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';
import { mapAuthor } from '../lib/mappers';

// A bot can belong to many servers, so no single workspace is returned.
export let chatGetAuthenticatedUser = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let output = await runDiscordChatAction(ctx, { action: contract.key }, async client => {
      let raw = await client.getCurrentUser();
      return { author: mapAuthor(raw, { botUserId: raw.id }), raw };
    });

    return { output, message: `Authenticated as Discord bot \`${output.author.userName}\`.` };
  })
  .build();
