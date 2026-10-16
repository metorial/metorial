import { SlateTool } from 'slates';
import { z } from 'zod';
import { DemioClient } from '../lib/client';
import { spec } from '../spec';

export let getEventSession = SlateTool.create(spec, {
  name: 'Get Event Session',
  key: 'get_event_session',
  description:
    'Retrieve the time, timezone, and status of a specific Demio event session. Use list_events or get_event to discover event and session IDs. An on-demand session is reported as running with a timestamp for the current request time.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      eventId: z.string().describe('Event ID from list_events or get_event'),
      dateId: z.string().describe('Session ID from list_events or get_event')
    })
  )
  .output(
    z.object({
      dateId: z.number().describe('Session ID'),
      datetime: z.string().describe('Human-readable stored date and time'),
      status: z.string().optional().describe('Session status'),
      timestamp: z
        .number()
        .optional()
        .describe(
          'Start time as a Unix timestamp; current request time for an on-demand session'
        ),
      timezone: z.string().optional().describe('Session timezone')
    })
  )
  .handleInvocation(async ctx => {
    let session = await new DemioClient(ctx.auth).getEventSession(
      ctx.input.eventId,
      ctx.input.dateId
    );
    return {
      output: {
        dateId: session.date_id,
        datetime: session.datetime,
        status: session.status,
        timestamp: session.timestamp,
        timezone: session.zone
      },
      message: `Retrieved session ${session.date_id}.`
    };
  })
  .build();
