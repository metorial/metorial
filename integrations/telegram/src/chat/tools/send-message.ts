import { ChatErrors, sendMessage as contract } from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';
import { parseOptionalTelegramInteger } from '../lib/ids';
import { mapTelegramMessage, resolveTelegramBot } from '../lib/mappers';
import { rejectInlineAttachments, renderTelegramBody } from '../lib/render';

export let chatSendMessage = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    if (ctx.input.ephemeral) {
      throw ChatErrors.capabilityUnsupported({
        action,
        capability: 'message_send_ephemeral',
        message: 'Telegram has no messages visible to only one chat member.'
      });
    }
    rejectInlineAttachments(ctx.input, action);

    let { text, parseMode } = renderTelegramBody(ctx.input, action);
    let threadId = ctx.input.threadId ?? ctx.input.reply?.reference?.threadId;
    let replyId = ctx.input.reply?.id ?? ctx.input.reply?.reference?.id;
    let messageThreadId = parseOptionalTelegramInteger(threadId, 'threadId', action);
    let replyToMessageId = parseOptionalTelegramInteger(replyId, 'reply.id', action);

    return withTelegramChatErrors(
      { action, channelId: ctx.input.channelId, threadId, messageId: replyId },
      async () => {
        let client = new TelegramClient(ctx.auth.token);
        let bot = await resolveTelegramBot(client, ctx.auth);
        let sent = await client.sendMessage({
          chatId: ctx.input.channelId,
          text,
          parseMode,
          messageThreadId,
          replyToMessageId
        });
        let mapped = mapTelegramMessage(sent, bot);
        return {
          output: { ...mapped, raw: sent },
          message: `Sent Telegram message \`${mapped.message.id}\`.`
        };
      }
    );
  })
  .build();
