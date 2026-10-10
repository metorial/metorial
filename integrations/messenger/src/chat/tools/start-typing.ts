import { startTyping as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { assertMessengerPsid } from '../lib/validation';

export let chatStartTyping = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    assertMessengerPsid(client, ctx.input.channelId, contract.key);
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
