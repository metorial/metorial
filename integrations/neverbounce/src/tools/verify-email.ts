import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmailTool = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address in real time. Returns the verification result (valid, invalid, disposable, catchall, or unknown), flags indicating DNS/MX status, and a suggested correction if the email appears to have a typo. Optionally includes parsed address components and credit balance information.`,
  instructions: [
    'At the point of entry, it is suggested to allow valid, catchall, and unknown emails to proceed while blocking disposable and invalid emails.',
    'Unknown results may occur more frequently with single verification than with bulk verification.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify'),
      addressInfo: z
        .boolean()
        .optional()
        .describe('Include parsed address components (host, domain, TLD, etc.)'),
      creditsInfo: z
        .boolean()
        .optional()
        .describe('Include remaining credit balance information'),
      timeout: z
        .number()
        .optional()
        .describe('Timeout in seconds for the verification attempt')
    })
  )
  .output(
    z.object({
      result: z
        .string()
        .describe('Verification result: valid, invalid, disposable, catchall, or unknown'),
      flags: z
        .array(z.string())
        .describe('Verification flags (e.g., has_dns, has_dns_mx, smtp_connectable)'),
      suggestedCorrection: z
        .string()
        .describe('Suggested email correction if a typo was detected, empty string if none'),
      addressInfo: z
        .object({
          originalEmail: z.string(),
          normalizedEmail: z.string(),
          addr: z.string(),
          alias: z.string(),
          host: z.string(),
          fqdn: z.string(),
          domain: z.string(),
          subdomain: z.string(),
          tld: z.string()
        })
        .optional()
        .describe('Parsed address components'),
      creditsInfo: z
        .object({
          paidCreditsUsed: z.number(),
          freeCreditsUsed: z.number(),
          paidCreditsRemaining: z.number(),
          freeCreditsRemaining: z.number()
        })
        .optional()
        .describe('Credit balance information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.singleCheck({
      email: ctx.input.email,
      addressInfo: ctx.input.addressInfo,
      creditsInfo: ctx.input.creditsInfo,
      timeout: ctx.input.timeout
    });

    let correction = result.suggestedCorrection
      ? ` Suggested correction: **${result.suggestedCorrection}**`
      : '';

    return {
      output: {
        result: result.result,
        flags: result.flags,
        suggestedCorrection: result.suggestedCorrection,
        addressInfo: result.addressInfo,
        creditsInfo: result.creditsInfo
      },
      message: `Email **${ctx.input.email}** verified as **${result.result}**.${correction}`
    };
  })
  .build();
