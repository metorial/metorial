import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address in real time. Returns detailed verification results including deliverability status, domain health, mail server validation, role/alias detection, disposable email detection, misspelled domain suggestions, and a proprietary deliverability score.

Use this to validate an email at the point of capture or to check a specific address before sending.`,
  instructions: [
    'Provide the full email address to verify, e.g. "user@example.com".',
    'The deliverability score ranges from 0 to 100, where higher values indicate better deliverability.'
  ],
  constraints: [
    'Each verification consumes one credit. Duplicate verifications of the same address within 24 hours are not charged again.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was verified'),
      status: z
        .string()
        .describe('Verification status (e.g. deliverable, undeliverable, risky, unknown)'),
      subStatus: z
        .string()
        .describe('Detailed sub-status providing more context on the verification result'),
      domain: z.string().describe('Domain part of the email address'),
      domainType: z.string().describe('Type of domain (e.g. corporate, free, disposable)'),
      isRole: z
        .boolean()
        .describe('Whether the address is a role/alias address (e.g. sales@, support@)'),
      isFree: z.boolean().describe('Whether the address uses a free email provider'),
      isDisposable: z
        .boolean()
        .describe('Whether the address uses a disposable/temporary email provider'),
      deliverabilityScore: z
        .number()
        .describe('Proprietary deliverability score from 0 to 100'),
      mxRecords: z.array(z.string()).describe('MX records found for the domain'),
      smtpProvider: z.string().describe('Detected SMTP provider for the domain'),
      suggestion: z
        .string()
        .nullable()
        .describe('Suggested correction if a misspelled domain was detected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress(`Verifying email: ${ctx.input.email}`);
    let result = await client.verifyEmail(ctx.input.email);

    let statusEmoji =
      result.status === 'deliverable'
        ? 'deliverable'
        : result.status === 'undeliverable'
          ? 'undeliverable'
          : result.status === 'risky'
            ? 'risky'
            : 'unknown';

    let message = `**${result.email}** is **${statusEmoji}** (score: ${result.deliverabilityScore}/100).`;
    if (result.suggestion) {
      message += ` Did you mean **${result.suggestion}**?`;
    }
    if (result.isRole) {
      message += ` This is a role-based address.`;
    }
    if (result.isDisposable) {
      message += ` This is a disposable email address.`;
    }

    return {
      output: result,
      message
    };
  })
  .build();
