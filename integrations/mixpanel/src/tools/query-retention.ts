import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext, requireServiceAccount } from '../lib/helpers';
import { spec } from '../spec';

export let queryRetention = SlateTool.create(spec, {
  name: 'Query Retention',
  key: 'query_retention',
  description: `Query retention data from Mixpanel. Supports both **birth retention** (users who did a first event and returned) and **compounded retention** (overall return rate).
Returns retention counts per cohort date bucket.`,
  constraints: ['Rate limit: 60 queries per hour, max 5 concurrent queries.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().describe('Start date in yyyy-mm-dd format (inclusive)'),
      toDate: z.string().describe('End date in yyyy-mm-dd format (inclusive)'),
      retentionType: z
        .enum(['birth', 'compounded'])
        .optional()
        .describe('Retention analysis type (default: birth)'),
      bornEvent: z.string().optional().describe('First event for birth retention cohort'),
      eventName: z
        .string()
        .optional()
        .describe('Return event to measure; examines all events if omitted'),
      bornWhere: z.string().optional().describe('Filter expression for the born event'),
      where: z.string().optional().describe('Filter expression for the return event'),
      interval: z
        .number()
        .optional()
        .describe('Number of units per retention bucket (default: 1)'),
      intervalCount: z
        .number()
        .optional()
        .describe('Number of retention buckets to return (default: 1)'),
      unit: z
        .enum(['day', 'week', 'month'])
        .optional()
        .describe('Retention bucket granularity'),
      segmentProperty: z.string().optional().describe('Property expression for segmentation'),
      limit: z.number().optional().describe('Top segmentation values to return')
    })
  )
  .output(
    z.object({
      retentionData: z
        .record(
          z.string(),
          z.object({
            counts: z.array(z.number()).describe('Retention counts per bucket'),
            first: z.number().describe('Initial cohort size')
          })
        )
        .describe('Retention data keyed by cohort date')
    })
  )
  .handleInvocation(async ctx => {
    requireServiceAccount(ctx);

    let client = createClientFromContext(ctx);

    let result = await client.queryRetention({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      retentionType: ctx.input.retentionType,
      bornEvent: ctx.input.bornEvent,
      event: ctx.input.eventName,
      bornWhere: ctx.input.bornWhere,
      where: ctx.input.where,
      interval: ctx.input.interval,
      intervalCount: ctx.input.intervalCount,
      unit: ctx.input.unit,
      on: ctx.input.segmentProperty,
      limit: ctx.input.limit
    });

    let cohortCount = Object.keys(result).length;

    return {
      output: { retentionData: result },
      message: `Retention query returned data for **${cohortCount}** cohort date(s) from ${ctx.input.fromDate} to ${ctx.input.toDate}.`
    };
  })
  .build();
