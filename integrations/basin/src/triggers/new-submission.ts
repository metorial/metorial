import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newSubmission = SlateTrigger.create(spec, {
  name: 'New Submission',
  key: 'new_submission',
  description:
    'Triggers when a new form submission is received in Basin. Polls for new submissions across all forms or a specific form.'
})
  .input(
    z.object({
      submissionId: z.number().describe('ID of the submission.'),
      formId: z.number().describe('Form ID the submission belongs to.'),
      email: z.string().nullable().describe('Submitter email.'),
      spam: z.boolean().describe('Whether flagged as spam.'),
      fields: z.record(z.string(), z.unknown()).describe('Form field data.'),
      createdAt: z.string().describe('Submission timestamp.'),
      ip: z.string().nullable().describe('Submitter IP address.'),
      referrer: z.string().nullable().describe('Referrer URL.'),
      userAgent: z.string().nullable().describe('Submitter user agent.'),
      attachments: z.array(z.unknown()).describe('File attachments.')
    })
  )
  .output(
    z.object({
      submissionId: z.number().describe('Submission ID.'),
      formId: z.number().describe('Form ID the submission belongs to.'),
      email: z.string().nullable().describe('Submitter email, if provided.'),
      spam: z.boolean().describe('Whether the submission was flagged as spam.'),
      spamReason: z.string().nullable().describe('Reason flagged as spam, if applicable.'),
      read: z.boolean().describe('Whether the submission has been read.'),
      fields: z
        .record(z.string(), z.unknown())
        .describe('All form field data submitted by the user.'),
      ip: z.string().nullable().describe('IP address of the submitter.'),
      referrer: z.string().nullable().describe('Referrer URL.'),
      userAgent: z.string().nullable().describe('Submitter user agent string.'),
      attachments: z
        .array(z.unknown())
        .describe('File attachments included with the submission.'),
      createdAt: z.string().describe('Submission timestamp.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastSeenId = (ctx.state as any)?.lastSeenId as number | undefined;
      let lastPollTime = (ctx.state as any)?.lastPollTime as string | undefined;

      let params: Record<string, any> = {
        order_by: 'date_desc',
        filter_by: 'all'
      };

      if (lastPollTime) {
        params.date_range = `${lastPollTime} to 2099-12-31`;
      }

      let data = await client.listSubmissions(params);
      let items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.submissions ?? []);

      // Filter out already-seen submissions
      if (lastSeenId) {
        items = items.filter((s: any) => s.id > lastSeenId);
      }

      // Sort ascending by ID so events process in order
      items.sort((a: any, b: any) => a.id - b.id);

      let newLastSeenId =
        items.length > 0 ? Math.max(...items.map((s: any) => s.id)) : lastSeenId;

      let now = new Date().toISOString().split('T')[0];

      return {
        inputs: items.map((s: any) => ({
          submissionId: s.id,
          formId: s.form_id,
          email: s.email ?? null,
          spam: s.spam ?? false,
          fields: s.payload_params ?? {},
          createdAt: s.created_at ?? '',
          ip: s.ip ?? null,
          referrer: s.referrer ?? null,
          userAgent: s.user_agent ?? null,
          attachments: s.attachments ?? []
        })),
        updatedState: {
          lastSeenId: newLastSeenId,
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let s = ctx.input;

      return {
        type: s.spam ? 'submission.spam' : 'submission.received',
        id: String(s.submissionId),
        output: {
          submissionId: s.submissionId,
          formId: s.formId,
          email: s.email,
          spam: s.spam,
          spamReason: null,
          read: false,
          fields: s.fields,
          ip: s.ip,
          referrer: s.referrer,
          userAgent: s.userAgent,
          attachments: s.attachments,
          createdAt: s.createdAt
        }
      };
    }
  })
  .build();
