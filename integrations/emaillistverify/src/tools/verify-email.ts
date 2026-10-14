import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify whether an email address is valid, deliverable, and safe to send to. Checks syntax, domain validity, MX records, mailbox existence, disposable email detection, spam trap detection, and catch-all domain detection.

Returns the provider's verification status, including **ok** (deliverable), **email_disabled**, **dead_server**, **invalid_mx**, **disposable**, **spamtrap**, **ok_for_all** (catch-all), **smtp_protocol**, **antispam_system**, **unknown**, or **invalid_syntax**.`,
  instructions: [
    'Provide the full email address to verify.',
    'The optional timeout field is retained for older API behavior; the current API does not document or guarantee it.'
  ],
  constraints: [
    'A verification costs one credit. Results that cannot be verified, such as unknown or invalid_syntax, are not charged.'
  ],
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
        .describe('Legacy timeout in seconds; the current API may ignore this value')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was verified'),
      status: z
        .string()
        .describe(
          'Provider deliverability status, such as ok, email_disabled, disposable, or unknown'
        )
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
