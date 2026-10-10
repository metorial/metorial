import { addReaction as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';
import { toDiscordReactionEmoji } from '../lib/emoji';

export let chatAddReaction = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let emoji = await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.message.not_found' },
      async client => {
        let emoji = toDiscordReactionEmoji(ctx.input.emoji, contract.key);
        await client.addReaction(ctx.input.channelId, ctx.input.messageId, emoji);
        return emoji;
      }
    );

    return {
      output: { ok: true, raw: { emoji } },
      message: `Added reaction to Discord message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
