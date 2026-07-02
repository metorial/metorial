import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

let eventDateTimeSchema = z.object({
  dateTime: z.string().optional().describe('RFC3339 timestamp for timed events'),
  date: z.string().optional().describe('YYYY-MM-DD for all-day events'),
  timeZone: z.string().optional().describe('IANA time zone')
});

let attendeeSchema = z.object({
  email: z.string().describe('Email address of the attendee'),
  displayName: z.string().optional().describe('Display name'),
  optional: z.boolean().optional().describe('Whether the attendee is optional'),
  responseStatus: z.string().optional().describe('Response status'),
  comment: z.string().optional().describe('Attendee comment')
});

let reminderOverrideSchema = z.object({
  method: z.enum(['email', 'popup']).describe('Reminder method'),
  minutes: z.number().describe('Minutes before the event')
});

export let updateEvent = SlateTool.create(spec, {
  name: 'Update Event',
  key: 'update_event',
  description: `Update an existing Google Calendar event. Only the provided fields will be modified; all other fields remain unchanged.
Can also be used to **move an event** to a different calendar by specifying destinationCalendarId.`,
  instructions: [
    'Only include the fields you want to change. Omitted fields remain unchanged.',
    'To move an event to another calendar, provide destinationCalendarId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleCalendarActionScopes.updateEvent)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID where the event currently resides'),
      eventId: z.string().describe('The event ID to update'),
      summary: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      location: z.string().optional().describe('New location'),
      start: eventDateTimeSchema.optional().describe('New start time'),
      end: eventDateTimeSchema.optional().describe('New end time'),
      attendees: z
        .array(attendeeSchema)
        .optional()
        .describe('Updated attendee list (replaces all existing attendees)'),
      recurrence: z.array(z.string()).optional().describe('Updated recurrence rules'),
      reminders: z
        .object({
          useDefault: z.boolean().describe('Whether to use default reminders'),
          overrides: z
            .array(reminderOverrideSchema)
            .optional()
            .describe('Custom reminder overrides')
        })
        .optional()
        .describe('Updated reminder settings'),
      colorId: z.string().optional().describe('New color ID'),
      visibility: z
        .enum(['default', 'public', 'private', 'confidential'])
        .optional()
        .describe('New visibility'),
      transparency: z.enum(['opaque', 'transparent']).optional().describe('New transparency'),
      status: z
        .enum(['confirmed', 'tentative', 'cancelled'])
        .optional()
        .describe('New event status'),
      guestsCanModify: z.boolean().optional().describe('Whether guests can modify the event'),
      guestsCanInviteOthers: z
        .boolean()
        .optional()
        .describe('Whether guests can invite others'),
      guestsCanSeeOtherGuests: z
        .boolean()
        .optional()
        .describe('Whether guests can see other guests'),
      destinationCalendarId: z
        .string()
        .optional()
        .describe('If provided, moves the event to this calendar'),
      sendUpdates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe('Whether to send notifications')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      summary: z.string().optional().describe('Updated title'),
      htmlLink: z.string().optional().describe('URL to view the event'),
      start: z.any().optional().describe('Updated start time'),
      end: z.any().optional().describe('Updated end time'),
      status: z.string().optional().describe('Updated status'),
      updated: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);
    let { calendarId, eventId, destinationCalendarId, sendUpdates, ...updates } = ctx.input;

    // Move event if destination calendar is specified
    if (destinationCalendarId) {
      let moved = await client.moveEvent(calendarId, eventId, destinationCalendarId, {
        sendUpdates: sendUpdates || 'none'
      });
      // If there are also field updates, apply them on the destination calendar
      let hasFieldUpdates = Object.values(updates).some(v => v !== undefined);
      if (hasFieldUpdates) {
        let event = await client.updateEvent(destinationCalendarId, eventId, updates, {
          sendUpdates: sendUpdates || 'none'
        });
        return {
          output: {
            eventId: event.id!,
            summary: event.summary,
            htmlLink: event.htmlLink,
            start: event.start,
            end: event.end,
            status: event.status,
            updated: event.updated
          },
          message: `Moved and updated event **"${event.summary}"** to calendar \`${destinationCalendarId}\`.`
        };
      }
      return {
        output: {
          eventId: moved.id!,
          summary: moved.summary,
          htmlLink: moved.htmlLink,
          start: moved.start,
          end: moved.end,
          status: moved.status,
          updated: moved.updated
        },
        message: `Moved event **"${moved.summary}"** to calendar \`${destinationCalendarId}\`.`
      };
    }

    let event = await client.updateEvent(calendarId, eventId, updates, {
      sendUpdates: sendUpdates || 'none'
    });

    return {
      output: {
        eventId: event.id!,
        summary: event.summary,
        htmlLink: event.htmlLink,
        start: event.start,
        end: event.end,
        status: event.status,
        updated: event.updated
      },
      message: `Updated event **"${event.summary}"**${event.htmlLink ? ` ([View](${event.htmlLink}))` : ''}.`
    };
  })
  .build();
