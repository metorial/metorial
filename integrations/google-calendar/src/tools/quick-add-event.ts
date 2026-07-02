import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let quickAddEvent = SlateTool.create(spec, {
  name: 'Quick Add Event',
  key: 'quick_add_event',
  description: `Create an event using natural language text, just like the "Quick Add" feature in the Google Calendar UI. Google parses the text to extract the event title, date, time, and location automatically.`,
  instructions: [
    'Examples: "Lunch with John at noon tomorrow", "Team meeting every Monday at 10am", "Flight to NYC on Jan 15 at 3pm".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleCalendarActionScopes.quickAddEvent)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID. Use "primary" for the user\'s primary calendar.'),
      text: z
        .string()
        .describe(
          'Natural language text describing the event (e.g. "Lunch with John tomorrow at noon")'
        ),
      sendUpdates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe('Whether to send notifications')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the created event'),
      summary: z.string().optional().describe('Parsed event title'),
      htmlLink: z.string().optional().describe('URL to view the event'),
      start: z.any().optional().describe('Parsed start time'),
      end: z.any().optional().describe('Parsed end time'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);

    let event = await client.quickAddEvent(ctx.input.calendarId, ctx.input.text, {
      sendUpdates: ctx.input.sendUpdates || 'none'
    });

    return {
      output: {
        eventId: event.id!,
        summary: event.summary,
        htmlLink: event.htmlLink,
        start: event.start,
        end: event.end,
        created: event.created
      },
      message: `Created event **"${event.summary}"** from quick add text${event.htmlLink ? ` ([View](${event.htmlLink}))` : ''}.`
    };
  })
  .build();
