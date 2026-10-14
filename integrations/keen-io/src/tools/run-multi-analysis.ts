import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { filterSchema, timeframeSchema } from '../lib/query-schemas';
import { spec } from '../spec';

export let runMultiAnalysis = SlateTool.create(spec, {
  name: 'Run Multi-Analysis',
  key: 'run_multi_analysis',
  description:
    'Compute several named metrics over the same Keen.io event collection in one query. Share filters, timeframe, grouping, and intervals across counts, sums, averages, percentiles, and other aggregations.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      collectionName: z.string().describe('The event collection to analyze'),
      analyses: z
        .record(
          z.string(),
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
              .describe('The aggregation to perform for this named metric'),
            targetProperty: z
              .string()
              .optional()
              .describe('Property to analyze; required except for count'),
            percentile: z
              .number()
              .optional()
              .describe('Percentile from 0 to 100; required for percentile metrics')
          })
        )
        .describe('Map of metric names to their analysis definitions'),
      timeframe: timeframeSchema.optional(),
      filters: z.array(filterSchema).optional().describe('Filters applied to every metric'),
      interval: z
        .string()
        .optional()
        .describe('Time-series interval, such as daily or hourly'),
      groupBy: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Property names to group results by'),
      timezone: z.string().optional().describe('Timezone for relative timeframes'),
      includeMetadata: z
        .boolean()
        .optional()
        .describe('Include provider query-execution metadata')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Named metric values, or grouped and interval results'),
      metadata: z.any().optional().describe('Query-execution metadata when requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let analyses = Object.entries(ctx.input.analyses);
    if (analyses.length === 0) {
      throw createApiServiceError('Provide at least one named analysis.');
    }
    for (let [name, analysis] of analyses) {
      if (analysis.analysisType !== 'count' && !analysis.targetProperty) {
        throw createApiServiceError(`Metric "${name}" requires targetProperty.`);
      }
      if (analysis.analysisType === 'percentile' && analysis.percentile === undefined) {
        throw createApiServiceError(`Metric "${name}" requires percentile.`);
      }
      if (
        analysis.percentile !== undefined &&
        (analysis.percentile < 0 || analysis.percentile > 100)
      ) {
        throw createApiServiceError(`Metric "${name}" percentile must be between 0 and 100.`);
      }
    }
    let response = await client.runMultiAnalysis(
      pickDefined({
        event_collection: ctx.input.collectionName,
        analyses: Object.fromEntries(
          analyses.map(([name, analysis]) => [
            name,
            pickDefined({
              analysis_type: analysis.analysisType,
              target_property: analysis.targetProperty,
              percentile: analysis.percentile
            })
          ])
        ),
        timeframe: ctx.input.timeframe,
        interval: ctx.input.interval,
        group_by: ctx.input.groupBy,
        timezone: ctx.input.timezone,
        include_metadata: ctx.input.includeMetadata,
        filters: ctx.input.filters?.map(filter => ({
          property_name: filter.propertyName,
          operator: filter.operator,
          property_value: filter.propertyValue
        }))
      })
    );
    return {
      output: { result: response.result, metadata: response.execution_metadata },
      message: `Computed **${analyses.length}** metrics on collection **${ctx.input.collectionName}**.`
    };
  });
