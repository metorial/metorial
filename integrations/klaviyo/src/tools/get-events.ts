import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let getEvents = SlateTool.create(spec, {
  name: 'Get Events',
  key: 'get_events',
  description: `Retrieve events (actions tracked for profiles) from Klaviyo. Filter by metric, profile, timestamp, or other attributes.
Events include email opens, clicks, purchases, and any custom events.`,
  instructions: [
    'Common filters: `equals(metric_id,"METRIC_ID")`, `equals(profile_id,"PROFILE_ID")`, `greater-than(datetime,2024-01-01T00:00:00Z)`.',
    'Sort by timestamp descending with sort="-datetime".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().optional().describe('Specific event ID to retrieve'),
      filter: z.string().optional().describe('Filter string for events'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (e.g., "-datetime" for most recent first)'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.string().describe('Event ID'),
            metricId: z.string().optional().describe('Metric ID'),
            profileId: z.string().optional().describe('Profile ID'),
            timestamp: z.string().optional().describe('Event timestamp'),
            properties: z.record(z.string(), z.any()).optional().describe('Event properties'),
            eventName: z.string().optional().describe('Event/metric name'),
            value: z.number().optional().describe('Monetary value')
          })
        )
        .describe('List of events'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasMore: z.boolean().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.eventId) {
      let result = await client.getEvent(ctx.input.eventId);
      let e = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          events: [
            {
              eventId: e?.id ?? '',
              metricId: e?.relationships?.metric?.data?.id ?? undefined,
              profileId: e?.relationships?.profile?.data?.id ?? undefined,
              timestamp: e?.attributes?.datetime ?? undefined,
              properties: e?.attributes?.event_properties ?? undefined,
              eventName: e?.attributes?.event_name ?? undefined,
              value: e?.attributes?.value ?? undefined
            }
          ],
          hasMore: false
        },
        message: `Retrieved event **${ctx.input.eventId}**`
      };
    }

    let result = await client.getEvents({
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      pageCursor: ctx.input.pageCursor,
      pageSize: ctx.input.pageSize
    });

    let events = result.data.map(e => ({
      eventId: e.id ?? '',
      metricId: e.relationships?.metric?.data?.id ?? undefined,
      profileId: e.relationships?.profile?.data?.id ?? undefined,
      timestamp: e.attributes?.datetime ?? undefined,
      properties: e.attributes?.event_properties ?? undefined,
      eventName: e.attributes?.event_name ?? undefined,
      value: e.attributes?.value ?? undefined
    }));

    let nextCursor = extractPaginationCursor(result.links);

    return {
      output: { events, nextCursor, hasMore: !!nextCursor },
      message: `Retrieved **${events.length}** events`
    };
  })
  .build();
