import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailResultSchema = z.object({
  email: z.string().describe('The verified email address'),
  status: z
    .enum(['deliverable', 'risky', 'undeliverable', 'unknown'])
    .describe('Deliverability status'),
  reason: z.string().describe('Reason for the status'),
  domain: z
    .object({
      name: z.string().describe('Domain name'),
      acceptAll: z.string().describe('Whether domain accepts all emails'),
      disposable: z.string().describe('Whether domain is disposable'),
      free: z.string().describe('Whether domain is a free provider')
    })
    .describe('Domain information'),
  account: z
    .object({
      role: z.string().describe('Whether the address is role-based'),
      disabled: z.string().describe('Whether the account is disabled'),
      fullMailbox: z.string().describe('Whether the mailbox is full')
    })
    .describe('Account information'),
  dns: z
    .object({
      type: z.string().describe('DNS record type'),
      record: z.string().describe('DNS record value')
    })
    .describe('DNS record information'),
  provider: z.string().describe('Email service provider'),
  score: z.number().describe('Deliverability score from 0 to 100'),
  toxic: z.string().describe('Whether the email is flagged as toxic'),
  toxicity: z.number().describe('Toxicity score from 0 to 5')
});

export let batchVerifyEmails = SlateTool.create(spec, {
  name: 'Batch Verify Emails',
  key: 'batch_verify_emails',
  description: `Verify multiple email addresses synchronously in a single request. Submits emails to a batch processing queue and returns results when verification is complete. Ideal for verifying small to medium lists where you need immediate results.`,
  constraints: [
    'Maximum 10,000 emails per request.',
    'Rate limited to 100 requests per minute.',
    'Results are cached for 24 hours before re-verification.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emails: z.array(z.string()).describe('List of email addresses to verify')
    })
  )
  .output(
    z.object({
      results: z.array(emailResultSchema).describe('Verification results for each email'),
      summary: z
        .object({
          total: z.number().describe('Total emails verified'),
          deliverable: z.number().describe('Count of deliverable emails'),
          risky: z.number().describe('Count of risky emails'),
          undeliverable: z.number().describe('Count of undeliverable emails'),
          unknown: z.number().describe('Count of unknown emails')
        })
        .describe('Summary of verification results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.batchVerifySync(ctx.input.emails);

    let summary = {
      total: results.length,
      deliverable: results.filter(r => r.status === 'deliverable').length,
      risky: results.filter(r => r.status === 'risky').length,
      undeliverable: results.filter(r => r.status === 'undeliverable').length,
      unknown: results.filter(r => r.status === 'unknown').length
    };

    return {
      output: { results, summary },
      message: `Verified **${summary.total}** emails: **${summary.deliverable}** deliverable, **${summary.risky}** risky, **${summary.undeliverable}** undeliverable, **${summary.unknown}** unknown`
    };
  })
  .build();
