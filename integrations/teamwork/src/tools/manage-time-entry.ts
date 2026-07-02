import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTimeEntry = SlateTool.create(spec, {
  name: 'Manage Time Entry',
  key: 'manage_time_entry',
  description: `Create, update, or delete a time entry in Teamwork. Log time against a project or task with hours, minutes, description, and billable status.`,
  instructions: [
    'For "create", provide either projectId or taskId, plus personId, date, hours, and minutes.',
    'For "update" and "delete", provide the timeEntryId.',
    'Date format should be YYYYMMDD.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      timeEntryId: z
        .string()
        .optional()
        .describe('Time entry ID (required for update/delete)'),
      projectId: z.string().optional().describe('Project ID (for create)'),
      taskId: z.string().optional().describe('Task ID (for create)'),
      personId: z
        .string()
        .optional()
        .describe('Person ID logging the time (required for create)'),
      date: z.string().optional().describe('Date of the time entry (YYYYMMDD)'),
      hours: z.number().optional().describe('Number of hours'),
      minutes: z.number().optional().describe('Number of minutes'),
      description: z.string().optional().describe('Description of work done'),
      isBillable: z.boolean().optional().describe('Whether the time is billable'),
      tags: z.string().optional().describe('Comma-separated tags')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().optional().describe('ID of the time entry'),
      created: z.boolean().optional().describe('Whether a new time entry was created'),
      updated: z.boolean().optional().describe('Whether the time entry was updated'),
      deleted: z.boolean().optional().describe('Whether the time entry was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.personId) throw new Error('personId is required to create a time entry');
      if (!ctx.input.date) throw new Error('date is required to create a time entry');
      let result = await client.createTimeEntry({
        projectId: ctx.input.projectId,
        taskId: ctx.input.taskId,
        personId: ctx.input.personId,
        date: ctx.input.date,
        hours: ctx.input.hours ?? 0,
        minutes: ctx.input.minutes ?? 0,
        description: ctx.input.description,
        isBillable: ctx.input.isBillable,
        tags: ctx.input.tags
      });
      let timeEntryId = result.timeLogId || result.id;
      return {
        output: { timeEntryId: timeEntryId ? String(timeEntryId) : undefined, created: true },
        message: `Created time entry of **${ctx.input.hours ?? 0}h ${ctx.input.minutes ?? 0}m**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.timeEntryId)
        throw new Error('timeEntryId is required to update a time entry');
      await client.updateTimeEntry(ctx.input.timeEntryId, {
        description: ctx.input.description,
        date: ctx.input.date,
        hours: ctx.input.hours,
        minutes: ctx.input.minutes,
        isBillable: ctx.input.isBillable,
        tags: ctx.input.tags
      });
      return {
        output: { timeEntryId: ctx.input.timeEntryId, updated: true },
        message: `Updated time entry **${ctx.input.timeEntryId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.timeEntryId)
        throw new Error('timeEntryId is required to delete a time entry');
      await client.deleteTimeEntry(ctx.input.timeEntryId);
      return {
        output: { timeEntryId: ctx.input.timeEntryId, deleted: true },
        message: `Deleted time entry **${ctx.input.timeEntryId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
