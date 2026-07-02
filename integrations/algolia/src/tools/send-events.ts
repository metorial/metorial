import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

let objectDataSchema = z.object({
  price: z
    .union([z.string(), z.number()])
    .optional()
    .describe('Price of the item (string or number)'),
  quantity: z.number().optional().describe('Quantity of the item'),
  discount: z
    .union([z.string(), z.number()])
    .optional()
    .describe('Discount applied to the item (string or number)')
});

let eventSchema = z.object({
  eventType: z.enum(['click', 'conversion', 'view']).describe('Type of the event'),
  eventName: z
    .string()
    .describe('Name of the event (e.g., "Product Clicked", "Article Viewed")'),
  indexName: z.string().describe('Name of the Algolia index the event relates to'),
  userToken: z.string().describe('Unique identifier for the user who triggered the event'),
  objectIds: z
    .array(z.string())
    .optional()
    .describe('List of object IDs involved in the event'),
  positions: z
    .array(z.number())
    .optional()
    .describe(
      'List of positions of clicked objects in search results (for click events only, must match objectIds length)'
    ),
  queryId: z
    .string()
    .optional()
    .describe(
      'Query ID from the search response (for after-search click/conversion events, requires clickAnalytics=true)'
    ),
  filters: z
    .array(z.string())
    .optional()
    .describe(
      'List of filters for filter-based events (e.g., ["brand:Apple", "category:Phone"])'
    ),
  eventSubtype: z
    .enum(['addToCart', 'purchase'])
    .optional()
    .describe('Subtype for conversion events (required for revenue analytics)'),
  objectData: z
    .array(objectDataSchema)
    .optional()
    .describe(
      'Additional data for each object (for addToCart/purchase conversion events, must match objectIds length)'
    ),
  currency: z
    .string()
    .optional()
    .describe('ISO 4217 currency code for purchase events (e.g., "USD", "EUR")'),
  timestamp: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp for the event (defaults to current time if omitted)')
});

export let sendEvents = SlateTool.create(spec, {
  name: 'Send Events',
  key: 'send_events',
  description: `Send Algolia Insights events to track user behavior such as clicks, conversions, and views. These events power Algolia's analytics, A/B testing, and AI features like personalization and dynamic re-ranking.
Supports click events (with positions), conversion events (with purchase/addToCart subtypes and revenue data), and view events. Events can be tied to search queries via queryId for after-search analytics.`,
  instructions: [
    'Each event must include eventType, eventName, indexName, and userToken.',
    'For **click** events tied to a search, provide queryId (from the search response with clickAnalytics=true), objectIds, and positions (1-based positions in the search results).',
    'For **conversion** events with revenue, set eventSubtype to "addToCart" or "purchase", provide objectIds and objectData with price/quantity, and set currency for purchase events.',
    'For **view** events, provide objectIds of the viewed items.',
    'Use filters instead of objectIds for filter-based events (e.g., tracking category page views).',
    'The timestamp field accepts ISO 8601 format; if omitted, the current time is used.',
    'You can send up to 1000 events in a single request.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      events: z
        .array(eventSchema)
        .min(1)
        .describe('Array of events to send (1 to 1000 events per request)')
    })
  )
  .output(
    z.object({
      status: z.number().describe('HTTP status code of the response (200 indicates success)'),
      message: z.string().describe('Human-readable result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let eventsPayload = ctx.input.events.map(event => {
      let mapped: Record<string, any> = {
        eventType: event.eventType,
        eventName: event.eventName,
        index: event.indexName,
        userToken: event.userToken
      };

      if (event.objectIds) mapped.objectIDs = event.objectIds;
      if (event.positions) mapped.positions = event.positions;
      if (event.queryId) mapped.queryID = event.queryId;
      if (event.filters) mapped.filters = event.filters;
      if (event.eventSubtype) mapped.eventSubtype = event.eventSubtype;
      if (event.objectData) mapped.objectData = event.objectData;
      if (event.currency) mapped.currency = event.currency;
      if (event.timestamp) mapped.timestamp = new Date(event.timestamp).getTime();

      return mapped;
    });

    let result = await client.sendEvents(eventsPayload);

    let eventTypeCounts: Record<string, number> = {};
    for (let event of ctx.input.events) {
      eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
    }

    let summary = Object.entries(eventTypeCounts)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    return {
      output: {
        status: result?.status ?? 200,
        message: result?.message ?? 'OK'
      },
      message: `Successfully sent **${ctx.input.events.length}** event${ctx.input.events.length > 1 ? 's' : ''} (${summary}).`
    };
  })
  .build();
