import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validate a single email address in real time using SendGrid's Email Validation API. Returns a verdict (Valid, Risky, or Invalid), a confidence score, and suggested corrections for typos. Useful for verifying email addresses before adding them to your contact lists or sending emails.`,
  constraints: [
    'Available only on Email API Pro and Premier plans.',
    'Requires a dedicated Email Validation API key.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to validate'),
      source: z
        .string()
        .optional()
        .describe('Source identifier for tracking validation requests')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was validated'),
      verdict: z.string().describe('Validation verdict: Valid, Risky, or Invalid'),
      score: z.number().describe('Confidence score from 0 to 1'),
      local: z.string().optional().describe('Local part of the email address'),
      host: z.string().optional().describe('Host/domain part of the email address'),
      suggestion: z
        .string()
        .optional()
        .describe('Suggested correction if a typo was detected'),
      hasValidAddressSyntax: z
        .boolean()
        .optional()
        .describe('Whether the email has valid syntax'),
      hasMxOrARecord: z
        .boolean()
        .optional()
        .describe('Whether the domain has MX or A records'),
      isSuspectedDisposableAddress: z
        .boolean()
        .optional()
        .describe('Whether the address appears disposable'),
      isSuspectedRoleAddress: z
        .boolean()
        .optional()
        .describe('Whether the address appears to be a role address (e.g. admin@)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.validateEmail(ctx.input.email, ctx.input.source);
    let r = result.result || result;

    return {
      output: {
        email: r.email || ctx.input.email,
        verdict: r.verdict || 'Unknown',
        score: r.score ?? 0,
        local: r.local || undefined,
        host: r.host || undefined,
        suggestion: r.suggestion || undefined,
        hasValidAddressSyntax:
          r.checks?.domain?.has_valid_address_syntax ??
          r.has_valid_address_syntax ??
          undefined,
        hasMxOrARecord:
          r.checks?.domain?.has_mx_or_a_record ?? r.has_mx_or_a_record ?? undefined,
        isSuspectedDisposableAddress:
          r.checks?.additional?.is_suspected_disposable_address ??
          r.is_suspected_disposable_address ??
          undefined,
        isSuspectedRoleAddress:
          r.checks?.additional?.is_suspected_role_address ??
          r.is_suspected_role_address ??
          undefined
      },
      message: `Email **${ctx.input.email}** validation result: **${r.verdict || 'Unknown'}** (score: ${r.score ?? 0})${r.suggestion ? `. Did you mean: ${r.suggestion}?` : ''}`
    };
  })
  .build();
