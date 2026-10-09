import { markMessageRead as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createWhatsAppChatClient } from '../lib/client';
import { withWhatsAppChatErrors } from '../lib/errors';
import { assertNoWhatsAppThread, assertWhatsAppChannelId } from '../lib/outgoing';

export let chatMarkMessageRead = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    assertNoWhatsAppThread(ctx.input.threadId, action);
    assertWhatsAppChannelId(ctx.input.channelId, action);

    let client = createWhatsAppChatClient(ctx);
    let raw = await withWhatsAppChatErrors(
      {
        action,
        channelId: ctx.input.channelId,
        messageId: ctx.input.messageId,
        // An invalid or foreign wamid is reported as an invalid parameter.
        ambiguous: { '131009': 'chat.message.not_found', '100': 'chat.message.not_found' }
      },
      () => client.markRead(ctx.input.messageId)
    );

    return {
      output: { ok: raw.success === true, raw },
      message: `Marked WhatsApp message \`${ctx.input.messageId}\` as read.`
    };
  })
  .build();
