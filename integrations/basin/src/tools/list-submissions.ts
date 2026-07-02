import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubmissions = SlateTool.create(spec, {
  name: 'List Submissions',
  key: 'list_submissions',
  description: `Retrieve form submissions with filtering, search, and sorting. Filter by form, spam status, date range, and more. Useful for exporting data, building reports, or syncing to external databases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.number().optional().describe('Filter submissions by form ID.'),
      filterBy: z
        .enum(['new', 'spam', 'trash', 'all'])
        .optional()
        .describe('Filter by submission status. Defaults to all.'),
      query: z.string().optional().describe('Search within submissions.'),
      orderBy: z
        .enum(['date_asc', 'date_desc', 'email_asc', 'email_desc'])
        .optional()
        .describe('Sort order for results.'),
      dateRange: z
        .string()
        .optional()
        .describe('Date range filter in "YYYY-MM-DD to YYYY-MM-DD" format.'),
      page: z.number().optional().describe('Page number for pagination.')
    })
  )
  .output(
    z.object({
      submissions: z.array(
        z.object({
          submissionId: z.number().describe('Submission ID.'),
          formId: z.number().describe('Form ID the submission belongs to.'),
          email: z.string().nullable().describe('Submitter email, if available.'),
          spam: z.boolean().describe('Whether the submission was flagged as spam.'),
          read: z.boolean().describe('Whether the submission has been read.'),
          trash: z.boolean().describe('Whether the submission is in trash.'),
          spamReason: z
            .string()
            .nullable()
            .describe('Reason the submission was flagged as spam.'),
          fields: z
            .record(z.string(), z.unknown())
            .describe('Form field data submitted by the user.'),
          ip: z.string().nullable().describe('IP address of the submitter.'),
          referrer: z.string().nullable().describe('Referrer URL of the submission.'),
          createdAt: z.string().describe('Submission timestamp.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listSubmissions({
      form_id: ctx.input.formId,
      filter_by: ctx.input.filterBy,
      query: ctx.input.query,
      order_by: ctx.input.orderBy,
      date_range: ctx.input.dateRange,
      page: ctx.input.page
    });

    let items = Array.isArray(data) ? data : (data?.items ?? data?.submissions ?? []);

    let submissions = items.map((s: any) => ({
      submissionId: s.id,
      formId: s.form_id,
      email: s.email ?? null,
      spam: s.spam ?? false,
      read: s.read ?? false,
      trash: s.trash ?? false,
      spamReason: s.spam_reason ?? null,
      fields: s.payload_params ?? {},
      ip: s.ip ?? null,
      referrer: s.referrer ?? null,
      createdAt: s.created_at ?? ''
    }));

    return {
      output: { submissions },
      message: `Retrieved **${submissions.length}** submission(s).`
    };
  })
  .build();
