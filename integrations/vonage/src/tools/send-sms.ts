import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS using the Vonage SMS API (legacy). This is a simpler alternative to the Messages API for sending plain text SMS.
Uses API Key/Secret authentication and does not require a Vonage Application.`,
  instructions: [
    'Phone numbers must be in E.164 format without the + prefix (e.g., "14155550100").',
    'The "from" field can be a phone number or an alphanumeric sender ID (up to 11 characters).',
    'Long messages are automatically concatenated into multiple SMS segments.'
  ],
  constraints: [
    'SMS only - for other channels use the "Send Message" tool.',
    'Alphanumeric sender IDs are not supported in all countries.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z.string().describe('Recipient phone number in E.164 format (e.g., "14155550100")'),
      from: z.string().describe('Sender phone number or alphanumeric sender ID'),
      text: z.string().describe('The SMS text message content'),
      unicode: z
        .boolean()
        .optional()
        .describe('Set to true to send Unicode SMS (for non-Latin characters)'),
      statusReportReq: z.boolean().optional().describe('Request a delivery receipt'),
      clientRef: z
        .string()
        .optional()
        .describe('Client reference for tracking (up to 40 characters)'),
      callbackUrl: z.string().optional().describe('Webhook URL for delivery receipts')
    })
  )
  .output(
    z.object({
      messageCount: z.string().describe('Number of SMS message parts sent'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique ID for this message part'),
            to: z.string().describe('Recipient number'),
            status: z.string().describe('Status code (0 = success)'),
            remainingBalance: z.string().describe('Account balance remaining'),
            messagePrice: z.string().describe('Cost of this message'),
            network: z.string().describe('Carrier network code'),
            errorText: z
              .string()
              .optional()
              .describe('Error description if status is non-zero')
          })
        )
        .describe('Array of message parts sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.sendSms({
      to: ctx.input.to,
      from: ctx.input.from,
      text: ctx.input.text,
      type: ctx.input.unicode ? 'unicode' : undefined,
      statusReportReq: ctx.input.statusReportReq,
      clientRef: ctx.input.clientRef,
      callbackUrl: ctx.input.callbackUrl
    });

    let firstMsg = result.messages[0];
    let success = firstMsg?.status === '0';

    return {
      output: result,
      message: success
        ? `SMS sent to **${ctx.input.to}** in **${result.messageCount}** part(s). Message ID: \`${firstMsg?.messageId}\``
        : `SMS to **${ctx.input.to}** failed: ${firstMsg?.errorText || 'Unknown error'}`
    };
  })
  .build();
