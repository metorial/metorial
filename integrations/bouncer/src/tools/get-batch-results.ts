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

export let getBatchResults = SlateTool.create(spec, {
  name: 'Get Batch Results',
  key: 'get_batch_results',
  description: `Download the results of a completed asynchronous batch email verification. Returns detailed verification data for each email. Results can be filtered by deliverability status.`,
  instructions: [
    'The batch must be in **completed** status before results can be downloaded.',
    'Use the **Get Batch Status** tool to check if the batch is ready.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z.string().describe('The batch ID returned from creating a batch verification'),
      statusFilter: z
        .enum(['all', 'deliverable', 'risky', 'undeliverable', 'unknown'])
        .optional()
        .describe('Filter results by email status. Defaults to all results.')
    })
  )
  .output(
    z.object({
      results: z.array(emailResultSchema).describe('Verification results for each email'),
      total: z.number().describe('Total number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.getBatchResults(ctx.input.batchId, ctx.input.statusFilter);

    return {
      output: { results, total: results.length },
      message: `Downloaded **${results.length}** results for batch **${ctx.input.batchId}**${ctx.input.statusFilter && ctx.input.statusFilter !== 'all' ? ` (filtered: ${ctx.input.statusFilter})` : ''}`
    };
  })
  .build();
