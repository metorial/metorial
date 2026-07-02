import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to one or more recipients worldwide. Supports configurable sender ID, Unicode messages, Flash SMS, scheduled delivery, and delivery report webhooks. Up to 500 recipients can be specified per request.`,
  constraints: [
    'Maximum 500 recipients per request',
    'Scheduled delivery uses GMT+8 timezone',
    'For US/Canada, a purchased Toll-Free or 10DLC number is required as the sender'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: z.string().describe('Sender ID or phone number displayed to the recipient'),
      to: z
        .string()
        .describe(
          'Recipient phone number(s) with country code (e.g., "60123456789"). Separate multiple numbers with commas'
        ),
      text: z.string().describe('Message body content'),
      encoding: z
        .enum(['gsm7', 'unicode'])
        .optional()
        .describe(
          'Character encoding: "gsm7" for standard 7-bit GSM, "unicode" for UCS2 (non-Latin characters)'
        ),
      flashSms: z
        .boolean()
        .optional()
        .describe('Send as Flash SMS (displayed immediately on screen without user action)'),
      schedule: z
        .string()
        .optional()
        .describe(
          'Schedule delivery at a specific time in "YYYY-MM-DD HH:mm:ss" format (GMT+8 timezone)'
        ),
      deliveryReportUrl: z
        .string()
        .optional()
        .describe('Webhook URL to receive delivery status reports'),
      validity: z
        .number()
        .optional()
        .describe('Message validity period in seconds before expiry')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            status: z.number().describe('Status code (0 = success)'),
            receiver: z.string().optional().describe('Recipient phone number'),
            messageId: z
              .string()
              .optional()
              .describe('Unique message identifier for tracking'),
            errorMessage: z
              .string()
              .optional()
              .describe('Error description if status is non-zero')
          })
        )
        .describe('Array of message results, one per recipient')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let codingMap: Record<string, number> = {
      gsm7: 1,
      unicode: 3
    };

    let result = await client.sendSms({
      from: ctx.input.from,
      to: ctx.input.to,
      text: ctx.input.text,
      coding: ctx.input.encoding ? codingMap[ctx.input.encoding] : undefined,
      flashSms: ctx.input.flashSms,
      schedule: ctx.input.schedule,
      dlrUrl: ctx.input.deliveryReportUrl,
      dlrMask: ctx.input.deliveryReportUrl ? 1 : undefined,
      validity: ctx.input.validity
    });

    let messages = (result.messages || []).map((msg: any) => ({
      status: msg.status,
      receiver: msg.receiver,
      messageId: msg.msgid,
      errorMessage: msg.err_msg
    }));

    let successCount = messages.filter((m: any) => m.status === 0).length;
    let failCount = messages.length - successCount;

    return {
      output: { messages },
      message: `Sent SMS from **${ctx.input.from}** to **${ctx.input.to}**. ${successCount} succeeded, ${failCount} failed.`
    };
  })
  .build();
