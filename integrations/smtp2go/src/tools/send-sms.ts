import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to one or more phone numbers via SMTP2GO. Available on paid plans only; additional charges apply per message.`,
  constraints: [
    'Maximum of 100 destination phone numbers per request.',
    'Requires a paid-level plan.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of destination phone numbers (E.164 format recommended)'),
      from: z
        .string()
        .optional()
        .describe('Sender phone number in E.164 format; omit to use the default sender'),
      body: z.string().describe('SMS message content')
    })
  )
  .output(
    z.object({
      totalSent: z.number().optional().describe('Number of messages accepted by the provider'),
      statuses: z
        .record(z.string(), z.number())
        .optional()
        .describe('Message counts by status'),
      smsResults: z
        .array(
          z.object({
            to: z.string().describe('Destination phone number'),
            status: z.string().describe('Delivery status'),
            messageId: z.string().describe('Unique message identifier')
          })
        )
        .describe('Results for each recipient')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.sendSms(ctx.input);
    let data = result.data || result;

    let smsResults = (data.messages || data.sms || []).map((s: any) => ({
      to: s.destination ?? s.to ?? '',
      status: s.status ?? '',
      messageId: s.message_id ?? ''
    }));

    return {
      output: { smsResults, totalSent: data.total_sent, statuses: data.statuses },
      message: `SMS submission processed: **${data.total_sent ?? smsResults.length}** message(s) accepted.`
    };
  })
  .build();
