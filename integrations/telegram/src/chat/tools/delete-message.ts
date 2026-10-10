import { deleteMessage as contract } from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';
import { parseTelegramInteger } from '../lib/ids';

export let chatDeleteMessage = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let messageId = parseTelegramInteger(ctx.input.messageId, 'messageId', action);
    return withTelegramChatErrors(
      { action, channelId: ctx.input.channelId, messageId: ctx.input.messageId },
      async () => {
        let ok = await new TelegramClient(ctx.auth.token).deleteMessage({
          chatId: ctx.input.channelId,
          messageId
        });
        return {
          output: { ok: ok === true, raw: { chatId: ctx.input.channelId, messageId } },
          message: `Deleted Telegram message \`${ctx.input.messageId}\`.`
        };
      }
    );
  })
  .build();
