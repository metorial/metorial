import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to a single recipient by phone number. Optionally use a pre-configured message template.
If the phone number does not match an existing contact, a new contact will be created automatically.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Recipient phone number in international format (e.g., "+380501234567")'),
      text: z
        .string()
        .optional()
        .describe('SMS message text (required if not using a template)'),
      from: z.string().optional().describe('Sender name (alpha name)'),
      templateId: z.number().optional().describe('ID of a pre-configured SMS template to use'),
      contactId: z
        .number()
        .optional()
        .describe('eSputnik contact ID to associate the message with'),
      externalCustomerId: z
        .string()
        .optional()
        .describe('External customer ID to associate the message with')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the SMS was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, any> = {
      phoneNumber: ctx.input.phoneNumber
    };

    if (ctx.input.text) payload.text = ctx.input.text;
    if (ctx.input.from) payload.from = ctx.input.from;
    if (ctx.input.templateId) payload.templateId = ctx.input.templateId;
    if (ctx.input.contactId) payload.contactId = ctx.input.contactId;
    if (ctx.input.externalCustomerId)
      payload.externalCustomerId = ctx.input.externalCustomerId;

    await client.sendSms(payload);

    return {
      output: { sent: true },
      message: `SMS sent to **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
