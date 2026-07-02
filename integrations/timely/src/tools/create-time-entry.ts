import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let createTimeEntry = SlateTool.create(spec, {
  name: 'Create Time Entry',
  key: 'create_time_entry',
  description: `Log a new time entry in Timely. Specify duration via hours/minutes or a from/to time range. Optionally assign to a project, add notes, labels, and set an hourly rate.`,
  instructions: [
    'Either provide hours/minutes or from/to for the time range — not both.',
    'If userId is provided, the entry is created for that user (requires permission).'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      day: z.string().describe('Date for the time entry (YYYY-MM-DD)'),
      hours: z.number().optional().describe('Number of hours to log'),
      minutes: z.number().optional().describe('Number of minutes to log'),
      from: z.string().optional().describe('Start time (ISO 8601 datetime)'),
      to: z.string().optional().describe('End time (ISO 8601 datetime)'),
      projectId: z.string().optional().describe('Project ID to log time against'),
      note: z.string().optional().describe('Notes/description for the entry'),
      labelIds: z.array(z.number()).optional().describe('Label IDs to attach'),
      hourRate: z.number().optional().describe('Custom hourly rate for this entry'),
      estimatedHours: z.number().optional().describe('Estimated hours for the task'),
      estimatedMinutes: z.number().optional().describe('Estimated minutes for the task'),
      externalId: z.string().optional().describe('External reference ID (max 512 chars)'),
      userId: z
        .string()
        .optional()
        .describe('Create entry for another user (requires permission)')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Created time entry ID'),
      day: z.string().describe('Date of the entry'),
      durationFormatted: z.string().optional().describe('Formatted duration'),
      projectName: z.string().nullable().describe('Project name'),
      note: z.string().nullable().describe('Notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let event = await client.createEvent({
      day: ctx.input.day,
      hours: ctx.input.hours,
      minutes: ctx.input.minutes,
      from: ctx.input.from,
      to: ctx.input.to,
      projectId: ctx.input.projectId,
      note: ctx.input.note,
      labelIds: ctx.input.labelIds,
      hourRate: ctx.input.hourRate,
      estimatedHours: ctx.input.estimatedHours,
      estimatedMinutes: ctx.input.estimatedMinutes,
      externalId: ctx.input.externalId,
      userId: ctx.input.userId
    });

    return {
      output: {
        eventId: event.id,
        day: event.day,
        durationFormatted: event.duration?.formatted,
        projectName: event.project?.name ?? null,
        note: event.note ?? null
      },
      message: `Created time entry **#${event.id}** on ${event.day} — ${event.duration?.formatted ?? 'timer started'}${event.project?.name ? ` for project **${event.project.name}**` : ''}.`
    };
  })
  .build();
