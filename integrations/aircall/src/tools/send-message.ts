import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send SMS/MMS',
  key: 'send_message',
  description: `Send an SMS or MMS message from an Aircall phone number. The number must be pre-configured for API-based messaging. Messages sent via API are **not** recorded or displayed in the Aircall platform.`,
  constraints: [
    'Available only in the US, Canada, Germany, France, and Australia.',
    'Requires Aircall Professional plan.',
    'Number must be configured for API-based messaging beforehand.',
    'Messages sent via API are not visible in the Aircall app.'
  ]
})
  .input(
    z.object({
      numberId: z
        .number()
        .describe(
          'ID of the Aircall number to send from (must be configured for API messaging)'
        ),
      to: z.string().describe('Recipient phone number in E.164 format'),
      content: z.string().describe('Message text content')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.sendMessage(ctx.input.numberId, ctx.input.to, ctx.input.content);

    return {
      output: {
        success: true
      },
      message: `Sent message to **${ctx.input.to}** from number #${ctx.input.numberId}.`
    };
  })
  .build();
