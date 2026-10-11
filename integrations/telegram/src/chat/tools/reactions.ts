import {
  addReaction,
  ChatErrors,
  type EmojiInput,
  parseEmoji,
  removeReaction
} from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';
import { parseTelegramInteger } from '../lib/ids';

let toTelegramReaction = (input: EmojiInput, action: string) => {
  let emoji = parseEmoji(input);
  if (emoji.type === 'unicode') return { type: 'emoji' as const, emoji: emoji.value };
  if (emoji.id) return { type: 'custom_emoji' as const, custom_emoji_id: emoji.id };
  throw ChatErrors.emojiNotFound({
    action,
    emoji: emoji.name,
    message: `Telegram reactions use Unicode emoji or a custom emoji ID; "${emoji.name}" is not recognized.`
  });
};

let emojiLabel = (input: EmojiInput) =>
  typeof input === 'string' ? input : input.type === 'unicode' ? input.value : input.name;

// Bots hold one reaction per message, so this replaces the previous one.
export let chatAddReaction = addReaction
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = addReaction.key;
    let messageId = parseTelegramInteger(ctx.input.messageId, 'messageId', action);
    let reaction = toTelegramReaction(ctx.input.emoji, action);
    return withTelegramChatErrors(
      {
        action,
        channelId: ctx.input.channelId,
        messageId: ctx.input.messageId,
        emoji: emojiLabel(ctx.input.emoji)
      },
      async () => {
        let ok = await new TelegramClient(ctx.auth.token).setMessageReaction({
          chatId: ctx.input.channelId,
          messageId,
          reaction: [reaction]
        });
        return {
          output: {
            ok: ok === true,
            raw: { chatId: ctx.input.channelId, messageId, reaction }
          },
          message: `Reacted to Telegram message \`${ctx.input.messageId}\`.`
        };
      }
    );
  })
  .build();

// Bots hold one reaction per message, so removal clears it.
export let chatRemoveReaction = removeReaction
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = removeReaction.key;
    let messageId = parseTelegramInteger(ctx.input.messageId, 'messageId', action);
    let reaction = toTelegramReaction(ctx.input.emoji, action);
    return withTelegramChatErrors(
      {
        action,
        channelId: ctx.input.channelId,
        messageId: ctx.input.messageId,
        emoji: emojiLabel(ctx.input.emoji)
      },
      async () => {
        let ok = await new TelegramClient(ctx.auth.token).setMessageReaction({
          chatId: ctx.input.channelId,
          messageId,
          reaction: []
        });
        return {
          output: {
            ok: ok === true,
            raw: { chatId: ctx.input.channelId, messageId, cleared: true, requested: reaction }
          },
          message: `Cleared the bot's reaction on Telegram message \`${ctx.input.messageId}\`.`
        };
      }
    );
  })
  .build();
