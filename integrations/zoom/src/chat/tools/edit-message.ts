import { editMessage as contract } from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { ZoomChatbotClient } from '../lib/client';
import { withZoomChatErrors } from '../lib/errors';
import { mapZoomChannel, mapZoomSentMessage, parseZoomSentTime } from '../lib/mappers';
import { renderZoomBody } from '../lib/render';

export let chatEditMessage = contract
  .implement(spec)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let input = ctx.input;
    let rendered = renderZoomBody(input, action);

    return withZoomChatErrors(
      { action, channelId: input.channelId, messageId: input.messageId },
      async () => {
        let client = new ZoomChatbotClient(ctx.auth, action);
        let raw = await client.editMessage({
          messageId: input.messageId,
          toJid: input.channelId,
          content: rendered.content,
          isMarkdown: rendered.isMarkdown
        });
        let editedAt = new Date().toISOString();
        let channelId = raw.to_jid || input.channelId;

        return {
          output: {
            message: mapZoomSentMessage({
              messageId: raw.message_id || input.messageId,
              channelId,
              accountId: client.accountId,
              botJid: client.botJid,
              body: { parts: input.parts, altText: input.altText },
              sentAt: parseZoomSentTime(raw.sent_time) ?? editedAt,
              edited: true,
              editedAt,
              raw
            }),
            channel: mapZoomChannel(channelId, client.accountId),
            raw
          },
          message: `Updated Zoom chatbot message \`${input.messageId}\`.`
        };
      }
    );
  })
  .build();
