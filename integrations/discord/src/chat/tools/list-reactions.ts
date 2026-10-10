import { listReactions as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';
import { mapReactions } from '../lib/mappers';

export let chatListReactions = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let output = await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.message.not_found' },
      async client => {
        let raw = await client.getMessage(ctx.input.channelId, ctx.input.messageId);
        return { reactions: mapReactions(raw.reactions), raw: raw.reactions ?? [] };
      }
    );

    return {
      output,
      message: `Retrieved ${output.reactions.length} reaction(s) on Discord message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
