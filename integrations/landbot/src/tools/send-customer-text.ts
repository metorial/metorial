import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let sendCustomerTextTool = SlateTool.create(spec, {
  name: 'Send Customer Text',
  key: 'send_customer_text',
  description:
    'Send an outbound text message to an existing customer on their channel using the account API token.',
  constraints: [
    'WhatsApp free-form messages require an open 24-hour messaging window; use send_whatsapp_template outside that window.'
  ]
})
  .input(
    z.object({
      customerId: z.number().describe('Numeric customer ID from list_customers'),
      text: z.string().describe('Text message to send')
    })
  )
  .output(z.object({ customerId: z.number(), sent: z.boolean() }))
  .handleInvocation(async ctx => {
    if (!ctx.input.text.trim()) {
      throw createApiServiceError('Provide a non-empty text message.');
    }
    await new PlatformClient(ctx.auth.token).sendCustomerText(
      ctx.input.customerId,
      ctx.input.text
    );
    return {
      output: { customerId: ctx.input.customerId, sent: true },
      message: `Sent text message to customer **#${ctx.input.customerId}**.`
    };
  });
