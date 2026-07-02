import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to a specific phone number. Returns a message ID that can be used to check delivery status later.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe('Recipient phone number in international format (e.g., "+79001234567")'),
      text: z.string().describe('SMS message text'),
      sender: z.string().optional().describe('Sender name/number (must be pre-approved)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('SMS send result including message ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let result = await client.sendSms({
      phone: ctx.input.phone,
      text: ctx.input.text,
      sender: ctx.input.sender
    });

    return {
      output: { result },
      message: `Sent SMS to **${ctx.input.phone}**`
    };
  })
  .build();
