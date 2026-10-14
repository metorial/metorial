import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { overrideLocationSchema, sinceSchema } from '../lib/schemas';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.string().describe('Unique identifier for the event'),
  name: z.string().optional().describe('Name of the event'),
  url: z.string().optional().describe('Public event URL'),
  dates: z
    .array(z.any())
    .optional()
    .describe('Event date entries including IDs for eventDateId filters'),
  slug: z.string().optional().describe('URL slug for the event'),
  description: z.string().optional().describe('Description of the event'),
  startDate: z.string().optional().describe('Start date of the event'),
  endDate: z.string().optional().describe('End date of the event'),
  timezone: z.string().optional().describe('Timezone of the event'),
  eventLocation: z
    .any()
    .optional()
    .describe('Location details including address, coordinates, and venue name'),
  currency: z.string().optional().describe('Currency used for pricing'),
  totalCapacity: z.number().optional().describe('Total capacity for the event'),
  published: z.boolean().optional().describe('Whether the event is published'),
  isPublic: z.boolean().optional().describe('Whether the event is public'),
  suspendSales: z.boolean().optional().describe('Whether sales are suspended'),
  markedAsSoldOut: z.boolean().optional().describe('Whether the event is marked as sold out'),
  ticketTypes: z.array(z.any()).optional().describe('Available ticket types for the event'),
  tagIds: z.array(z.string()).optional().describe('Tag IDs associated with the event'),
  createdAt: z.string().optional().describe('When the event was created'),
  updatedAt: z.string().optional().describe('When the event was last updated')
});

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List all events owned by or shared with your Humanitix account. Returns event details including name, dates, location, capacity, ticket types, and status. Supports pagination for accounts with many events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of events per page (max 100)'),
      inFutureOnly: z
        .boolean()
        .optional()
        .describe('Return only events whose end date is in the future.'),
      since: sinceSchema,
      overrideLocation: overrideLocationSchema
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('List of events'),
      totalResults: z.number().optional().describe('Total number of events available'),
      page: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getEvents({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      inFutureOnly: ctx.input.inFutureOnly,
      since: ctx.input.since,
      overrideLocation: ctx.input.overrideLocation
    });

    let events = (response.events || []).map((event: any) => ({
      eventId: event._id,
      name: event.name,
      url: event.url,
      dates: event.dates,
      slug: event.slug,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      eventLocation: event.eventLocation,
      currency: event.currency,
      totalCapacity: event.totalCapacity,
      published: event.published,
      isPublic: event.public,
      suspendSales: event.suspendSales,
      markedAsSoldOut: event.markedAsSoldOut,
      ticketTypes: event.ticketTypes,
      tagIds: event.tagIds,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }));

    let totalResults = response.total ?? response.totalResults;

    return {
      output: {
        events,
        totalResults,
        page: response.page,
        pageSize: response.pageSize
      },
      message: `Found **${events.length}** events${totalResults !== undefined ? ` out of ${totalResults} total` : ''}.`
    };
  })
  .build();
