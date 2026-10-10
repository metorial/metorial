import { deleteMessage as contract } from '@slates/adapter-chat';
import { ZOOM_CHATBOT_AUTH_METHOD } from '../../lib/authMethods';
import { spec } from '../../spec';
import { ZoomChatbotClient } from '../lib/client';
import { withZoomChatErrors } from '../lib/errors';

export let chatDeleteMessage = contract
  .implement(spec)
  .authMethods([ZOOM_CHATBOT_AUTH_METHOD])
  .handleInvocation(async ctx => {
    let action = contract.key;
    return withZoomChatErrors(
      {
        action,
        channelId: ctx.input.channelId,
        messageId: ctx.input.messageId,
        notFound: 'chat.message.not_found'
      },
      async () => {
        let client = new ZoomChatbotClient(ctx.auth, action);
        // The chatbot delete endpoint is addressed by message ID; channelId is not sent.
        let raw = await client.deleteMessage(ctx.input.messageId);
        return {
          output: { ok: true, raw },
          message: `Deleted Zoom chatbot message \`${ctx.input.messageId}\`.`
        };
      }
    );
  })
  .build();
