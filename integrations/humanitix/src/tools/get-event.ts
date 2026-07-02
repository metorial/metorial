import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve detailed information about a specific Humanitix event by its ID. Returns the full event object including name, dates, location, ticket types, pricing, capacity, and publication status.`,
  instructions: [
    'The event ID is the unique string found in the console URL: console.humanitix.com/console/my-events/{eventId}'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The unique event ID from Humanitix')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique identifier for the event'),
      name: z.string().optional().describe('Name of the event'),
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
      pricing: z
        .any()
        .optional()
        .describe('Pricing information including minimum and maximum prices'),
      totalCapacity: z.number().optional().describe('Total capacity for the event'),
      published: z.boolean().optional().describe('Whether the event is published'),
      isPublic: z.boolean().optional().describe('Whether the event is public'),
      suspendSales: z.boolean().optional().describe('Whether sales are suspended'),
      markedAsSoldOut: z
        .boolean()
        .optional()
        .describe('Whether the event is marked as sold out'),
      ticketTypes: z
        .array(z.any())
        .optional()
        .describe('Available ticket types for the event'),
      tagIds: z.array(z.string()).optional().describe('Tag IDs associated with the event'),
      artists: z.array(z.any()).optional().describe('Artists associated with the event'),
      classification: z.any().optional().describe('Event classification/category'),
      packagedTickets: z.array(z.any()).optional().describe('Packaged ticket options'),
      createdAt: z.string().optional().describe('When the event was created'),
      updatedAt: z.string().optional().describe('When the event was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let event = await client.getEvent(ctx.input.eventId);

    return {
      output: {
        eventId: event._id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        timezone: event.timezone,
        eventLocation: event.eventLocation,
        currency: event.currency,
        pricing: event.pricing,
        totalCapacity: event.totalCapacity,
        published: event.published,
        isPublic: event.public,
        suspendSales: event.suspendSales,
        markedAsSoldOut: event.markedAsSoldOut,
        ticketTypes: event.ticketTypes,
        tagIds: event.tagIds,
        artists: event.artists,
        classification: event.classification,
        packagedTickets: event.packagedTickets,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      },
      message: `Retrieved event **${event.name || ctx.input.eventId}**.`
    };
  })
  .build();
