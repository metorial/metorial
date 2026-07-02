import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Retrieve all expo events accessible with the authenticated ExpoFP account. Returns event names, IDs, keys, dates, and locations. Use this to discover available events before performing operations on exhibitors, booths, or sessions.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.number().describe('Unique event ID'),
            name: z.string().describe('Event name'),
            expoKey: z.string().describe('URL-friendly event key'),
            date: z.string().describe('Event date'),
            location: z.string().describe('Event location')
          })
        )
        .describe('List of events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let events = await client.listEvents();

    return {
      output: {
        events: events.map(e => ({
          eventId: e.id,
          name: e.name,
          expoKey: e.expoKey,
          date: e.date ?? '',
          location: e.location ?? ''
        }))
      },
      message: `Found **${events.length}** event(s).`
    };
  })
  .build();
