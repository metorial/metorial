import { getMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  buildMessageResult,
  loadChannelSafe,
  resolveDiscordIdentity,
  runDiscordChatAction
} from '../lib/context';

export let chatGetMessage = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let output = await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.message.not_found' },
      async client => {
        let [identity, raw, rawChannel] = await Promise.all([
          resolveDiscordIdentity(client, ctx.auth),
          client.getMessage(ctx.input.channelId, ctx.input.messageId),
          loadChannelSafe(client, ctx.input.channelId)
        ]);
        return buildMessageResult(raw, rawChannel, identity);
      }
    );

    return { output, message: `Retrieved Discord message \`${output.message.id}\`.` };
  })
  .build();
