import { getUser as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { resolveDiscordIdentity, runDiscordChatAction } from '../lib/context';
import { mapAuthor } from '../lib/mappers';

export let chatGetUser = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let output = await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.user.not_found' },
      async client => {
        let [identity, raw] = await Promise.all([
          resolveDiscordIdentity(client, ctx.auth),
          client.getUser(ctx.input.userId)
        ]);
        return { author: mapAuthor(raw, identity), raw };
      }
    );

    return { output, message: `Retrieved Discord user \`${output.author.userId}\`.` };
  })
  .build();
