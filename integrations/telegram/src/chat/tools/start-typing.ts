import { startTyping as contract } from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';
import { parseOptionalTelegramInteger } from '../lib/ids';

// https://core.telegram.org/bots/api#sendchataction
export let chatStartTyping = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let messageThreadId = parseOptionalTelegramInteger(ctx.input.threadId, 'threadId', action);
    return withTelegramChatErrors(
      { action, channelId: ctx.input.channelId, threadId: ctx.input.threadId },
      async () => {
        let ok = await new TelegramClient(ctx.auth.token).sendChatAction({
          chatId: ctx.input.channelId,
          action: 'typing',
          messageThreadId
        });
        return {
          output: { ok: ok === true, raw: { chatId: ctx.input.channelId, messageThreadId } },
          message: 'Showed the typing indicator in the Telegram chat.'
        };
      }
    );
  })
  .build();
