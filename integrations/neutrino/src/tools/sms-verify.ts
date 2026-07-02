import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let smsVerifyTool = SlateTool.create(spec, {
  name: 'Send SMS Verification',
  key: 'sms_verify',
  description: `Send a security verification code via SMS to a phone number. Useful for two-factor authentication, phone verification, and fraud prevention. Includes built-in rate limiting per phone number to prevent abuse.`,
  constraints: [
    'Rate limited to 2 requests per second',
    'Security codes are valid for 15 minutes after being generated'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      number: z.string().describe('Phone number to send the verification code to'),
      codeLength: z
        .number()
        .optional()
        .describe('Length of the security code (4-12 digits, default 5)'),
      securityCode: z
        .number()
        .optional()
        .describe('Supply your own security code instead of auto-generating one'),
      brandName: z
        .string()
        .optional()
        .describe('Custom brand name to include in the SMS message'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO 2-letter country code for local format numbers'),
      languageCode: z.string().optional().describe('SMS language: de, en, es, fr, it, pt, ru'),
      limit: z.number().optional().describe('Maximum SMS allowed to this number (default 10)'),
      limitTtl: z
        .number()
        .optional()
        .describe('Rate limit time window in days (1-365, default 1)')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the SMS was sent successfully'),
      numberValid: z.boolean().describe('Whether the phone number is valid'),
      securityCode: z
        .string()
        .describe('The security code that was sent (use with Verify Security Code tool)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.smsVerify({
      number: ctx.input.number,
      codeLength: ctx.input.codeLength,
      securityCode: ctx.input.securityCode,
      brandName: ctx.input.brandName,
      countryCode: ctx.input.countryCode,
      languageCode: ctx.input.languageCode,
      limit: ctx.input.limit,
      limitTtl: ctx.input.limitTtl
    });

    return {
      output: {
        sent: result.sent ?? false,
        numberValid: result.numberValid ?? false,
        securityCode: result.securityCode ?? ''
      },
      message: result.sent
        ? `SMS verification code sent to **${ctx.input.number}**.`
        : `Failed to send SMS.${!result.numberValid ? ' The phone number is not valid.' : ''}`
    };
  })
  .build();
