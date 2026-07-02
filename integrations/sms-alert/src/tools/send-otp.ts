import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let sendOtp = SlateTool.create(spec, {
  name: 'Send OTP',
  key: 'send_otp',
  description: `Generate and send a one-time password (OTP) via SMS for mobile number verification.
The message template must include an **[otp]** tag which will be replaced by the generated OTP. The [otp] tag supports configurable attributes for length, retry attempts, and validity period.`,
  instructions: [
    'The message must contain the [otp] tag, e.g., "Your verification code is [otp]. Valid for 15 minutes."',
    'OTP length can be 3-8 digits (default: 4).',
    'Retry allows up to 5 send attempts by default.',
    'Validity sets OTP expiry in minutes (default: 15).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      senderId: z
        .string()
        .optional()
        .describe('Sender ID for the OTP message. Falls back to configured default.'),
      mobileNumber: z
        .string()
        .describe('Mobile number to send the OTP to (with or without country code).'),
      message: z
        .string()
        .describe(
          'OTP message template. Must contain the [otp] tag, e.g., "Your OTP is [otp]".'
        ),
      otpLength: z
        .number()
        .min(3)
        .max(8)
        .optional()
        .describe('Number of digits in the OTP (3-8, default: 4).'),
      maxRetries: z.number().optional().describe('Maximum send attempts (default: 5).'),
      validityMinutes: z
        .number()
        .optional()
        .describe('OTP validity period in minutes (default: 15).'),
      route: z.string().optional().describe('SMS route to use for sending the OTP.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Detailed response including OTP verification details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });
    let senderId = ctx.input.senderId || ctx.config.senderId;

    if (!senderId) {
      throw new Error(
        'Sender ID is required. Set it in the configuration or provide it in the input.'
      );
    }

    if (!ctx.input.message.includes('[otp]')) {
      throw new Error('Message template must contain the [otp] tag.');
    }

    ctx.info(`Sending OTP to ${ctx.input.mobileNumber}`);
    let result = await client.generateOtp({
      sender: senderId,
      mobileNo: ctx.input.mobileNumber,
      text: ctx.input.message,
      otpLength: ctx.input.otpLength,
      otpRetry: ctx.input.maxRetries,
      otpValidity: ctx.input.validityMinutes,
      route: ctx.input.route
    });

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description || result
      },
      message: `OTP sent to **${ctx.input.mobileNumber}** with status: **${result.status || 'unknown'}**`
    };
  })
  .build();
