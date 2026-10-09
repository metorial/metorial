import { ChatErrors, sendMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import {
  mapMessengerPageAuthor,
  mapSentMessage,
  resolveMessengerChannel
} from '../lib/mappers';
import { renderMessengerText } from '../lib/render';
import { assertMessengerPsid } from '../lib/validation';

export let chatSendMessage = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let input = ctx.input;

    if (input.ephemeral) {
      throw ChatErrors.capabilityUnsupported({
        action,
        capability: 'message_send_ephemeral',
        message:
          'Messenger conversations are one-to-one; ephemeral messages are not supported.'
      });
    }
    if (input.threadId) {
      throw ChatErrors.capabilityUnsupported({
        action,
        capability: 'thread_posts',
        message:
          'Messenger conversations have no threads. Use reply to answer a specific message.'
      });
    }
    if (input.attachments?.length) {
      throw ChatErrors.attachmentUnsupportedType({
        action,
        message:
          'Messenger sends each file as its own message. Upload files separately, then send the text.'
      });
    }

    let client = createMessengerChatClient(ctx, action);
    assertMessengerPsid(client, input.channelId, action);

    let text = renderMessengerText(input, action);
    let replyToMessageId = input.reply?.id ?? input.reply?.reference?.id ?? undefined;

    let response = await client.sendText({
      recipientId: input.channelId,
      text,
      replyToMessageId
    });

    if (!response.message_id) {
      throw ChatErrors.providerError({
        action,
        message: 'Messenger accepted the message but did not return a message id.'
      });
    }

    let channel = await resolveMessengerChannel(client, input.channelId);
    let message = mapSentMessage({
      messageId: response.message_id,
      channel,
      pageAuthor: mapMessengerPageAuthor(client.pageId),
      parts: input.parts,
      text,
      replyToMessageId,
      raw: response
    });

    return {
      output: { message, channel, raw: response },
      message: `Sent Messenger message \`${response.message_id}\`.`
    };
  })
  .build();
