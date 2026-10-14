import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCalendarEntry = SlateTool.create(spec, {
  name: 'Delete Calendar Entry',
  key: 'delete_calendar_entry',
  description:
    'Delete a Pipeline CRM task or event. Call list_calendar_entries to discover IDs. Recurring event occurrences may be marked inactive by the provider.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      calendarEntryId: z
        .number()
        .int()
        .positive()
        .describe('Task or event ID from list_calendar_entries or create_calendar_entry')
    })
  )
  .output(
    z.object({
      calendarEntryId: z.number().describe('Deleted task or event ID'),
      deleted: z.boolean().describe('Whether the provider accepted the deletion')
    })
  )
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).deleteCalendarEntry(ctx.input.calendarEntryId);
    return {
      output: { calendarEntryId: ctx.input.calendarEntryId, deleted: true },
      message: `Deleted calendar entry (ID: **${ctx.input.calendarEntryId}**)`
    };
  })
  .build();
