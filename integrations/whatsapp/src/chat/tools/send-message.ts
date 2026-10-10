import { ChatErrors, sendMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createWhatsAppChatClient } from '../lib/client';
import { withWhatsAppChatErrors } from '../lib/errors';
import { toWhatsAppRecipient } from '../lib/mappers';
import {
  assertNoWhatsAppThread,
  assertWhatsAppChannelId,
  buildWhatsAppSentMessage,
  getSentMessageId,
  getWhatsAppBusinessInfo
} from '../lib/outgoing';
import { renderWhatsAppText } from '../lib/render';

export let chatSendMessage = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let { channelId } = ctx.input;

    if (ctx.input.ephemeral) {
      throw ChatErrors.capabilityUnsupported({
        action,
        capability: 'message_send_ephemeral',
        message: 'WhatsApp does not support ephemeral messages.'
      });
    }
    assertNoWhatsAppThread(ctx.input.threadId, action);
    assertWhatsAppChannelId(channelId, action);

    // A text message cannot carry files; they are sent through file upload.
    if (ctx.input.attachments && ctx.input.attachments.length > 0) {
      throw ChatErrors.inputInvalid({
        action,
        message:
          'WhatsApp text messages cannot carry attachments. Upload each file with the file upload action; it sends the file as its own message.',
        issues: [
          {
            path: ['attachments'],
            code: 'unsupported',
            message: 'Send files with file upload instead'
          }
        ]
      });
    }

    let text = renderWhatsAppText(ctx.input, action);
    let replyToId = ctx.input.reply?.id ?? ctx.input.reply?.reference?.id;
    let client = createWhatsAppChatClient(ctx);

    let [response, business] = await Promise.all([
      withWhatsAppChatErrors({ action, channelId, messageId: replyToId }, () =>
        client.sendMessage(toWhatsAppRecipient(channelId), {
          type: 'text',
          text: { body: text },
          ...(replyToId ? { context: { message_id: replyToId } } : {})
        })
      ),
      getWhatsAppBusinessInfo(client)
    ]);

    let messageId = getSentMessageId(response, action);
    let result = buildWhatsAppSentMessage({
      client,
      channelId,
      messageId,
      body: { parts: ctx.input.parts, altText: ctx.input.altText },
      business,
      replyToId,
      response
    });

    return {
      output: { ...result, raw: response },
      message: `Sent WhatsApp message \`${messageId}\`.`
    };
  })
  .build();
