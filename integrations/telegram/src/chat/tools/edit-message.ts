import { editMessage as contract } from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { getTelegramErrorDescription, withTelegramChatErrors } from '../lib/errors';
import { parseTelegramInteger } from '../lib/ids';
import { mapTelegramMessage, resolveTelegramBot } from '../lib/mappers';
import { rejectInlineAttachments, renderTelegramBody } from '../lib/render';

export let chatEditMessage = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    rejectInlineAttachments(ctx.input, action);
    let { text, parseMode } = renderTelegramBody(ctx.input, action);
    let messageId = parseTelegramInteger(ctx.input.messageId, 'messageId', action);

    return withTelegramChatErrors(
      { action, channelId: ctx.input.channelId, messageId: ctx.input.messageId },
      async () => {
        let client = new TelegramClient(ctx.auth.token);
        let bot = await resolveTelegramBot(client, ctx.auth);
        let edited: any;
        try {
          edited = await client.editMessageText({
            chatId: ctx.input.channelId,
            messageId,
            text,
            parseMode
          });
        } catch (error) {
          // Media messages carry a caption instead of text.
          if (
            !/no text in the message to edit/i.test(getTelegramErrorDescription(error) ?? '')
          ) {
            throw error;
          }
          edited = await client.editMessageCaption({
            chatId: ctx.input.channelId,
            messageId,
            caption: text,
            parseMode
          });
        }
        let mapped = mapTelegramMessage(edited, bot);
        return {
          output: { ...mapped, raw: edited },
          message: `Edited Telegram message \`${mapped.message.id}\`.`
        };
      }
    );
  })
  .build();
