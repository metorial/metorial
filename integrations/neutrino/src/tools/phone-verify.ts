import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { phoneVerifyResponse } from '../lib/responses';
import { spec } from '../spec';

export const phoneVerifyTool = SlateTool.create(spec, {
  key: 'phone_verify',
  name: 'Send Voice Verification',
  description:
    'Place an automated call that reads a security code for phone verification or multi-factor authentication. Verify the code with verify_security_code.',
  constraints: [
    'Calls incur provider telephony charges. A verified account is required for unrestricted calling.',
    'Only place calls to recipients who expect verification.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      number: z
        .string()
        .describe(
          'Recipient phone number in international format, or local format with countryCode'
        ),
      codeLength: z
        .number()
        .int()
        .min(4)
        .max(12)
        .optional()
        .describe('Generated code length; provider default is 6'),
      securityCode: z
        .number()
        .int()
        .optional()
        .describe('Your own numeric security code instead of a generated code'),
      playbackDelay: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Delay in milliseconds between code playbacks; provider default is 800'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO 2-letter country code for local numbers'),
      languageCode: z
        .enum(['de', 'en', 'es', 'fr', 'it', 'pt', 'ru'])
        .optional()
        .describe('Spoken language; provider default is en'),
      limit: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Maximum calls to this number within limitTtl; provider default is 3'),
      limitTtl: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .describe('Limit window in days; provider default is 1')
    })
  )
  .output(
    phoneVerifyResponse.extend({
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient(ctx.auth);
    let input = ctx.input;
    let result = await client.structured(
      '/phone-verify',
      {
        number: input.number,
        'code-length': input.codeLength,
        'security-code': input.securityCode,
        'playback-delay': input.playbackDelay,
        'country-code': input.countryCode,
        'language-code': input.languageCode,
        limit: input.limit,
        'limit-ttl': input.limitTtl
      },
      phoneVerifyResponse
    );
    return {
      output: result,
      message: result.calling
        ? `Verification call is being made to **${input.number}**.`
        : 'The provider did not start a verification call.'
    };
  })
  .build();
