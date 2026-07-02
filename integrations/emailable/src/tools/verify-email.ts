import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address in real time. Returns the deliverability state, risk score, and rich metadata including whether the address is disposable, free, or role-based, suggested corrections for misspelled addresses, name/gender inference, SMTP provider, and MX record information.`,
  constraints: [
    'Rate limited to 25 requests/second on standard plans.',
    'Enabling accept-all detection increases response time.',
    'Custom timeout range is 2-10 seconds.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify'),
      smtp: z
        .boolean()
        .optional()
        .describe(
          'Set to false to disable SMTP verification for faster results (reduces accuracy)'
        ),
      acceptAll: z
        .boolean()
        .optional()
        .describe(
          'Enable accept-all (catch-all) detection. Increases response time but improves accuracy for catch-all domains.'
        ),
      timeout: z
        .number()
        .min(2)
        .max(10)
        .optional()
        .describe('Custom timeout in seconds (2-10). Default is determined by the server.')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was verified'),
      state: z
        .string()
        .describe('Deliverability state: deliverable, undeliverable, risky, or unknown'),
      reason: z.string().describe('The reason for the associated state'),
      score: z.number().describe('Deliverability score from 0 (worst) to 100 (best)'),
      domain: z.string().describe('The domain part of the email address'),
      user: z.string().describe('The user (local) part of the email address'),
      acceptAll: z
        .boolean()
        .describe('Whether the mail server accepts all addresses regardless of validity'),
      disposable: z
        .boolean()
        .describe('Whether the email is hosted on a disposable/temporary email service'),
      free: z.boolean().describe('Whether the email is hosted by a free email provider'),
      role: z
        .boolean()
        .describe('Whether the email is a role-based address (e.g. support@, info@)'),
      mailboxFull: z.boolean().describe('Whether the mailbox is currently full'),
      noReply: z.boolean().describe('Whether this is a no-reply address'),
      didYouMean: z
        .string()
        .nullable()
        .describe('Suggested correction for misspelled email addresses'),
      firstName: z.string().nullable().describe('Inferred first name from the email address'),
      lastName: z.string().nullable().describe('Inferred last name from the email address'),
      fullName: z.string().nullable().describe('Inferred full name from the email address'),
      gender: z.string().nullable().describe('Inferred gender from the email address'),
      mxRecord: z.string().nullable().describe('The MX record address of the domain'),
      smtpProvider: z.string().nullable().describe('The SMTP provider of the email domain'),
      tag: z.string().nullable().describe('The tag part of the email (after + sign)'),
      duration: z.number().describe('Time spent verifying this email in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyEmail({
      email: ctx.input.email,
      smtp: ctx.input.smtp,
      acceptAll: ctx.input.acceptAll,
      timeout: ctx.input.timeout
    });

    let stateEmoji =
      result.state === 'deliverable'
        ? '✅'
        : result.state === 'undeliverable'
          ? '❌'
          : result.state === 'risky'
            ? '⚠️'
            : '❓';

    return {
      output: result,
      message: `${stateEmoji} **${result.email}** is **${result.state}** (score: ${result.score}/100, reason: ${result.reason})${result.didYouMean ? `\n\nDid you mean: **${result.didYouMean}**?` : ''}`
    };
  })
  .build();
