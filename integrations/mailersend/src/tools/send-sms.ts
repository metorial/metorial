import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send a transactional SMS message via MailerSend. Currently available for US and Canadian phone numbers only.
Supports personalization variables using {{variable}} syntax for dynamic content per recipient.`,
  instructions: [
    'Phone numbers must be in E.164 format (e.g., +12065551234).',
    'The "from" number must be a phone number registered in your MailerSend account.'
  ],
  constraints: [
    'Maximum 50 recipients per message.',
    'Maximum 2048 characters per message.',
    'Messages over 160 characters (GSM-7) or 70 characters (UCS-2) are split into segments and billed separately.',
    'Only US and Canadian phone numbers are supported.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: z
        .string()
        .describe('Sender phone number in E.164 format (must belong to your account).'),
      to: z
        .array(z.string())
        .min(1)
        .describe('Recipient phone numbers in E.164 format (1-50).'),
      text: z.string().describe('SMS message content (max 2048 characters).'),
      personalization: z
        .array(
          z.object({
            phoneNumber: z.string().describe('Recipient phone number for personalization.'),
            data: z
              .record(z.string(), z.unknown())
              .describe('Key-value pairs of personalization variables.')
          })
        )
        .optional()
        .describe('Dynamic content personalization per recipient.')
    })
  )
  .output(
    z.object({
      smsMessageId: z.string().nullable().describe('Unique SMS message ID for tracking.'),
      statusCode: z.number().describe('HTTP status code from the API.'),
      accepted: z.boolean().describe('Whether the SMS was accepted for delivery.'),
      paused: z.boolean().optional().describe('Whether sending is paused for this message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendSms({
      from: ctx.input.from,
      to: ctx.input.to,
      text: ctx.input.text,
      personalization: ctx.input.personalization?.map(p => ({
        phone_number: p.phoneNumber,
        data: p.data
      }))
    });

    let accepted = Boolean(result.smsMessageId);

    return {
      output: {
        smsMessageId: result.smsMessageId,
        statusCode: result.statusCode,
        accepted,
        paused: result.paused
      },
      message: accepted
        ? `SMS ${result.paused ? 'queued with sending paused' : 'queued'} for **${ctx.input.to.join(', ')}** (SMS ID: \`${result.smsMessageId}\`).`
        : 'The provider returned no SMS message ID. Delivery acceptance could not be confirmed.'
    };
  })
  .build();
