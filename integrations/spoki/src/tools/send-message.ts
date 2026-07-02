import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Sends a one-off WhatsApp message to a contact. This is for non-templated, free-form messages only.
For bulk or template-based messaging, use **Start Automation** or **Send Template** instead.`,
  instructions: [
    "Free-form messages can only be sent within 24 hours of the customer's last message.",
    'Outside the 24-hour window, use a pre-approved template message instead.'
  ],
  constraints: [
    'Only works within the 24-hour WhatsApp conversation window.',
    'For bulk messaging, use the Start Automation tool.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe('Recipient phone number in E.164 format (e.g., +393331234567)'),
      message: z.string().describe('The message text to send'),
      firstName: z
        .string()
        .optional()
        .describe('First name of the recipient (for contact creation/update)'),
      lastName: z
        .string()
        .optional()
        .describe('Last name of the recipient (for contact creation/update)'),
      email: z
        .string()
        .optional()
        .describe('Email of the recipient (for contact creation/update)')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message'),
      status: z.string().optional().describe('Delivery status of the message'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info(`Sending message to ${ctx.input.phone}`);
    let result = await client.sendMessage({
      phone: ctx.input.phone,
      message: ctx.input.message,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email
    });

    return {
      output: {
        messageId: result?.id
          ? String(result.id)
          : result?.message_id
            ? String(result.message_id)
            : undefined,
        status: result?.status,
        raw: result
      },
      message: `Sent message to **${ctx.input.phone}**`
    };
  })
  .build();
