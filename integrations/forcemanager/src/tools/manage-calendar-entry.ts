import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let calendarFields = z
  .object({
    subject: z.string().optional().describe('Event or task subject/title'),
    accountId: z.number().optional().describe('Associated account ID'),
    contactId: z.number().optional().describe('Associated contact ID'),
    opportunityId: z.number().optional().describe('Associated opportunity ID'),
    ownerId: z.number().optional().describe('Owner/assignee user ID'),
    activityTypeId: z.number().optional().describe('Activity type ID'),
    startDate: z.string().optional().describe('Start date/time (ISO 8601)'),
    endDate: z.string().optional().describe('End date/time (ISO 8601)'),
    allDay: z.boolean().optional().describe('Whether this is an all-day event'),
    isTask: z
      .boolean()
      .optional()
      .describe('Whether this is a task (true) or an event (false)'),
    completed: z.boolean().optional().describe('Whether the task is completed'),
    comment: z.string().optional().describe('Notes or description'),
    notificationMinutes: z
      .number()
      .optional()
      .describe('Notification time in minutes before the event'),
    extId: z.string().optional().describe('External system ID')
  })
  .describe('Calendar entry fields');

export let manageCalendarEntry = SlateTool.create(spec, {
  name: 'Manage Calendar Entry',
  key: 'manage_calendar_entry',
  description: `Create, update, or delete calendar events and tasks in ForceManager.
Calendar entries can be events or tasks, support all-day scheduling, notifications, and can be linked to accounts, contacts, and opportunities.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      entryId: z
        .number()
        .optional()
        .describe('Calendar entry ID (required for update and delete)'),
      fields: calendarFields
        .optional()
        .describe('Calendar entry fields (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      entryId: z.number().optional().describe('ID of the affected calendar entry'),
      message: z.string().optional().describe('Status message'),
      entry: z.any().optional().describe('Full calendar entry record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required for creating a calendar entry');
      }
      let result = await client.createCalendarEntry(ctx.input.fields);
      let entryId = result?.id;
      let entry = entryId ? await client.getCalendarEntry(entryId) : result;
      return {
        output: { entryId, message: 'Calendar entry created successfully', entry },
        message: `Created calendar entry **${ctx.input.fields.subject || entryId}** (ID: ${entryId})`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.entryId) {
        throw new Error('entryId is required for updating a calendar entry');
      }
      await client.updateCalendarEntry(ctx.input.entryId, ctx.input.fields || {});
      let entry = await client.getCalendarEntry(ctx.input.entryId);
      return {
        output: {
          entryId: ctx.input.entryId,
          message: 'Calendar entry updated successfully',
          entry
        },
        message: `Updated calendar entry ID **${ctx.input.entryId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.entryId) {
        throw new Error('entryId is required for deleting a calendar entry');
      }
      await client.deleteCalendarEntry(ctx.input.entryId);
      return {
        output: { entryId: ctx.input.entryId, message: 'Calendar entry deleted successfully' },
        message: `Deleted calendar entry ID **${ctx.input.entryId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
