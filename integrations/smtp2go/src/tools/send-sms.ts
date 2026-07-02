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
        .describe('Array of destination phone numbers (E.164 format recommended)'),
      from: z.string().describe('Sender identifier or phone number'),
      body: z.string().describe('SMS message content')
    })
  )
  .output(
    z.object({
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

    let smsResults = (data.sms || []).map((s: any) => ({
      to: s.to ?? '',
      status: s.status ?? '',
      messageId: s.message_id ?? ''
    }));

    return {
      output: { smsResults },
      message: `SMS sent to **${ctx.input.to.length}** recipient(s).`
    };
  })
  .build();
