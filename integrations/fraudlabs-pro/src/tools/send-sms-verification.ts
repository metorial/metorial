import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSmsVerification = SlateTool.create(spec, {
  name: 'Send SMS Verification',
  key: 'send_sms_verification',
  description: `Sends an SMS with a one-time password (OTP) to a phone number for identity verification. Returns a transaction ID needed to later verify the OTP the recipient enters.`,
  instructions: [
    'The phone number must be in E.164 format (e.g., +12015550123).',
    'Include `<otp>` as a placeholder in the message template where the OTP code should appear.',
    'The default OTP timeout is 3600 seconds (1 hour). You can customize it between 15 and 86400 seconds.'
  ],
  constraints: [
    'Each SMS sent deducts 1 SMS credit from your account.',
    'A 24-hour cooldown applies if SMS delivery fails 10 times in a day.',
    'Message template maximum length is 140 characters.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Recipient phone number in E.164 format (e.g., +12015550123)'),
      messageTemplate: z
        .string()
        .describe(
          'SMS message template with <otp> placeholder for the generated code (max 140 chars)'
        ),
      countryCode: z
        .string()
        .optional()
        .describe('ISO 3166 country code for basic phone number validation'),
      otpTimeout: z
        .number()
        .optional()
        .describe('OTP expiration duration in seconds (15-86400, default 3600)')
    })
  )
  .output(
    z.object({
      smsTransactionId: z.string().describe('Transaction ID to use when verifying the OTP'),
      creditsRemaining: z.string().optional().describe('Remaining SMS credits in your account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.info(`Sending SMS verification to ${ctx.input.phoneNumber}...`);

    let result = await client.sendSmsVerification({
      phoneNumber: ctx.input.phoneNumber,
      messageTemplate: ctx.input.messageTemplate,
      countryCode: ctx.input.countryCode,
      otpTimeout: ctx.input.otpTimeout
    });

    let output = {
      smsTransactionId: result.tran_id,
      creditsRemaining: result.credits_remaining
    };

    return {
      output,
      message: `SMS verification sent to **${ctx.input.phoneNumber}**. Transaction ID: \`${output.smsTransactionId}\`. Credits remaining: ${output.creditsRemaining}.`
    };
  })
  .build();
