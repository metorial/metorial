import { ChatErrors, sendMessage as contract } from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { ZoomChatbotClient } from '../lib/client';
import { withZoomChatErrors } from '../lib/errors';
import { isZoomNotificationMessageId } from '../lib/events';
import {
  mapZoomChannel,
  mapZoomSentMessage,
  mapZoomThread,
  parseZoomSentTime
} from '../lib/mappers';
import { renderZoomBody } from '../lib/render';

export let chatSendMessage = contract
  .implement(spec)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let input = ctx.input;

    if (input.ephemeral) {
      throw ChatErrors.capabilityUnsupported({
        action,
        capability: 'message_send_ephemeral',
        message: 'Ephemeral chatbot messages are not supported by this Zoom connection.'
      });
    }

    let target =
      input.threadId ??
      input.reply?.reference?.threadId ??
      input.reply?.reference?.id ??
      input.reply?.id;
    // Inbound messages have no Zoom message ID, so replies to them are sent unthreaded.
    let replyTo = isZoomNotificationMessageId(target) ? undefined : target;

    let rendered = renderZoomBody(input, action);

    return withZoomChatErrors(
      { action, channelId: input.channelId, messageId: replyTo },
      async () => {
        let client = new ZoomChatbotClient(ctx.auth, action);
        let raw = await client.sendMessage({
          toJid: input.channelId,
          content: rendered.content,
          isMarkdown: rendered.isMarkdown,
          replyTo
        });

        if (!raw.message_id) {
          throw ChatErrors.providerError({
            action,
            message: 'Zoom accepted the chatbot message but did not return its message ID.'
          });
        }

        let channelId = raw.to_jid || input.channelId;
        let message = mapZoomSentMessage({
          messageId: raw.message_id,
          channelId,
          botJid: client.botJid,
          body: { parts: input.parts, altText: input.altText },
          sentAt: parseZoomSentTime(raw.sent_time) ?? new Date().toISOString(),
          threadId: replyTo,
          raw
        });

        return {
          output: {
            message,
            channel: mapZoomChannel(channelId, client.accountId),
            thread: replyTo ? mapZoomThread(channelId, replyTo) : undefined,
            raw
          },
          message: `Sent Zoom chatbot message \`${raw.message_id}\`.`
        };
      }
    );
  })
  .build();
