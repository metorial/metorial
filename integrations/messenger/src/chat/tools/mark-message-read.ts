import { markMessageRead as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { assertMessengerPsid } from '../lib/validation';

export let chatMarkMessageRead = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let client = createMessengerChatClient(ctx, contract.key);
    assertMessengerPsid(client, ctx.input.channelId, contract.key);
    // `mark_seen` is conversation-wide; Messenger has no per-message read receipt.
    let raw = await client.senderAction({
      recipientId: ctx.input.channelId,
      action: 'mark_seen'
    });
    return {
      output: { ok: true, raw },
      message: `Marked the Messenger conversation with \`${ctx.input.channelId}\` as seen.`
    };
  })
  .build();
