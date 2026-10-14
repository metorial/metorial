import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  eventIdSchema,
  mapTicket,
  overrideLocationSchema,
  sinceSchema,
  ticketSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `List a page of tickets for a Humanitix event, including holder information, pricing, check-in state, and associated orders. Call list_events to discover event IDs. Supports event date, status, and starting date-time filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: eventIdSchema,
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of tickets per page (max 100)'),
      eventDateId: z
        .string()
        .optional()
        .describe('Event date ID from the dates returned by get_event or list_events.'),
      status: z
        .enum(['complete', 'cancelled'])
        .optional()
        .describe('Filter tickets by completion or cancellation status.'),
      since: sinceSchema,
      overrideLocation: overrideLocationSchema
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketSchema).describe('List of tickets'),
      totalResults: z.number().optional().describe('Total number of tickets available'),
      page: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getTickets(ctx.input.eventId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      eventDateId: ctx.input.eventDateId,
      status: ctx.input.status,
      since: ctx.input.since,
      overrideLocation: ctx.input.overrideLocation
    });

    let tickets = (response.tickets || []).map(mapTicket);

    let totalResults = response.total ?? response.totalResults;

    return {
      output: {
        tickets,
        totalResults,
        page: response.page,
        pageSize: response.pageSize
      },
      message: `Found **${tickets.length}** tickets${totalResults !== undefined ? ` out of ${totalResults} total` : ''} for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
