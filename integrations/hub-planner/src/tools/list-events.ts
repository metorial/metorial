import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description:
    'List schedulable events or retrieve one by ID. Discover event IDs for updating events or creating bookings for non-project activities; pass an event ID as the booking projectId.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: z.string().optional().describe('Specific event ID. Omit to list events.'),
      page: z.number().int().min(0).optional().describe('Page number (0-based)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum events per page, up to 1000')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventId: z
            .string()
            .describe('Event ID; may be used as projectId when creating bookings'),
          name: z.string().optional(),
          eventCode: z.string().optional(),
          backgroundColor: z.string().optional(),
          metadata: z.string().optional(),
          createdDate: z.string().optional(),
          updatedDate: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let events = ctx.input.eventId
      ? [await client.getEvent(ctx.input.eventId)]
      : await client.getEvents(ctx.input.page, ctx.input.limit);
    return {
      output: {
        events: events.map((event: any) => ({
          eventId: event._id,
          name: event.name ?? undefined,
          eventCode: event.eventCode ?? undefined,
          backgroundColor: event.backgroundColor ?? undefined,
          metadata: event.metadata ?? undefined,
          createdDate: event.createdDate ?? undefined,
          updatedDate: event.updatedDate ?? undefined
        }))
      },
      message: `Retrieved **${events.length}** events.`
    };
  })
  .build();
