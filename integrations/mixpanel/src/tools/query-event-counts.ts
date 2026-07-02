import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createClientFromContext,
  requireDateRangeOrInterval,
  requireNonEmptyStringArray,
  requireServiceAccount
} from '../lib/helpers';
import { spec } from '../spec';

export let queryEventCounts = SlateTool.create(spec, {
  name: 'Query Event Counts',
  key: 'query_event_counts',
  description: `Get aggregate total, unique, or average counts for one or more Mixpanel events over a date range or recent interval.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventNames: z.array(z.string()).describe('Event names to query'),
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
        .describe('End date in yyyy-mm-dd format. Provide with fromDate.')
    })
  )
  .output(
    z.object({
      legendSize: z.number().describe('Number of event series in the response'),
      series: z.array(z.string()).describe('Array of date strings in the time series'),
      values: z
        .record(z.string(), z.record(z.string(), z.number()))
        .describe('Nested map of event names to date-count pairs')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);
    requireNonEmptyStringArray(ctx.input.eventNames, 'eventNames');
    requireDateRangeOrInterval(ctx.input);

    let client = createClientFromContext(ctx);
    let result = await client.getEventCounts({
      eventNames: ctx.input.eventNames,
      type: ctx.input.type,
      unit: ctx.input.unit,
      interval: ctx.input.interval,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate
    });

    return {
      output: result,
      message: `Event count query returned **${result.legendSize}** event series over **${result.series.length}** time periods.`
    };
  })
  .build();
