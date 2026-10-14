import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { normalizeUserId, organizationIdSchema, userIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Create a new time entry in Elorus, linked to a project. Time entries track hours worked and can be marked as billable for later invoicing.`
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      projectId: z.string().describe('Project ID to log time against.'),
      date: z.string().describe('Date of the time entry (YYYY-MM-DD).'),
      assigneeId: userIdSchema
        .optional()
        .describe(
          'Required assignee user ID from list_users. Prefer the decimal user_id string to preserve long IDs; safe integer numbers are also accepted.'
        ),
      startDateTime: z
        .string()
        .optional()
        .describe(
          'Start timestamp including timezone on the supplied date. Defaults to midnight UTC on date.'
        ),
      duration: z
        .string()
        .describe('Duration in HH:MM format (e.g. "02:30" for 2 hours 30 minutes).'),
      description: z.string().optional().describe('Description of work performed.'),
      taskId: z.string().optional().describe('Task ID within the project.'),
      billable: z
        .boolean()
        .optional()
        .describe('Whether this time entry is billable. Defaults to project setting.')
    })
  )
  .output(
    z.object({
      timeEntry: z.any().describe('The newly created time entry object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });

    if (ctx.input.assigneeId === undefined) {
      throw createApiServiceError(
        'Provide assigneeId. Call list_users to find an organization user who belongs to the project.',
        { reason: 'missing_time_entry_assignee' }
      );
    }
    let duration = /^(\d+):([0-5]\d)$/.exec(ctx.input.duration);
    let startValue = ctx.input.startDateTime ?? `${ctx.input.date}T00:00:00Z`;
    let start = new Date(startValue);
    let minutes = duration ? Number(duration[1]) * 60 + Number(duration[2]) : 0;
    if (
      !duration ||
      minutes <= 0 ||
      !Number.isFinite(start.getTime()) ||
      !z.iso.datetime({ offset: true }).safeParse(startValue).success ||
      startValue.slice(0, 10) !== ctx.input.date
    ) {
      throw createApiServiceError(
        'Provide a positive HH:MM duration and a valid start timestamp with timezone.',
        { reason: 'invalid_time_entry_period' }
      );
    }
    let end = new Date(start.getTime() + minutes * 60000);
    if (!Number.isFinite(end.getTime())) {
      throw createApiServiceError('The time entry duration is too large.', {
        reason: 'invalid_time_entry_period'
      });
    }
    let body: Record<string, unknown> = {
      project: ctx.input.projectId,
      assignee: normalizeUserId(ctx.input.assigneeId),
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString()
    };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.taskId) body.task = ctx.input.taskId;
    if (ctx.input.billable !== undefined) body.billable = ctx.input.billable;

    let timeEntry = await client.createTimeEntry(body);

    return {
      output: { timeEntry },
      message: `Created time entry: **${ctx.input.duration}** starting ${timeEntry.start_datetime} (ID: ${timeEntry.id})`
    };
  })
  .build();
