import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let verificationResultSchema = z.object({
  email: z.string().describe('The email address that was verified'),
  state: z.string().describe('Deliverability state'),
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

export let batchCompleted = SlateTrigger.create(spec, {
  name: 'Batch Verification Completed',
  key: 'batch_completed',
  description:
    'Triggers when a batch email verification completes. Set the callback URL from this trigger as the callback URL when creating a batch verification to receive results automatically.',
  instructions: [
    'To use this trigger, provide the webhook URL as the callbackUrl parameter when submitting a batch via the Verify Email Batch tool.',
    'Emailable retries hourly for up to 3 days if the callback endpoint does not return HTTP 200.'
  ]
})
  .input(
    z.object({
      batchId: z.string().describe('The batch identifier'),
      message: z.string().describe('Completion message'),
      emails: z
        .array(z.any())
        .optional()
        .describe('Individual verification results (for batches up to 1,000 emails)'),
      downloadFile: z
        .string()
        .optional()
        .describe('CSV download URL (for batches over 1,000 emails)'),
      totalCounts: z
        .object({
          deliverable: z.number(),
          undeliverable: z.number(),
          risky: z.number(),
          unknown: z.number(),
          duplicate: z.number(),
          processed: z.number(),
          total: z.number()
        })
        .optional()
        .describe('Aggregate counts by state'),
      reasonCounts: z
        .record(z.string(), z.number())
        .optional()
        .describe('Aggregate counts by reason')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('The batch identifier'),
      message: z.string().describe('Completion status message'),
      totalEmails: z.number().describe('Total number of emails in the batch'),
      processedEmails: z.number().describe('Number of emails processed'),
      deliverableCount: z.number().describe('Count of deliverable emails'),
      undeliverableCount: z.number().describe('Count of undeliverable emails'),
      riskyCount: z.number().describe('Count of risky emails'),
      unknownCount: z.number().describe('Count of unknown emails'),
      duplicateCount: z.number().describe('Count of duplicate emails'),
      emails: z
        .array(verificationResultSchema)
        .optional()
        .describe('Individual verification results (for batches up to 1,000 emails)'),
      downloadFile: z
        .string()
        .optional()
        .describe('CSV download URL (for batches over 1,000 emails)'),
      reasonCounts: z
        .record(z.string(), z.number())
        .optional()
        .describe('Aggregate counts by verification reason')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let mapEmailResult = (raw: any) => ({
        email: raw.email,
        state: raw.state,
        reason: raw.reason,
        score: raw.score,
        domain: raw.domain,
        user: raw.user,
        acceptAll: raw.accept_all,
        disposable: raw.disposable,
        free: raw.free,
        role: raw.role,
        mailboxFull: raw.mailbox_full,
        noReply: raw.no_reply,
        didYouMean: raw.did_you_mean || null,
        firstName: raw.first_name || null,
        lastName: raw.last_name || null,
        fullName: raw.full_name || null,
        gender: raw.gender || null,
        mxRecord: raw.mx_record || null,
        smtpProvider: raw.smtp_provider || null,
        tag: raw.tag || null,
        duration: raw.duration
      });

      let emails = data.emails ? data.emails.map(mapEmailResult) : undefined;

      let totalCounts = data.total_counts
        ? {
            deliverable: data.total_counts.deliverable ?? 0,
            undeliverable: data.total_counts.undeliverable ?? 0,
            risky: data.total_counts.risky ?? 0,
            unknown: data.total_counts.unknown ?? 0,
            duplicate: data.total_counts.duplicate ?? 0,
            processed: data.total_counts.processed ?? 0,
            total: data.total_counts.total ?? 0
          }
        : undefined;

      let reasonCounts = data.reason_counts
        ? (Object.fromEntries(
            Object.entries(data.reason_counts).map(([key, value]) => [
              key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
              value
            ])
          ) as Record<string, number>)
        : undefined;

      return {
        inputs: [
          {
            batchId: data.id,
            message: data.message,
            emails,
            downloadFile: data.download_file,
            totalCounts,
            reasonCounts
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let totalCounts = input.totalCounts;

      return {
        type: 'batch.completed',
        id: input.batchId,
        output: {
          batchId: input.batchId,
          message: input.message,
          totalEmails: totalCounts?.total ?? 0,
          processedEmails: totalCounts?.processed ?? 0,
          deliverableCount: totalCounts?.deliverable ?? 0,
          undeliverableCount: totalCounts?.undeliverable ?? 0,
          riskyCount: totalCounts?.risky ?? 0,
          unknownCount: totalCounts?.unknown ?? 0,
          duplicateCount: totalCounts?.duplicate ?? 0,
          emails: input.emails,
          downloadFile: input.downloadFile,
          reasonCounts: input.reasonCounts
        }
      };
    }
  })
  .build();
