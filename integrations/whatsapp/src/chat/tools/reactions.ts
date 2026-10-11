import {
  addReaction as addContract,
  ChatErrors,
  type EmojiInput,
  parseEmoji,
  removeReaction as removeContract
} from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createWhatsAppChatClient, type WhatsAppChatClient } from '../lib/client';
import { withWhatsAppChatErrors } from '../lib/errors';
import { toWhatsAppRecipient } from '../lib/mappers';
import { assertWhatsAppChannelId } from '../lib/outgoing';

let resolveUnicodeEmoji = (input: EmojiInput, action: string) => {
  let emoji = parseEmoji(input);
  if (emoji.type !== 'unicode' || !emoji.value) {
    throw ChatErrors.emojiNotFound({
      action,
      emoji: typeof input === 'string' ? input : emoji.type === 'custom' ? emoji.name : '',
      message: 'WhatsApp reactions accept standard Unicode emoji only.'
    });
  }
  return emoji.value;
};

// https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/reaction-messages
let sendReaction = (
  client: WhatsAppChatClient,
  input: { channelId: string; messageId: string },
  emoji: string,
  action: string
) =>
  withWhatsAppChatErrors(
    {
      action,
      channelId: input.channelId,
      messageId: input.messageId,
      ambiguous: { '131009': 'chat.message.not_found' }
    },
    () =>
      client.sendMessage(toWhatsAppRecipient(input.channelId), {
        type: 'reaction',
        reaction: { message_id: input.messageId, emoji }
      })
  );

export let chatAddReaction = addContract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = addContract.key;
    assertWhatsAppChannelId(ctx.input.channelId, action);
    let emoji = resolveUnicodeEmoji(ctx.input.emoji, action);

    let raw = await sendReaction(createWhatsAppChatClient(ctx), ctx.input, emoji, action);
    return {
      output: { ok: true, raw },
      message: `Reacted ${emoji} to WhatsApp message \`${ctx.input.messageId}\`.`
    };
  })
  .build();

// One reaction per sender and message; an empty emoji clears it.
export let chatRemoveReaction = removeContract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = removeContract.key;
    assertWhatsAppChannelId(ctx.input.channelId, action);
    resolveUnicodeEmoji(ctx.input.emoji, action);

    let raw = await sendReaction(createWhatsAppChatClient(ctx), ctx.input, '', action);
    return {
      output: { ok: true, raw },
      message: `Removed the reaction from WhatsApp message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
