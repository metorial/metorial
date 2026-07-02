import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageScheduleEntryTool = SlateTool.create(spec, {
  name: 'Manage Schedule Entry',
  key: 'manage_schedule_entry',
  description: `Create or update a schedule entry (event) in a Basecamp project's schedule.
To **create**, provide the \`projectId\`, \`scheduleId\`, \`summary\`, \`startsAt\`, and \`endsAt\`.
To **update**, provide the \`projectId\`, \`entryId\`, and the fields to change.`,
  instructions: [
    'Use Get Project to find the schedule dock item and its ID.',
    'Dates must be in ISO 8601 format (e.g., "2025-06-15T09:00:00Z").'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      action: z.enum(['create', 'update']).describe('Action to perform'),
      scheduleId: z
        .string()
        .optional()
        .describe('ID of the schedule (required for create, found in project dock)'),
      entryId: z
        .string()
        .optional()
        .describe('ID of the schedule entry (required for update)'),
      summary: z.string().optional().describe('Title/summary of the event'),
      startsAt: z.string().optional().describe('Start date/time in ISO 8601 format'),
      endsAt: z.string().optional().describe('End date/time in ISO 8601 format'),
      description: z.string().optional().describe('Description of the event (supports HTML)'),
      participantIds: z
        .array(z.number())
        .optional()
        .describe('Array of person IDs to add as participants'),
      allDay: z.boolean().optional().describe('Whether this is an all-day event'),
      notify: z.boolean().optional().describe('Whether to notify participants')
    })
  )
  .output(
    z.object({
      entryId: z.number().describe('ID of the schedule entry'),
      summary: z.string().describe('Title/summary of the event'),
      startsAt: z.string().describe('Start date/time'),
      endsAt: z.string().describe('End date/time'),
      allDay: z.boolean().describe('Whether this is an all-day event'),
      description: z.string().nullable().describe('Description of the event'),
      createdAt: z.string().describe('When the entry was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { action, projectId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.scheduleId)
        throw new Error('scheduleId is required for creating a schedule entry');
      if (!ctx.input.summary)
        throw new Error('summary is required for creating a schedule entry');
      if (!ctx.input.startsAt)
        throw new Error('startsAt is required for creating a schedule entry');
      if (!ctx.input.endsAt)
        throw new Error('endsAt is required for creating a schedule entry');

      let entry = await client.createScheduleEntry(projectId, ctx.input.scheduleId, {
        summary: ctx.input.summary,
        startsAt: ctx.input.startsAt,
        endsAt: ctx.input.endsAt,
        description: ctx.input.description,
        participantIds: ctx.input.participantIds,
        allDay: ctx.input.allDay,
        notify: ctx.input.notify
      });

      return {
        output: {
          entryId: entry.id,
          summary: entry.summary,
          startsAt: entry.starts_at,
          endsAt: entry.ends_at,
          allDay: entry.all_day ?? false,
          description: entry.description ?? null,
          createdAt: entry.created_at
        },
        message: `Created schedule entry **${entry.summary}**.`
      };
    }

    // update
    if (!ctx.input.entryId)
      throw new Error('entryId is required for updating a schedule entry');

    let entry = await client.updateScheduleEntry(projectId, ctx.input.entryId, {
      summary: ctx.input.summary,
      startsAt: ctx.input.startsAt,
      endsAt: ctx.input.endsAt,
      description: ctx.input.description,
      participantIds: ctx.input.participantIds,
      allDay: ctx.input.allDay,
      notify: ctx.input.notify
    });

    return {
      output: {
        entryId: entry.id,
        summary: entry.summary,
        startsAt: entry.starts_at,
        endsAt: entry.ends_at,
        allDay: entry.all_day ?? false,
        description: entry.description ?? null,
        createdAt: entry.created_at
      },
      message: `Updated schedule entry **${entry.summary}**.`
    };
  })
  .build();
