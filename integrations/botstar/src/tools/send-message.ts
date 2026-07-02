import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a formatted message to a Facebook audience user via the BotStar Public API. Supports message tags for subscription messaging compliance (CONFIRMED_EVENT_UPDATE, POST_PURCHASE_UPDATE, ACCOUNT_UPDATE).`,
  instructions: [
    'This uses the account-level Public API, not the broadcast API. For simple text broadcasts, use the "Broadcast Message" tool instead.'
  ]
})
  .input(
    z.object({
      recipientId: z.string().describe('ID of the recipient user'),
      message: z
        .record(z.string(), z.any())
        .describe('Message object to send (e.g. { "text": "Hello" })'),
      messageTag: z
        .enum(['CONFIRMED_EVENT_UPDATE', 'POST_PURCHASE_UPDATE', 'ACCOUNT_UPDATE'])
        .optional()
        .describe('Message tag for subscription messaging compliance')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('ID of the recipient'),
      messageId: z.string().describe('ID of the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let result = await client.sendMessage(
      ctx.input.recipientId,
      ctx.input.message,
      ctx.input.messageTag
    );

    return {
      output: {
        recipientId: result.recipient_id || ctx.input.recipientId,
        messageId: result.message_id || ''
      },
      message: `Sent message to recipient **${ctx.input.recipientId}**.`
    };
  })
  .build();
