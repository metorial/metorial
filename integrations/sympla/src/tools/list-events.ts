import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.number().describe('Unique event identifier'),
  name: z.string().describe('Event name'),
  detail: z.string().describe('Event description'),
  startDate: z.string().describe('Event start date'),
  endDate: z.string().describe('Event end date'),
  privateEvent: z.boolean().describe('Whether the event is private'),
  published: z.boolean().describe('Whether the event is published'),
  cancelled: z.boolean().describe('Whether the event is cancelled'),
  imageUrl: z.string().describe('Event image URL'),
  eventUrl: z.string().describe('Event page URL'),
  address: z
    .object({
      name: z.string().describe('Venue name'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State'),
      country: z.string().describe('Country'),
      zipCode: z.string().describe('ZIP code')
    })
    .describe('Event location'),
  host: z
    .object({
      name: z.string().describe('Host name'),
      description: z.string().describe('Host description')
    })
    .describe('Event host information'),
  primaryCategory: z.string().describe('Primary category name'),
  secondaryCategory: z.string().describe('Secondary category name')
});

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `Retrieve a paginated list of events owned by the authenticated user. Supports filtering by date range and pagination. Use this to browse all your events or find events within a specific time window.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z
        .string()
        .optional()
        .describe('Filter events starting from this date (YYYY-MM-DD format)'),
      published: z
        .boolean()
        .optional()
        .describe('Filter by published status. Defaults to true.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (1-200)'),
      fieldSort: z.string().optional().describe('Field to sort results by'),
      sort: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('List of events'),
      hasNextPage: z.boolean().describe('Whether more pages are available'),
      totalQuantity: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listEvents({
      from: ctx.input.from,
      published: ctx.input.published,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      fieldSort: ctx.input.fieldSort,
      sort: ctx.input.sort
    });

    let events = result.data.map(e => ({
      eventId: e.id,
      name: e.name ?? '',
      detail: e.detail ?? '',
      startDate: e.start_date ?? '',
      endDate: e.end_date ?? '',
      privateEvent: e.private_event === 1,
      published: e.published === 1,
      cancelled: e.cancelled === 1,
      imageUrl: e.image ?? '',
      eventUrl: e.url ?? '',
      address: {
        name: e.address?.name ?? '',
        address: e.address?.address ?? '',
        city: e.address?.city ?? '',
        state: e.address?.state ?? '',
        country: e.address?.country ?? '',
        zipCode: e.address?.zip_code ?? ''
      },
      host: {
        name: e.host?.name ?? '',
        description: e.host?.description ?? ''
      },
      primaryCategory: e.category_prim?.name ?? '',
      secondaryCategory: e.category_sec?.name ?? ''
    }));

    return {
      output: {
        events,
        hasNextPage: result.pagination.hasNext,
        totalQuantity: result.pagination.quantity
      },
      message: `Found **${events.length}** events.${result.pagination.hasNext ? ' More pages available.' : ''}`
    };
  })
  .build();
