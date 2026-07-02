import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { FUNNEL_COMPUTE_MUTATION } from '../lib/graphql';
import { spec } from '../spec';

let filterDataStringSchema = z.object({
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
  operator: z.string()
});

let filterDataIntSchema = z.object({
  value: z.number().optional(),
  values: z.array(z.number()).optional(),
  operator: z.string()
});

let filterDataBoolSchema = z.object({
  value: z.boolean(),
  operator: z.string()
});

let filterDataEventSchema = z.object({
  type: z.string(),
  group: filterDataStringSchema.optional(),
  element: filterDataStringSchema.optional(),
  txt: filterDataStringSchema.optional(),
  element_path: filterDataStringSchema.optional(),
  location: filterDataStringSchema.optional(),
  value: filterDataStringSchema.optional(),
  height: filterDataIntSchema.optional(),
  width: filterDataIntSchema.optional(),
  timestamp: filterDataIntSchema.optional(),
  x: filterDataIntSchema.optional(),
  y: filterDataIntSchema.optional()
});

let filterDataParamSchema = z.object({
  name: z.string(),
  value: filterDataStringSchema.optional()
});

let filterDataCustomEventPropertySchema = z.object({
  name: z.string().optional(),
  string: filterDataStringSchema.optional(),
  int: filterDataIntSchema.optional(),
  bool: filterDataBoolSchema.optional()
});

let filterDataSchema = z.object({
  string: filterDataStringSchema.optional(),
  int: filterDataIntSchema.optional(),
  bool: filterDataBoolSchema.optional(),
  event: filterDataEventSchema.optional(),
  param: filterDataParamSchema.optional(),
  event_properties: z.array(filterDataCustomEventPropertySchema).optional()
});

let filterSchema = z.object({
  name: z.string(),
  unit: z.string().optional(),
  group: z.string().optional(),
  data: filterDataSchema,
  defined_event_id: z.string().optional(),
  stable_id: z.string().optional(),
  parent_filter_stable_id: z.string().optional()
});

let filtersSchema = z.object({
  must: z.array(z.array(filterSchema)).optional(),
  should: z.array(z.array(filterSchema)).optional(),
  must_not: z.array(z.array(filterSchema)).optional()
});

let funnelStepSchema = z.object({
  name: z.string().optional().describe('Step display name'),
  filters: filtersSchema.optional().describe('Step completion criteria')
});

let dateRangeSchema = z.object({
  from: z
    .string()
    .describe('Start date (relative: TODAY, TODAY_MINUS_7_DAYS, etc. or ISO 8601)'),
  to: z.string().describe('End date (relative or ISO 8601)')
});

let conversionValueInputSchema = z.object({
  property_name: z.string().describe('Property name for conversion tracking'),
  value_type: z.string().describe('Value type: revenue or count'),
  label: z.string().describe('Display label')
});

let stepResultSchema = z.object({
  sessions: z.number().describe('Number of sessions reaching this step'),
  visitors: z.number().describe('Number of unique visitors at this step'),
  events: z.number().describe('Number of events in this step')
});

export let computeFunnel = SlateTool.create(spec, {
  name: 'Compute Funnel',
  key: 'compute_funnel',
  description: `Run a funnel computation in LiveSession to analyze conversion data. Define steps with filters and a date range to compute session, visitor, and event counts at each step of the conversion funnel. Returns per-step analytics and totals.`,
  instructions: [
    'Relative dates supported: TODAY, YESTERDAY, TODAY_MINUS_7_DAYS, TODAY_MINUS_30_DAYS, BEGINNING_OF_WEEK, BEGINNING_OF_MONTH, BEGINNING_OF_PREV_MONTH.',
    'Each step must include filters that define what qualifies as completion of that step.',
    'Results may be cached; check the cachedResponse fields for freshness.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      websiteId: z.string().optional().describe('Website ID to compute funnel for'),
      type: z.string().optional().describe('Computation type: standard or custom'),
      dateRange: dateRangeSchema.describe('Date range for the computation'),
      steps: z.array(funnelStepSchema).describe('Funnel steps to analyze'),
      filters: filtersSchema.optional().describe('Additional global filters'),
      conversionValue: conversionValueInputSchema
        .optional()
        .describe('Conversion value tracking')
    })
  )
  .output(
    z.object({
      totalSessions: z.number().describe('Total sessions entering the funnel'),
      totalVisitors: z.number().describe('Total unique visitors'),
      totalEvents: z.number().describe('Total events tracked'),
      conversionValue: z
        .object({
          value: z.number().optional(),
          label: z.string().optional()
        })
        .optional()
        .describe('Computed conversion value'),
      steps: z.array(stepResultSchema).describe('Per-step analytics results'),
      cachedResponseId: z.string().optional().describe('Cache entry identifier'),
      cachedResponseComputedAt: z
        .number()
        .optional()
        .describe('Unix timestamp when data was computed'),
      cachedResponseFresh: z
        .boolean()
        .optional()
        .describe('Whether the cached data is still fresh')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.graphql(FUNNEL_COMPUTE_MUTATION, {
      website_id: ctx.input.websiteId,
      input: {
        type: ctx.input.type,
        date_range: ctx.input.dateRange,
        steps: ctx.input.steps,
        filters: ctx.input.filters || { must: [], should: [], must_not: [] },
        conversion_value: ctx.input.conversionValue
      }
    });

    let compute = result.data.funnelCompute;

    return {
      output: {
        totalSessions: compute.total_sessions,
        totalVisitors: compute.total_visitors,
        totalEvents: compute.total_events,
        conversionValue: compute.conversion_value
          ? {
              value: compute.conversion_value.value,
              label: compute.conversion_value.label
            }
          : undefined,
        steps: (compute.steps || []).map((s: any) => ({
          sessions: s.sessions,
          visitors: s.visitors,
          events: s.events
        })),
        cachedResponseId: compute.cached_response?.id,
        cachedResponseComputedAt: compute.cached_response?.computed_at,
        cachedResponseFresh: compute.cached_response?.fresh
      },
      message: `Funnel computed: **${compute.total_sessions}** sessions, **${compute.total_visitors}** visitors across **${(compute.steps || []).length}** steps.`
    };
  })
  .build();
