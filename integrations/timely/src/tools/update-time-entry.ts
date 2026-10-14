import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateTimeEntry = SlateTool.create(spec, {
  name: 'Update Time Entry',
  key: 'update_time_entry',
  description: `Call list_accounts to choose a workspace when needed. Update an existing time entry in Timely. Modify the duration, date, project, notes, labels, billing status, or hourly rate.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      eventId: z.string().describe('ID of the time entry to update'),
      hours: z.number().optional().describe('Updated hours'),
      minutes: z.number().optional().describe('Updated minutes'),
      day: z.string().optional().describe('Updated date (YYYY-MM-DD)'),
      projectId: z.string().optional().describe('Updated project ID'),
      note: z.string().optional().describe('Updated notes/description'),
      from: z
        .string()
        .optional()
        .describe('Updated start time (HH:MM, 24-hour format, e.g. 09:00)'),
      to: z
        .string()
        .optional()
        .describe('Updated end time (HH:MM, 24-hour format, e.g. 17:30)'),
      labelIds: z.array(z.number()).optional().describe('Updated label IDs'),
      hourRate: z.number().optional().describe('Updated hourly rate'),
      estimatedHours: z.number().optional().describe('Updated estimated hours'),
      estimatedMinutes: z.number().optional().describe('Updated estimated minutes'),
      externalId: z.string().optional().describe('Updated external reference ID'),
      billed: z.boolean().optional().describe('Mark as billed/unbilled'),
      billable: z.boolean().optional().describe('Mark as billable/non-billable')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Updated time entry ID'),
      day: z.string().describe('Date of the entry'),
      durationFormatted: z.string().optional().describe('Formatted duration'),
      projectName: z.string().nullable().describe('Project name'),
      note: z.string().nullable().describe('Notes'),
      billed: z.boolean().describe('Billed status')
    })
  )
  .handleInvocation(async ctx => {
    let client = await createTimelyClient(ctx);

    let event = await client.updateEvent(ctx.input.eventId, {
      hours: ctx.input.hours,
      minutes: ctx.input.minutes,
      day: ctx.input.day,
      projectId: ctx.input.projectId,
      note: ctx.input.note,
      from: ctx.input.from,
      to: ctx.input.to,
      labelIds: ctx.input.labelIds,
      hourRate: ctx.input.hourRate,
      estimatedHours: ctx.input.estimatedHours,
      estimatedMinutes: ctx.input.estimatedMinutes,
      externalId: ctx.input.externalId,
      billed: ctx.input.billed,
      billable: ctx.input.billable
    });

    return {
      output: {
        eventId: event.id,
        day: event.day,
        durationFormatted: event.duration?.formatted,
        projectName: event.project?.name ?? null,
        note: event.note ?? null,
        billed: event.billed ?? false
      },
      message: `Updated time entry **#${event.id}** on ${event.day} — ${event.duration?.formatted ?? 'unknown'}.`
    };
  })
  .build();
