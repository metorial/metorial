import { removeReaction as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { assertMessengerPsid } from '../lib/validation';

export let chatRemoveReaction = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    assertMessengerPsid(client, ctx.input.channelId, contract.key);
    // `unreact` removes the Page's single reaction, whichever emoji it was.
    let raw = await client.senderAction({
      recipientId: ctx.input.channelId,
      action: 'unreact',
      messageId: ctx.input.messageId,
      payload: { message_id: ctx.input.messageId }
    });
    return {
      output: { ok: true, raw },
      message: `Removed the Page's reaction from Messenger message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
