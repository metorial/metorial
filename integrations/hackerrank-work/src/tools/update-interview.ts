import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { numericId, validateSchedule } from '../lib/validation';
import { spec } from '../spec';

export let updateInterview = SlateTool.create(spec, {
  key: 'update_interview',
  name: 'Update Interview',
  description:
    'Update a live coding interview, reschedule it, or replace its interviewers. Call list_interviews to discover interview IDs.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      interviewId: z.string().describe('Interview ID from list_interviews'),
      title: z.string().optional().describe('Interview title'),
      candidateEmail: z.string().optional().describe('Candidate email'),
      candidateName: z
        .string()
        .optional()
        .describe('Candidate name; provide candidateEmail too'),
      interviewerEmails: z
        .array(z.string())
        .optional()
        .describe('Replacement interviewer email addresses'),
      sendEmail: z.boolean().optional().describe('Send or resend invitations'),
      templateId: z.string().optional().describe('Template ID from list_interview_templates'),
      from: z.string().optional().describe('Scheduled start timestamp with UTC offset'),
      to: z.string().optional().describe('Scheduled end timestamp with UTC offset'),
      notes: z.string().optional().describe('Notes for interviewers'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional interview metadata'),
      resumeUrl: z.string().optional().describe('Candidate resume URL')
    })
  )
  .output(
    z.object({
      interview: z.record(z.string(), z.any()).describe('Updated interview details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    validateSchedule(ctx.input.from, ctx.input.to);
    if (ctx.input.candidateName !== undefined && !ctx.input.candidateEmail)
      throw createApiServiceError('Provide candidateEmail when providing candidateName.');
    let data = pickDefined({
      title: ctx.input.title,
      notes: ctx.input.notes,
      from: ctx.input.from,
      to: ctx.input.to,
      candidate:
        ctx.input.candidateEmail === undefined
          ? undefined
          : pickDefined({ email: ctx.input.candidateEmail, name: ctx.input.candidateName }),
      interviewers: ctx.input.interviewerEmails,
      replace_interviewers: ctx.input.interviewerEmails === undefined ? undefined : true,
      send_email: ctx.input.sendEmail,
      interview_template_id: numericId(ctx.input.templateId, 'templateId'),
      metadata: ctx.input.metadata,
      resume_url: ctx.input.resumeUrl
    });
    if (Object.keys(data).length === 0)
      throw createApiServiceError('Provide at least one interview field to update.');
    let result = await client.updateInterview(ctx.input.interviewId, data);
    return {
      message: 'Update interview completed.',
      output: { interview: result.data ?? result }
    };
  });
