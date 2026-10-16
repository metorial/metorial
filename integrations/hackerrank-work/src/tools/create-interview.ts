import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { numericId, validateSchedule } from '../lib/validation';
import { spec } from '../spec';

export let createInterview = SlateTool.create(spec, {
  name: 'Create Interview',
  key: 'create_interview',
  description: `Create a new live coding interview session (CodePair/QuickPad). Specify the candidate, interviewers, schedule, and optionally a template. Use this to set up real-time collaborative coding sessions for technical interviews.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      candidateName: z.string().optional().describe('Full name of the candidate'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional interview metadata'),
      resumeUrl: z.string().optional().describe('URL of the candidate resume'),
      title: z.string().optional().describe('Title for the interview session'),
      candidateEmail: z.string().optional().describe('Email address of the candidate'),
      interviewerEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses of the interviewers'),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Whether to send email invitations to participants'),
      templateId: z
        .string()
        .optional()
        .describe(
          'ID of an interview template to use; call list_interview_templates to discover IDs'
        ),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for scheduling (e.g., "America/New_York")'),
      notes: z.string().optional().describe('Notes for the interview'),
      from: z.string().optional().describe('Scheduled start time (ISO 8601 format)'),
      to: z.string().optional().describe('Scheduled end time (ISO 8601 format)')
    })
  )
  .output(
    z.object({
      interview: z.record(z.string(), z.any()).describe('Created interview object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.title?.trim())
      throw createApiServiceError('HackerRank requires a title to create an interview.');
    if (ctx.input.candidateName !== undefined && !ctx.input.candidateEmail)
      throw createApiServiceError('Provide candidateEmail when providing candidateName.');
    validateSchedule(ctx.input.from, ctx.input.to);
    let result = await client.createInterview({
      title: ctx.input.title,
      candidate:
        ctx.input.candidateEmail === undefined
          ? undefined
          : { email: ctx.input.candidateEmail, name: ctx.input.candidateName },
      interviewers: ctx.input.interviewerEmails,
      send_email: ctx.input.sendEmail,
      interview_template_id: numericId(ctx.input.templateId, 'templateId'),
      metadata: ctx.input.metadata,
      resume_url: ctx.input.resumeUrl,
      timezone: ctx.input.timezone,
      notes: ctx.input.notes,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let interview = result.data ?? result;

    return {
      output: {
        interview
      },
      message: `Created interview **${interview.title ?? interview.id ?? 'session'}**.`
    };
  });
