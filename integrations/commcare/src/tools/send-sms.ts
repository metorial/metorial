import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message through CommCare to a phone number. Useful for automated notifications, reminders, or follow-up messages.
Requires an SMS gateway to be configured on the CommCare project.`,
  constraints: ['Requires an SMS gateway to be configured in CommCare project settings.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Recipient phone number (include country code, e.g., "+1234567890")'),
      message: z.string().describe('The SMS message content to send')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    await client.sendSms({
      phone_number: ctx.input.phoneNumber,
      message: ctx.input.message
    });

    return {
      output: {
        success: true
      },
      message: `SMS sent to **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
