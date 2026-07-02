import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let sendOtp = SlateTool.create(spec, {
  name: 'Send OTP',
  key: 'send_otp',
  description: `Send a one-time password (OTP) to a mobile number. Supports configurable OTP length (4-9 digits), custom expiry, and optional pre-set OTP value.`,
  instructions: [
    'Mobile number must include the country code (e.g., 919XXXXXXXXX).',
    'If no custom OTP is specified, MSG91 will auto-generate one.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mobile: z.string().describe('Mobile number with country code (e.g., 919XXXXXXXXX)'),
      templateId: z.string().optional().describe('OTP template ID from the MSG91 dashboard'),
      otp: z
        .string()
        .optional()
        .describe('Custom OTP value. If omitted, MSG91 will auto-generate one'),
      otpLength: z
        .number()
        .min(4)
        .max(9)
        .optional()
        .describe('OTP length between 4 and 9 digits (default: 4)'),
      otpExpiry: z
        .number()
        .optional()
        .describe('OTP validity in minutes (default: 1440 / 1 day)'),
      sender: z.string().optional().describe('Sender ID'),
      email: z
        .string()
        .optional()
        .describe('Email address to send OTP to (for email-based OTP)')
    })
  )
  .output(
    z.object({
      type: z.string().describe('Response status type'),
      message: z.string().describe('Request ID or response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.sendOtp({
      mobile: ctx.input.mobile,
      templateId: ctx.input.templateId,
      otp: ctx.input.otp,
      otpLength: ctx.input.otpLength,
      otpExpiry: ctx.input.otpExpiry,
      sender: ctx.input.sender,
      email: ctx.input.email
    });

    return {
      output: {
        type: result.type || 'success',
        message: result.message || ''
      },
      message: `OTP sent to **${ctx.input.mobile}**. Request ID: \`${result.message}\``
    };
  })
  .build();
