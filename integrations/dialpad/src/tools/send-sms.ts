import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let sendSmsTool = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to one or more phone numbers through Dialpad. Optionally specify a sender user or group.`,
  constraints: ['Rate limited to 100-800 per minute depending on tier.']
})
  .input(
    z.object({
      toNumbers: z
        .array(z.string())
        .describe('Phone numbers to send the SMS to (E.164 format recommended)'),
      text: z.string().describe('Message text to send'),
      senderId: z.number().optional().describe('User ID to send the SMS from'),
      senderGroupType: z
        .string()
        .optional()
        .describe('Sender group type (e.g., "department", "callcenter")'),
      senderGroupId: z.number().optional().describe('Sender group ID'),
      inferCountryCode: z
        .boolean()
        .optional()
        .describe('Whether to infer country code from phone numbers')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the SMS was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    await client.sendSms({
      to_numbers: ctx.input.toNumbers,
      text: ctx.input.text,
      user_id: ctx.input.senderId,
      sender_group_type: ctx.input.senderGroupType,
      sender_group_id: ctx.input.senderGroupId,
      infer_country_code: ctx.input.inferCountryCode
    });

    return {
      output: {
        success: true
      },
      message: `Sent SMS to **${ctx.input.toNumbers.length}** recipient(s)`
    };
  })
  .build();
