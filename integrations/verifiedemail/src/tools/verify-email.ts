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
  constraints: ['Verification can consume account credits.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().min(1).describe('The email address to verify')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was verified'),
      status: z
        .string()
        .describe(
          'Provider verification result, such as deliverable, malformed, nonexistent, full, or unknown'
        ),
      subStatus: z
        .string()
        .describe('Detailed sub-status providing more context on the verification result'),
      domain: z.string().describe('Domain part of the email address'),
      domainType: z
        .string()
        .optional()
        .describe('Type of domain (e.g. corporate, free, disposable)'),
      isRole: z
        .boolean()
        .describe('Whether the address is a role-based address (e.g. sales@, support@)'),
      isFree: z
        .boolean()
        .optional()
        .describe('Whether the address uses a free email provider'),
      isDisposable: z
        .boolean()
        .optional()
        .describe('Whether the address uses a disposable/temporary email provider'),
      deliverabilityScore: z
        .number()
        .optional()
        .describe('Proprietary deliverability score from 0 to 100'),
      mxRecords: z.array(z.string()).optional().describe('MX records found for the domain'),
      smtpProvider: z.string().optional().describe('Detected SMTP provider for the domain'),
      suggestion: z
        .string()
        .nullable()
        .optional()
        .describe('Suggested correction if a misspelled domain was detected'),
      result: z.string().optional().describe('Original provider verification result'),
      score: z.number().optional().describe('Original provider score'),
      role: z.string().nullable().optional().describe('Detected email role'),
      alias: z.string().nullable().optional().describe('Detected email alias'),
      canonical: z.string().nullable().optional().describe('Canonical email address'),
      isMX: z.boolean().nullable().optional().describe('Whether the domain has MX records'),
      isCatchAll: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the domain is catch-all'),
      dateLastVerified: z
        .string()
        .nullable()
        .optional()
        .describe('Last verification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress(`Verifying email: ${ctx.input.email}`);
    let result = await client.verifyEmail(ctx.input.email);

    let scoreMessage =
      result.deliverabilityScore === undefined
        ? ''
        : ` (score: ${result.deliverabilityScore}/100)`;
    let message = `**${result.email}** is **${result.status}**${scoreMessage}.`;
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
