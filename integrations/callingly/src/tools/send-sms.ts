import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to a lead. Supports personalization templates like \`{{lead.first_name}}\` and \`{{from.company}}\` with optional default fallback values (e.g., \`{{lead.first_name | default: 'there'}}\`).`,
  instructions: [
    'Both the recipient phone number and sender SMS number must be provided, preferably in E.164 format (e.g., +14801234567).',
    'Use template variables like {{lead.first_name}} or {{from.company}} for personalization.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Recipient phone number (lead), preferably in E.164 format'),
      smsNumber: z
        .string()
        .describe(
          'Sender phone number (your Callingly SMS number), preferably in E.164 format'
        ),
      message: z
        .string()
        .describe(
          "SMS message body. Supports templates like {{lead.first_name | default: 'there'}}"
        )
    })
  )
  .output(
    z.object({
      leadId: z.string().optional().describe('ID of the lead the SMS was sent to'),
      conversationId: z.string().optional().describe('ID of the SMS conversation'),
      smsId: z.string().optional().describe('ID of the sent SMS message'),
      sentAt: z.string().optional().describe('When the SMS was sent'),
      direction: z.string().optional().describe('SMS direction')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.sendSms({
      phoneNumber: ctx.input.phoneNumber,
      smsNumber: ctx.input.smsNumber,
      message: ctx.input.message
    });

    return {
      output: {
        leadId: result.lead_id ? String(result.lead_id) : undefined,
        conversationId: result.conversation_id ? String(result.conversation_id) : undefined,
        smsId: result.sms_id ? String(result.sms_id) : undefined,
        sentAt: result.sent_at,
        direction: result.direction
      },
      message: `SMS sent to **${ctx.input.phoneNumber}** from **${ctx.input.smsNumber}**.`
    };
  })
  .build();
