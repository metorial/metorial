import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCalendarEvent = SlateTool.create(spec, {
  name: 'Delete Calendar Event',
  key: 'delete_calendar_event',
  description: `Deletes a calendar event (booking, blocked period, or note) by its ID. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('UUID of the calendar event to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    await client.deleteCalendarEvent(ctx.input.eventId);

    return {
      output: { success: true },
      message: `Calendar event **${ctx.input.eventId}** deleted successfully.`
    };
  })
  .build();
