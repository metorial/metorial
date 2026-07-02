import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let queryFunnel = SlateTool.create(spec, {
  name: 'Query Funnel',
  key: 'query_funnel',
  description: `Query a saved funnel report in Mixpanel. Returns conversion data for each step of the funnel over a date range.
Use **List Funnels** first to discover available funnel IDs.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      funnelId: z.number().describe('ID of the saved funnel to query'),
      fromDate: z.string().describe('Start date in yyyy-mm-dd format (inclusive)'),
      toDate: z.string().describe('End date in yyyy-mm-dd format (inclusive)'),
      length: z
        .number()
        .optional()
        .describe('Number of time units a user has to complete the funnel'),
      lengthUnit: z
        .enum(['second', 'minute', 'hour', 'day'])
        .optional()
        .describe('Time unit for funnel completion window'),
      unit: z
        .enum(['day', 'week', 'month'])
        .optional()
        .describe('Bucket granularity for results'),
      segmentProperty: z.string().optional().describe('Property expression to segment by'),
      where: z.string().optional().describe('Filter expression for events'),
      limit: z
        .number()
        .optional()
        .describe('Top segmentation values to return (max 10000, default 255)')
    })
  )
  .output(
    z.object({
      meta: z
        .record(z.string(), z.unknown())
        .describe('Metadata about the funnel query including dates'),
      data: z.record(z.string(), z.unknown()).describe('Funnel conversion data keyed by date')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.queryFunnel({
      funnelId: ctx.input.funnelId,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      length: ctx.input.length,
      lengthUnit: ctx.input.lengthUnit,
      unit: ctx.input.unit,
      on: ctx.input.segmentProperty,
      where: ctx.input.where,
      limit: ctx.input.limit
    });

    return {
      output: result,
      message: `Funnel query for funnel ID **${ctx.input.funnelId}** completed. Data spans from ${ctx.input.fromDate} to ${ctx.input.toDate}.`
    };
  })
  .build();
