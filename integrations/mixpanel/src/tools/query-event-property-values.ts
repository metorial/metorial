import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createClientFromContext,
  requireDateRangeOrInterval,
  requireServiceAccount
} from '../lib/helpers';
import { spec } from '../spec';

export let queryEventPropertyValues = SlateTool.create(spec, {
  name: 'Query Event Property Values',
  key: 'query_event_property_values',
  description: `Get aggregate total, unique, or average counts for values of a specific property on a Mixpanel event.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventName: z.string().describe('Event name to query'),
      propertyName: z.string().describe('Event property name to aggregate by'),
      values: z
        .array(z.string())
        .optional()
        .describe('Specific property values to include. Omit to return top values.'),
      type: z
        .enum(['general', 'unique', 'average'])
        .describe('Analysis type: general, unique, or average'),
      unit: z
        .enum(['minute', 'hour', 'day', 'week', 'month'])
        .describe('Time bucket granularity'),
      interval: z
        .number()
        .optional()
        .describe(
          'Number of recent units to return. Provide either interval or fromDate/toDate.'
        ),
      fromDate: z
        .string()
        .optional()
        .describe('Start date in yyyy-mm-dd format. Provide with toDate.'),
      toDate: z
        .string()
        .optional()
        .describe('End date in yyyy-mm-dd format. Provide with fromDate.'),
      limit: z.number().optional().describe('Maximum number of property values to return')
    })
  )
  .output(
    z.object({
      legendSize: z.number().describe('Number of property-value series in the response'),
      series: z.array(z.string()).describe('Array of date strings in the time series'),
      values: z
        .record(z.string(), z.record(z.string(), z.number()))
        .describe('Nested map of property values to date-count pairs')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);
    requireDateRangeOrInterval(ctx.input);

    let client = createClientFromContext(ctx);
    let result = await client.queryEventPropertyValues({
      eventName: ctx.input.eventName,
      propertyName: ctx.input.propertyName,
      values: ctx.input.values,
      type: ctx.input.type,
      unit: ctx.input.unit,
      interval: ctx.input.interval,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      limit: ctx.input.limit
    });

    return {
      output: result,
      message: `Event property query returned **${result.legendSize}** value series over **${result.series.length}** time periods.`
    };
  })
  .build();
