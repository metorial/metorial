import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify whether an email address is valid, deliverable, and safe to send to. Checks syntax, domain validity, MX records, mailbox existence, disposable email detection, spam trap detection, and catch-all domain detection.

Returns a verification status: **ok** (passed all tests), **fail** (failed one or more tests), **unknown** (cannot be accurately tested), or **incorrect** (syntax error or no email provided).`,
  instructions: [
    'Provide the full email address to verify.',
    'Use the optional timeout parameter to control how long the verification attempt lasts (defaults to 30 seconds).'
  ],
  constraints: ['Each verification consumes one credit from your account balance.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum seconds to attempt verification (defaults to 30)')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was verified'),
      status: z.string().describe('Verification status: ok, fail, unknown, or incorrect')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyEmail(ctx.input.email, ctx.input.timeout);

    return {
      output: {
        email: ctx.input.email,
        status: result.status
      },
      message: `Verification of **${ctx.input.email}**: status is **${result.status}**`
    };
  })
  .build();
