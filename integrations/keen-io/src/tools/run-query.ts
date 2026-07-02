import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z
  .object({
    propertyName: z.string().describe('The event property to filter on'),
    operator: z
      .enum([
        'eq',
        'ne',
        'lt',
        'lte',
        'gt',
        'gte',
        'exists',
        'in',
        'contains',
        'not_contains',
        'within',
        'regex'
      ])
      .describe('The filter operator'),
    propertyValue: z.any().describe('The value to compare against')
  })
  .describe('A filter to narrow the scope of events');

let timeframeSchema = z
  .union([
    z
      .string()
      .describe(
        'A relative timeframe string, e.g. "this_7_days", "previous_30_days", "this_month"'
      ),
    z
      .object({
        start: z.string().describe('ISO 8601 start datetime'),
        end: z.string().describe('ISO 8601 end datetime')
      })
      .describe('An absolute timeframe with start and end dates')
  ])
  .describe('Time period over which to run the analysis');

export let runQuery = SlateTool.create(spec, {
  name: 'Run Query',
  key: 'run_query',
  description: `Run an analytical query on Keen.io event data. Supports aggregation types: **count**, **count_unique**, **sum**, **average**, **minimum**, **maximum**, **median**, **percentile**, **standard_deviation**, and **select_unique**. Results can be segmented by time intervals and grouped by property values.`,
  instructions: [
    'For percentile queries, include "percentile" in the parameters (e.g. 90 for the 90th percentile).',
    'Use "groupBy" to sub-divide results by one or more event properties.',
    'Use "interval" to get time-series data (e.g. "daily", "hourly", "weekly", "monthly", "minutely", "every_N_minutes").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      analysisType: z
        .enum([
          'count',
          'count_unique',
          'sum',
          'average',
          'minimum',
          'maximum',
          'median',
          'percentile',
          'standard_deviation',
          'select_unique'
        ])
        .describe('The type of analysis to perform'),
      collectionName: z.string().describe('The event collection to query'),
      targetProperty: z
        .string()
        .optional()
        .describe('The property to analyze. Required for all analysis types except "count".'),
      timeframe: timeframeSchema.optional(),
      interval: z
        .string()
        .optional()
        .describe(
          'Time interval for time-series results, e.g. "daily", "hourly", "weekly", "monthly"'
        ),
      filters: z.array(filterSchema).optional().describe('Array of filters to narrow events'),
      groupBy: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Property name(s) to group results by'),
      percentile: z
        .number()
        .optional()
        .describe('Percentile value (0-100). Required when analysisType is "percentile".'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone offset or name, e.g. "US/Eastern" or "-05:00"'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      orderBy: z
        .object({
          propertyName: z.string().optional().describe('Property name to order by'),
          direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
        })
        .optional()
        .describe('Order results by a property')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe(
          'The query result. For simple queries this is a number. For grouped or interval queries this is an array of objects.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      projectId: ctx.config.projectId,
      token: ctx.auth.token
    });

    let params: Record<string, any> = {
      event_collection: ctx.input.collectionName
    };

    if (ctx.input.targetProperty) params.target_property = ctx.input.targetProperty;
    if (ctx.input.timeframe) params.timeframe = ctx.input.timeframe;
    if (ctx.input.interval) params.interval = ctx.input.interval;
    if (ctx.input.timezone) params.timezone = ctx.input.timezone;
    if (ctx.input.percentile !== undefined) params.percentile = ctx.input.percentile;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

    if (ctx.input.filters) {
      params.filters = ctx.input.filters.map(f => ({
        property_name: f.propertyName,
        operator: f.operator,
        property_value: f.propertyValue
      }));
    }

    if (ctx.input.groupBy) {
      params.group_by = ctx.input.groupBy;
    }

    if (ctx.input.orderBy) {
      params.order_by = {};
      if (ctx.input.orderBy.propertyName)
        params.order_by.property_name = ctx.input.orderBy.propertyName;
      if (ctx.input.orderBy.direction) params.order_by.direction = ctx.input.orderBy.direction;
    }

    let response = await client.runQuery(ctx.input.analysisType, params);

    let resultSummary =
      typeof response.result === 'number'
        ? `Result: **${response.result}**`
        : `Returned ${Array.isArray(response.result) ? `${response.result.length} result(s)` : 'results'}`;

    return {
      output: {
        result: response.result
      },
      message: `Ran **${ctx.input.analysisType}** query on collection **${ctx.input.collectionName}**. ${resultSummary}.`
    };
  });
