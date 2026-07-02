import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext, requireServiceAccount } from '../lib/helpers';
import { spec } from '../spec';

export let querySegmentation = SlateTool.create(spec, {
  name: 'Query Segmentation',
  key: 'query_segmentation',
  description: `Query event segmentation data from Mixpanel. Returns event counts segmented by a property over a date range, bucketed by time unit.
Useful for understanding how often an event occurs, broken down by property values.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventName: z.string().describe('Event name to query'),
      fromDate: z.string().describe('Start date in yyyy-mm-dd format (inclusive)'),
      toDate: z.string().describe('End date in yyyy-mm-dd format (inclusive)'),
      segmentProperty: z.string().optional().describe('Property expression to segment by'),
      unit: z
        .enum(['minute', 'hour', 'day', 'month'])
        .optional()
        .describe('Time bucket granularity (default: day)'),
      where: z.string().optional().describe('Filter expression for events'),
      limit: z
        .number()
        .optional()
        .describe('Max number of segmentation values to return (default: 60, max: 10000)'),
      type: z
        .enum(['general', 'unique', 'average'])
        .optional()
        .describe('Analysis type (default: general)')
    })
  )
  .output(
    z.object({
      legendSize: z.number().describe('Number of segment values in the response'),
      series: z.array(z.string()).describe('Array of date strings in the time series'),
      values: z
        .record(z.string(), z.record(z.string(), z.number()))
        .describe('Nested map of segment values to date-count pairs')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);

    let client = createClientFromContext(ctx);

    let result = await client.querySegmentation({
      event: ctx.input.eventName,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      on: ctx.input.segmentProperty,
      unit: ctx.input.unit,
      where: ctx.input.where,
      limit: ctx.input.limit,
      type: ctx.input.type
    });

    return {
      output: result,
      message: `Segmentation query for **${ctx.input.eventName}** returned **${result.legendSize}** segment value(s) over **${result.series.length}** time periods.`
    };
  })
  .build();
