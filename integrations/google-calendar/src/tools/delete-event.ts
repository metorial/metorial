import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteEvent = SlateTool.create(spec, {
  name: 'Delete Event',
  key: 'delete_event',
  description: `Permanently delete an event from a Google Calendar. For recurring events, this deletes the entire series unless a specific instance ID is provided.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleCalendarActionScopes.deleteEvent)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID. Use "primary" for the user\'s primary calendar.'),
      eventId: z.string().describe('The event ID to delete'),
      sendUpdates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe('Whether to send cancellation notifications to attendees')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the event was successfully deleted'),
      eventId: z.string().describe('The deleted event ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);

    await client.deleteEvent(ctx.input.calendarId, ctx.input.eventId, {
      sendUpdates: ctx.input.sendUpdates || 'none'
    });

    return {
      output: {
        deleted: true,
        eventId: ctx.input.eventId
      },
      message: `Deleted event \`${ctx.input.eventId}\` from calendar \`${ctx.input.calendarId}\`.`
    };
  })
  .build();
