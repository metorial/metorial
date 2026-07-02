import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubmission = SlateTool.create(spec, {
  name: 'Get Submission',
  key: 'get_submission',
  description: `Retrieve detailed information about a specific form submission, including all form field data, spam status, attachments, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      submissionId: z.number().describe('ID of the submission to retrieve.')
    })
  )
  .output(
    z.object({
      submissionId: z.number().describe('Submission ID.'),
      formId: z.number().describe('Form ID the submission belongs to.'),
      email: z.string().nullable().describe('Submitter email.'),
      spam: z.boolean().describe('Whether flagged as spam.'),
      read: z.boolean().describe('Whether the submission has been read.'),
      trash: z.boolean().describe('Whether in trash.'),
      spamReason: z.string().nullable().describe('Reason flagged as spam.'),
      webhookSentAt: z.string().nullable().describe('Timestamp when webhook was last sent.'),
      fields: z.record(z.string(), z.unknown()).describe('Form field data.'),
      attachments: z.array(z.unknown()).describe('File attachments.'),
      ip: z.string().nullable().describe('Submitter IP address.'),
      referrer: z.string().nullable().describe('Referrer URL.'),
      userAgent: z.string().nullable().describe('Submitter user agent.'),
      createdAt: z.string().describe('Submission timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let s = await client.getSubmission(ctx.input.submissionId);

    return {
      output: {
        submissionId: s.id,
        formId: s.form_id,
        email: s.email ?? null,
        spam: s.spam ?? false,
        read: s.read ?? false,
        trash: s.trash ?? false,
        spamReason: s.spam_reason ?? null,
        webhookSentAt: s.webhook_sent_at ?? null,
        fields: s.payload_params ?? {},
        attachments: s.attachments ?? [],
        ip: s.ip ?? null,
        referrer: s.referrer ?? null,
        userAgent: s.user_agent ?? null,
        createdAt: s.created_at ?? ''
      },
      message: `Submission **#${s.id}** from form ${s.form_id} — ${s.spam ? '⚠️ spam' : '✅ legitimate'}.`
    };
  })
  .build();
