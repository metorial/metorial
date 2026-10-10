import { ChatErrors, addReaction as contract, parseEmoji } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { assertMessengerPsid } from '../lib/validation';

export let chatAddReaction = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let emoji = parseEmoji(ctx.input.emoji);
    if (emoji.type !== 'unicode') {
      throw ChatErrors.emojiNotFound({
        action,
        emoji: emoji.name,
        message: 'Messenger reactions accept Unicode emoji only.'
      });
    }

    let client = createMessengerChatClient(ctx, action);
    assertMessengerPsid(client, ctx.input.channelId, action);
    // The Page has one reaction per message; reacting again replaces it.
    let raw = await client.senderAction({
      recipientId: ctx.input.channelId,
      action: 'react',
      messageId: ctx.input.messageId,
      payload: { message_id: ctx.input.messageId, reaction: emoji.value }
    });
    return {
      output: { ok: true, raw },
      message: `Reacted ${emoji.value} to Messenger message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
