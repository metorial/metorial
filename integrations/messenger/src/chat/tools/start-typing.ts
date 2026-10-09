import { startTyping as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { assertMessengerPsid } from '../lib/validation';

export let chatStartTyping = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    assertMessengerPsid(client, ctx.input.channelId, contract.key);
    // Messenger shows a typing bubble in the whole conversation; custom status
    // text and threads are not part of the sender action.
    let raw = await client.senderAction({
      recipientId: ctx.input.channelId,
      action: 'typing_on'
    });
    return {
      output: { ok: true, raw },
      message: `Showing the typing indicator to \`${ctx.input.channelId}\`.`
    };
  })
  .build();
