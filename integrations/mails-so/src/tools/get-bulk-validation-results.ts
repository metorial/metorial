import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailResultSchema = z.object({
  email: z.string().describe('The validated email address'),
  score: z.number().describe('Validity score from 0 to 100'),
  result: z
    .string()
    .describe('Deliverability classification: deliverable, undeliverable, risky, or unknown'),
  reason: z.string().describe('Specific reason for the result'),
  isFormatValid: z.boolean().describe('Whether the email format is valid'),
  isDomainValid: z.boolean().describe('Whether the domain is valid'),
  isMxValid: z.boolean().describe('Whether MX records exist and are valid'),
  isNotBlocklisted: z.boolean().describe('Whether the email is not on any blocklist'),
  isNotCatchAll: z.boolean().describe('Whether the domain is not a catch-all'),
  isNotGeneric: z.boolean().describe('Whether the email is not a generic/role-based address'),
  isFreeProvider: z.boolean().describe('Whether the email uses a free provider'),
  mxRecord: z.string().describe('Mail exchanger record for the domain'),
  domain: z.string().describe('Domain part of the email'),
  username: z.string().describe('Local part of the email')
});

export let getBulkValidationResults = SlateTool.create(spec, {
  name: 'Get Bulk Validation Results',
  key: 'get_bulk_validation_results',
  description: `Retrieve the status and results of a bulk email validation batch job. Returns whether the job has finished, and if complete, includes the full validation results for each email in the batch.`,
  instructions: [
    'Use the batch ID returned from the **Bulk Validate Emails** tool.',
    'If the job is not yet finished, poll again after a short delay.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z
        .string()
        .describe('The batch job ID returned from the bulk validate emails tool')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique identifier for the batch job'),
      createdAt: z.string().describe('Timestamp when the batch was created'),
      size: z.number().describe('Number of emails in the batch'),
      isFinished: z.boolean().describe('Whether the batch job has completed processing'),
      finishedAt: z
        .string()
        .nullable()
        .describe('Timestamp when the batch finished, or null if still processing'),
      results: z
        .array(emailResultSchema)
        .describe('Validation results for each email in the batch (empty if not yet finished)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getBatchStatus(ctx.input.batchId);

    let isFinished = response.finished_at !== null;
    let results = (response.emails || []).map(e => ({
      email: e.email,
      score: e.score,
      result: e.result,
      reason: e.reason,
      isFormatValid: e.isv_format,
      isDomainValid: e.isv_domain,
      isMxValid: e.isv_mx,
      isNotBlocklisted: e.isv_noblock,
      isNotCatchAll: e.isv_nocatchall,
      isNotGeneric: e.isv_nogeneric,
      isFreeProvider: e.is_free,
      mxRecord: e.mx_record,
      domain: e.domain,
      username: e.username
    }));

    let deliverable = results.filter(r => r.result === 'deliverable').length;
    let undeliverable = results.filter(r => r.result === 'undeliverable').length;
    let risky = results.filter(r => r.result === 'risky').length;

    let message = isFinished
      ? `Batch **${response.id}** finished — **${results.length}** emails: ${deliverable} deliverable, ${undeliverable} undeliverable, ${risky} risky.`
      : `Batch **${response.id}** is still processing (${response.size} emails). Poll again shortly.`;

    return {
      output: {
        batchId: response.id,
        createdAt: response.created_at,
        size: response.size,
        isFinished,
        finishedAt: response.finished_at,
        results
      },
      message
    };
  })
  .build();
