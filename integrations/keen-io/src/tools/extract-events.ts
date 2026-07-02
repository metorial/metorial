import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractEvents = SlateTool.create(spec, {
  name: 'Extract Events',
  key: 'extract_events',
  description: `Extract full-resolution event data from a Keen.io event collection. Returns raw event objects matching the specified criteria. Supports filtering, timeframes, property selection, and pagination via the "latest" or "limit" parameter.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('The event collection to extract from'),
      timeframe: z
        .union([
          z.string(),
          z.object({
            start: z.string().describe('ISO 8601 start datetime'),
            end: z.string().describe('ISO 8601 end datetime')
          })
        ])
        .optional()
        .describe('Timeframe to filter events'),
      filters: z
        .array(
          z.object({
            propertyName: z.string().describe('The event property to filter on'),
            operator: z
              .string()
              .describe('The filter operator (eq, ne, lt, gt, exists, in, contains, etc.)'),
            propertyValue: z.any().describe('The value to compare against')
          })
        )
        .optional()
        .describe('Filters to narrow extracted events'),
      propertyNames: z
        .array(z.string())
        .optional()
        .describe(
          'Specific properties to include in the output. If omitted, all properties are returned.'
        ),
      latest: z.number().optional().describe('Return only the N most recent events'),
      timezone: z.string().optional().describe('Timezone for timeframe calculations')
    })
  )
  .output(
    z.object({
      events: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of extracted event objects'),
      count: z.number().describe('Number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    let params: Record<string, any> = {};
    if (ctx.input.timeframe) params.timeframe = ctx.input.timeframe;
    if (ctx.input.timezone) params.timezone = ctx.input.timezone;
    if (ctx.input.latest !== undefined) params.latest = ctx.input.latest;
    if (ctx.input.propertyNames) params.property_names = ctx.input.propertyNames;

    if (ctx.input.filters) {
      params.filters = ctx.input.filters.map(f => ({
        property_name: f.propertyName,
        operator: f.operator,
        property_value: f.propertyValue
      }));
    }

    let response = await client.extractEvents(ctx.input.collectionName, params);
    let events = Array.isArray(response.result) ? response.result : [];

    return {
      output: {
        events,
        count: events.length
      },
      message: `Extracted **${events.length}** events from collection **${ctx.input.collectionName}**.`
    };
  });
