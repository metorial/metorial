import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

export let sendVerification = SlateTool.create(spec, {
  name: 'Send Verification Code',
  key: 'send_verification',
  description: `Send a verification code (OTP) to a phone number via SMS or Telegram for identity verification and two-factor authentication. Supports configurable code length, validity period, and automatic voice failover.`,
  instructions: [
    'Use the returned requestId to check or resend the verification code',
    'PIN validity ranges from 60 to 3600 seconds (default: 300)'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z
        .string()
        .describe(
          'Recipient phone number with country code (e.g., "60123456789"), or Telegram Chat ID for Telegram channel'
        ),
      brand: z.string().describe('Brand/company name displayed in the verification message'),
      channel: z
        .enum(['sms', 'telegram'])
        .optional()
        .describe('Delivery channel (default: "sms")'),
      from: z
        .string()
        .optional()
        .describe('Sender ID displayed to recipient. Required for Telegram (bot username)'),
      codeLength: z
        .union([z.literal(4), z.literal(6)])
        .optional()
        .describe('PIN code length: 4 or 6 digits (default: 4)'),
      pinValidity: z
        .number()
        .optional()
        .describe('Code expiration in seconds (60-3600, default: 300)'),
      nextEventWait: z
        .number()
        .optional()
        .describe('Seconds before failover to next verification channel (60-900)'),
      enableNumberLookup: z
        .boolean()
        .optional()
        .describe('Check number validity before sending')
    })
  )
  .output(
    z.object({
      requestId: z
        .string()
        .optional()
        .describe('Verification request ID for checking or resending'),
      status: z.number().describe('Status code (0 = success)'),
      to: z.string().optional().describe('Recipient phone number'),
      numberReachable: z
        .string()
        .optional()
        .describe('Number reachability status if Number Lookup was enabled'),
      errorMessage: z.string().optional().describe('Error description if failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.sendVerification({
      to: ctx.input.to,
      brand: ctx.input.brand,
      channel: ctx.input.channel,
      from: ctx.input.from,
      codeLength: ctx.input.codeLength,
      pinValidity: ctx.input.pinValidity,
      nextEventWait: ctx.input.nextEventWait,
      requestNl: ctx.input.enableNumberLookup
    });

    return {
      output: {
        requestId: result.reqid,
        status: result.status,
        to: result.to,
        numberReachable: result.is_number_reachable,
        errorMessage: result.err_msg
      },
      message:
        result.status === 0
          ? `Verification code sent to **${ctx.input.to}** via **${ctx.input.channel || 'sms'}**. Request ID: **${result.reqid}**`
          : `Failed to send verification: ${result.err_msg}`
    };
  })
  .build();
