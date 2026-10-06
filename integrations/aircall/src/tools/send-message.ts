import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, phone, text } from '../lib/contracts';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send SMS/MMS',
  key: 'send_message',
  description: `Send a text message from an Aircall phone number. This retained tool does not accept media uploads. The number must be pre-configured for API-based messaging. Messages sent via API are **not** recorded or displayed in the Aircall platform.`,
  constraints: [
    'Availability and volume limits depend on number country, capability and account entitlement.',
    'Successful native pending receipt is accepted work, not delivered; callbacks determine delivery.',
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
      accepted: z.boolean().optional(),
      delivered: z.boolean().optional(),
      messageId: z.string().optional(),
      status: z.string().optional(),
      success: z
        .boolean()
        .describe('Whether Aircall accepted the request; not proof of delivery')
    })
  )
  .handleInvocation(async ctx => {
    const receipt = await new Client(ctx.auth).sendMessage(
      id(ctx.input.numberId),
      phone(ctx.input.to),
      ctx.input.content
    );
    return {
      output: {
        success: true,
        accepted: true,
        delivered: false,
        messageId: text(receipt.id, 'Native message ID'),
        status: text(receipt.status, 'Native message status')
      },
      message:
        'Aircall accepted the message request. Pending is not delivered; reconcile the native callback before any resend. This retained mode skips the Aircall inbox.'
    };
  })
  .build();
