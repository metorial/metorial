import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let sendSmsTool = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to one or multiple recipients. Supports single messages, 2-factor authentication codes, and bulk marketing campaigns.
For bulk sending, provide an array of phone numbers in the "recipients" field.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipients: z
        .union([
          z.string().describe('Single phone number'),
          z.array(z.string()).describe('Array of phone numbers for bulk sending')
        ])
        .describe('Phone number(s) to send the SMS to'),
      text: z.string().describe('SMS message content'),
      senderId: z.string().optional().describe('Sender ID or phone number to send from')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the SMS was successfully sent'),
      response: z.any().optional().describe('Raw API response with message details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);
    let result: any;

    if (Array.isArray(ctx.input.recipients)) {
      result = await client.sendBulkSms({
        to: ctx.input.recipients,
        text: ctx.input.text,
        from: ctx.input.senderId
      });
    } else {
      result = await client.sendSms({
        to: ctx.input.recipients,
        text: ctx.input.text,
        from: ctx.input.senderId
      });
    }

    let recipientCount = Array.isArray(ctx.input.recipients) ? ctx.input.recipients.length : 1;

    return {
      output: {
        success: true,
        response: result
      },
      message: `SMS sent to **${recipientCount}** recipient(s).`
    };
  })
  .build();
