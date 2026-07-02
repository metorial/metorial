import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let verificationResultSchema = z.object({
  email: z.string().describe('The email address that was verified'),
  state: z
    .string()
    .describe('Deliverability state: deliverable, undeliverable, risky, or unknown'),
  reason: z.string().describe('The reason for the associated state'),
  score: z.number().describe('Deliverability score from 0 to 100'),
  domain: z.string().describe('The domain part of the email'),
  user: z.string().describe('The user part of the email'),
  acceptAll: z.boolean().describe('Whether the mail server accepts all addresses'),
  disposable: z.boolean().describe('Whether the email is disposable'),
  free: z.boolean().describe('Whether the email is from a free provider'),
  role: z.boolean().describe('Whether the email is role-based'),
  mailboxFull: z.boolean().describe('Whether the mailbox is full'),
  noReply: z.boolean().describe('Whether this is a no-reply address'),
  didYouMean: z.string().nullable().describe('Suggested correction'),
  firstName: z.string().nullable().describe('Inferred first name'),
  lastName: z.string().nullable().describe('Inferred last name'),
  fullName: z.string().nullable().describe('Inferred full name'),
  gender: z.string().nullable().describe('Inferred gender'),
  mxRecord: z.string().nullable().describe('MX record of the domain'),
  smtpProvider: z.string().nullable().describe('SMTP provider'),
  tag: z.string().nullable().describe('Tag part of the email'),
  duration: z.number().describe('Verification duration in seconds')
});

export let getBatchStatus = SlateTool.create(spec, {
  name: 'Get Batch Status',
  key: 'get_batch_status',
  description: `Retrieve the status and results of a previously submitted batch email verification. Returns processing progress, aggregate counts by state and reason, and individual verification results (for batches up to 1,000 emails) or a CSV download link (for larger batches).`,
  instructions: [
    'Set partial to true to retrieve available results while the batch is still processing (only for batches up to 1,000 emails).'
  ],
  constraints: [
    'Individual results for small batches are retained for 30 days.',
    'Download links for large batches are available for 5 days.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z.string().describe('The batch ID returned when the batch was created'),
      partial: z
        .boolean()
        .optional()
        .describe(
          'Set to true to include partial results while the batch is still processing (only for batches up to 1,000 emails)'
        )
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('The batch identifier'),
      message: z.string().describe('Status message (e.g. "Batch verification completed")'),
      processed: z.number().optional().describe('Number of emails processed so far'),
      total: z.number().optional().describe('Total number of emails in the batch'),
      emails: z
        .array(verificationResultSchema)
        .optional()
        .describe('Individual verification results (for batches up to 1,000 emails)'),
      downloadFile: z
        .string()
        .optional()
        .describe('URL to download CSV results (for batches over 1,000 emails)'),
      totalCounts: z
        .object({
          deliverable: z.number().describe('Count of deliverable emails'),
          undeliverable: z.number().describe('Count of undeliverable emails'),
          risky: z.number().describe('Count of risky emails'),
          unknown: z.number().describe('Count of unknown emails'),
          duplicate: z.number().describe('Count of duplicate emails'),
          processed: z.number().describe('Total processed'),
          total: z.number().describe('Total in batch')
        })
        .optional()
        .describe('Aggregate counts by deliverability state'),
      reasonCounts: z
        .object({
          acceptableEmail: z.number().optional(),
          invalidDomain: z.number().optional(),
          invalidEmail: z.number().optional(),
          invalidSmtp: z.number().optional(),
          lowDeliverability: z.number().optional(),
          lowQuality: z.number().optional(),
          noConnect: z.number().optional(),
          rejectedEmail: z.number().optional(),
          timeout: z.number().optional(),
          unavailableSmtp: z.number().optional(),
          unexpectedError: z.number().optional()
        })
        .optional()
        .describe('Aggregate counts by verification reason')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBatchStatus({
      batchId: ctx.input.batchId,
      partial: ctx.input.partial
    });

    let progressStr =
      result.processed !== undefined && result.total !== undefined
        ? ` (${result.processed}/${result.total} processed)`
        : '';

    let downloadStr = result.downloadFile
      ? `\n\n[Download CSV results](${result.downloadFile})`
      : '';

    return {
      output: result,
      message: `Batch **${result.batchId}**: ${result.message}${progressStr}${downloadStr}`
    };
  })
  .build();
