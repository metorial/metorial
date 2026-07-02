import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validates and verifies a single email address in real time. Performs syntax validation, MX record lookup, SMTP mailbox verification, and returns a deliverability quality score.
Also detects whether the email belongs to a **free provider** (e.g., Gmail, Yahoo), a **disposable/temporary provider** (e.g., Mailinator), or is a **role-based address** (e.g., support@, info@). If a typo is detected in the domain, a "did you mean" suggestion is provided.`,
  instructions: [
    'Disabling SMTP check significantly speeds up the response but reduces verification accuracy.',
    'Enabling catch-all detection adds latency due to additional SMTP checks.'
  ],
  constraints: [
    'Validates one email address per request. Use the bulk validation tool for multiple addresses.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to validate'),
      smtp: z
        .boolean()
        .optional()
        .describe(
          'Enable SMTP verification. Enabled by default. Disable to speed up response.'
        ),
      catchAll: z
        .boolean()
        .optional()
        .describe(
          'Enable catch-all detection on the recipient SMTP server. Disabled by default.'
        )
    })
  )
  .output(
    z.object({
      email: z.string().describe('The validated email address'),
      didYouMean: z
        .string()
        .nullable()
        .describe('Suggested correction if a domain typo was detected'),
      user: z.string().nullable().describe('Local part of the email address (before @)'),
      domain: z.string().nullable().describe('Domain part of the email address (after @)'),
      formatValid: z
        .boolean()
        .nullable()
        .describe('Whether the email format is valid per RFC standards'),
      mxFound: z.boolean().nullable().describe('Whether MX records were found for the domain'),
      smtpCheck: z
        .boolean()
        .nullable()
        .describe('Whether the SMTP mailbox verification passed'),
      catchAll: z.boolean().nullable().describe('Whether the domain is a catch-all address'),
      role: z
        .boolean()
        .nullable()
        .describe('Whether the email is a role-based address (e.g., support@, info@)'),
      disposable: z
        .boolean()
        .nullable()
        .describe('Whether the email is from a disposable/temporary provider'),
      free: z
        .boolean()
        .nullable()
        .describe('Whether the email is from a free provider (e.g., Gmail, Yahoo)'),
      score: z
        .number()
        .nullable()
        .describe('Overall deliverability quality score between 0 and 1')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.validateEmail({
      email: ctx.input.email,
      smtp: ctx.input.smtp,
      catchAll: ctx.input.catchAll
    });

    let scoreSummary = result.score !== null ? ` Quality score: **${result.score}**.` : '';
    let suggestion = result.didYouMean ? ` Did you mean **${result.didYouMean}**?` : '';
    let validity = result.formatValid ? 'valid' : 'invalid';

    return {
      output: result,
      message: `Validated **${result.email}** — format is ${validity}, MX ${result.mxFound ? 'found' : 'not found'}, SMTP ${result.smtpCheck ? 'passed' : 'failed'}.${scoreSummary}${suggestion}`
    };
  })
  .build();
