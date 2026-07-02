import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailRecordSchema = z.object({
  email: z.string().describe('The verified email address'),
  status: z
    .enum(['deliverable', 'risky', 'undeliverable', 'unknown'])
    .describe('Deliverability status'),
  reason: z
    .string()
    .describe(
      'Reason for the status, e.g. accepted_email, invalid_email, rejected_email, dns_error, timeout'
    ),
  domain: z
    .object({
      name: z.string().describe('Domain name'),
      acceptAll: z.string().describe('Whether domain accepts all emails (yes/no)'),
      disposable: z
        .string()
        .describe('Whether domain is a disposable email provider (yes/no)'),
      free: z.string().describe('Whether domain is a free email provider (yes/no)')
    })
    .describe('Domain information'),
  account: z
    .object({
      role: z
        .string()
        .describe('Whether the address is role-based like info@ or support@ (yes/no)'),
      disabled: z.string().describe('Whether the account is disabled (yes/no)'),
      fullMailbox: z.string().describe('Whether the mailbox is full (yes/no)')
    })
    .describe('Account information'),
  dns: z
    .object({
      type: z.string().describe('DNS record type used for verification, e.g. MX'),
      record: z.string().describe('DNS record value')
    })
    .describe('DNS record information'),
  provider: z.string().describe('Email service provider, e.g. google.com'),
  score: z.number().describe('Deliverability confidence score from 0 to 100'),
  toxic: z.string().describe('Whether the email is flagged as toxic (yes/no/unknown)'),
  toxicity: z.number().describe('Toxicity score from 0 to 5'),
  retryAfter: z
    .string()
    .optional()
    .describe('ISO timestamp for greylisted addresses requiring retry'),
  didYouMean: z
    .string()
    .optional()
    .describe('Suggested correction for potentially misspelled emails')
});

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address in real-time. Checks syntax, domain validity, and contacts SMTP servers to determine deliverability. Returns detailed information including deliverability status, domain characteristics (disposable, free, accept-all), account details, DNS records, email provider, deliverability score, and toxicity flag.`,
  constraints: [
    'Rate limited to 1000 requests per minute by default.',
    'Verification completes within 10 seconds (maximum 30).',
    'Consumes one credit per verification.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify'),
      timeout: z
        .number()
        .optional()
        .describe('Verification timeout in seconds. Defaults to 10, maximum 30.')
    })
  )
  .output(emailRecordSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyEmail(ctx.input.email, ctx.input.timeout);

    return {
      output: result,
      message: `Verified **${result.email}**: status is **${result.status}** (${result.reason}), score: ${result.score}/100, provider: ${result.provider}${result.didYouMean ? `, suggestion: ${result.didYouMean}` : ''}`
    };
  })
  .build();
