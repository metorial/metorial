import { removeReaction as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';
import { toDiscordReactionEmoji } from '../lib/emoji';

// Removes the bot's own reaction.
// https://docs.discord.com/developers/resources/message#delete-own-reaction
export let chatRemoveReaction = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let emoji = await runDiscordChatAction(
      ctx,
      { action: contract.key, notFound: 'chat.message.not_found' },
      async client => {
        let emoji = toDiscordReactionEmoji(ctx.input.emoji, contract.key);
        await client.removeOwnReaction(ctx.input.channelId, ctx.input.messageId, emoji);
        return emoji;
      }
    );

    return {
      output: { ok: true, raw: { emoji } },
      message: `Removed reaction from Discord message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
